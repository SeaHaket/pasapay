import { CELO_CHAIN_ID, BSC_CHAIN_ID } from "./constants";
import type { Route } from "@lifi/sdk";

export const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

// Lazy-load: @lifi/sdk is ~71KB and 800ms to parse — only pulled in when a
// bridge quote is actually requested (localcrypto route, review step).
let _sdk: typeof import("@lifi/sdk") | null = null;
async function getSdk() {
  if (!_sdk) {
    _sdk = await import("@lifi/sdk");
    // Route all LI.fi requests through our server-side proxy so the API key
    // is never exposed to the client (server env var LIFI_API_KEY, no NEXT_PUBLIC_).
    const apiUrl = typeof window !== "undefined"
      ? `${window.location.origin}/api/lifi`
      : undefined;
    // fee: 0.0025 = 0.25% integrator fee — requires LI.fi partner approval to activate
    _sdk.createConfig({
      integrator: "PasaPay",
      ...(apiUrl ? { apiUrl } : {}),
      routeOptions: { fee: 0.0025 },
    });
  }
  return _sdk;
}

export type BridgeQuote = {
  provider: "lifi" | "relay";
  route: Route; // LI.Fi route — present only when provider === "lifi"
  fromAmountUsd: string;
  toAmountUsdt: string;
  toAmountLocal: string;
  toTokenSymbol: string;
  bridgeFeeUsd: string;
  networkFeeUsd: string;
  totalFeeUsd: string;
  estimatedDuration: string;
  bridge: string;
};

export type QuoteParams = {
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  fromToken: `0x${string}`;
  fromDecimals: number;
  amountRaw: bigint;
  exchangeRate: number;
};

export async function getBridgeQuote(params: QuoteParams): Promise<BridgeQuote | null> {
  try {
    const { getRoutes } = await getSdk();
    const { fromAddress, toAddress, fromToken, fromDecimals, amountRaw, exchangeRate } = params;
    const result = await getRoutes({
      fromChainId: CELO_CHAIN_ID,
      toChainId: BSC_CHAIN_ID,
      fromTokenAddress: fromToken,
      toTokenAddress: BSC_USDT_ADDRESS,
      fromAmount: amountRaw.toString(),
      fromAddress,
      toAddress,
      options: {
        // MiniPay users have no native CELO — avoid routes that need msg.value
        allowSwitchChain: false,
        order: "SAFEST",
      },
    });
    // Filter to routes whose steps don't require native token value.
    // LI.fi routes that include a non-zero transactionRequest.value will
    // revert on MiniPay because users hold no native CELO (fee abstraction).
    // Parse the value robustly — it may be a decimal string, a hex string,
    // or undefined. Treat any non-zero value as unsafe.
    const parseValue = (v: unknown): bigint => {
      if (!v) return 0n;
      const s = String(v);
      if (s === "0" || s === "0x" || s === "0x0") return 0n;
      try {
        return s.startsWith("0x") ? BigInt(s) : BigInt(s);
      } catch {
        return 0n;
      }
    };
    const safeRoutes = (result.routes ?? []).filter((r) =>
      r.steps.every((s) => parseValue(s.transactionRequest?.value) === 0n),
    );
    const route = safeRoutes[0];
    if (!route) return null; // no MiniPay-compatible route (all require native CELO)
    const fromAmt = Number(route.fromAmount) / 10 ** fromDecimals;
    const toAmt = Number(route.toAmount) / 10 ** 18;
    const gasCostUsd = route.gasCostUSD ?? "0";
    const feeCostUsd = route.steps.reduce(
      (acc, step) => acc + (step.estimate.feeCosts?.reduce((a, f) => a + Number(f.amountUSD ?? 0), 0) ?? 0),
      0,
    );
    const totalFee = Number(gasCostUsd) + feeCostUsd;
    const durationSec = route.steps.reduce((acc, s) => acc + (s.estimate.executionDuration ?? 0), 0);
    const bridge = route.steps[0]?.toolDetails?.name ?? "Bridge";
    return {
      provider: "lifi",
      route,
      fromAmountUsd: fromAmt.toFixed(2),
      toAmountUsdt: toAmt.toFixed(4),
      toAmountLocal: (toAmt * exchangeRate).toFixed(2),
      toTokenSymbol: route.steps[route.steps.length - 1]?.action.toToken.symbol ?? "USDT",
      bridgeFeeUsd: feeCostUsd.toFixed(4),
      networkFeeUsd: Number(gasCostUsd).toFixed(4),
      totalFeeUsd: totalFee.toFixed(4),
      estimatedDuration: durationSec < 120
        ? `~${Math.ceil(durationSec / 60)} min`
        : `~${Math.ceil(durationSec / 60)} mins`,
      bridge,
    };
  } catch (err) {
    console.error("[LI.fi] getRoutes failed:", err);
    return null;
  }
}

// Bypass executeRoute — it submits standard EVM txs and doesn't support Celo's
// CIP-64 feeCurrency. Instead: fetch a fresh step transaction, handle approval
// manually, then submit both txs through MiniPay's feeCurrency-aware path.
export async function executeBridge(
  quote: BridgeQuote,
  address: `0x${string}`,
  feeCurrency: `0x${string}`,
  onStatus?: (status: string) => void,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    const route = quote.route;
    const sdk = await getSdk();
    const { createWalletClient, createPublicClient, custom, http, encodeFunctionData, erc20Abi, maxUint256 } = await import("viem");
    const { celo } = await import("viem/chains");
    const { CELO_RPC } = await import("./constants");

    const step = route.steps[0];
    if (!step) throw new Error("No bridge step found in route");

    // Fetch a fresh transaction request — the stored one may have expired
    if (onStatus) onStatus("Preparing...");
    const freshStep = await sdk.getStepTransaction(step);
    if (!freshStep.transactionRequest?.to || !freshStep.transactionRequest?.data) {
      throw new Error("LI.fi returned no transaction request for this step");
    }

    const walletClient = createWalletClient({ chain: celo, transport: custom((window as any).ethereum) });
    const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });

    // Handle ERC-20 approval if the bridge contract needs an allowance
    const spender = freshStep.estimate?.approvalAddress as `0x${string}` | undefined;
    if (spender) {
      const allowance = await sdk.getTokenAllowance(freshStep.action.fromToken, address, spender);
      const needed = BigInt(freshStep.action.fromAmount);
      if (allowance !== undefined && allowance < needed) {
        if (onStatus) onStatus("Approving token...");
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, needed],
        });
        const approvalHash = await walletClient.sendTransaction({
          account: address,
          to: freshStep.action.fromToken.address as `0x${string}`,
          data: approveData,
          feeCurrency,
        });
        await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      }
    }

    // Submit the bridge transaction
    if (onStatus) onStatus("Bridging to BNB Smart Chain...");
    const txReq = freshStep.transactionRequest;

    // Guard: MiniPay users use stablecoin fee abstraction and carry no native
    // CELO. If the bridge tx requires a non-zero msg.value, it will revert
    // with "execution reverted" during eth_estimateGas. Reject early with a
    // clear message instead of letting the RPC call fail opaquely.
    // The fresh step value may be a hex string (e.g. "0xBE9A...") or a decimal
    // string — parse both forms defensively.
    const parseRequiredValue = (v: unknown): bigint => {
      if (!v) return 0n;
      const s = String(v);
      if (s === "0" || s === "0x" || s === "0x0") return 0n;
      try {
        return BigInt(s); // works for both "0xABC" and "12345" in modern JS
      } catch {
        return 0n;
      }
    };
    const requiredValue = parseRequiredValue(txReq.value);
    if (requiredValue > 0n) {
      throw new Error(
        "This bridge route requires native CELO which is not available in MiniPay. " +
        "Please try a smaller amount or try again later for a different route."
      );
    }

    const bridgeHash = await walletClient.sendTransaction({
      account: address,
      to: txReq.to as `0x${string}`,
      data: txReq.data as `0x${string}`,
      value: 0n,
      feeCurrency,
    });

    return { txHash: bridgeHash, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LI.fi] executeBridge failed:", message);
    return { txHash: "", success: false, error: message };
  }
}
