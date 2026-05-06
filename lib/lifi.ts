import { CELO_CHAIN_ID, ARBITRUM_CHAIN_ID } from "./constants";
import type { Route } from "@lifi/sdk";

export const ARB_USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

// Lazy-load: @lifi/sdk is ~71KB and 800ms to parse — only pulled in when a
// bridge quote is actually requested (localcrypto route, review step).
let _sdk: typeof import("@lifi/sdk") | null = null;
async function getSdk() {
  if (!_sdk) {
    _sdk = await import("@lifi/sdk");
    _sdk.createConfig({ integrator: "PasaPay" });
  }
  return _sdk;
}

export type BridgeQuote = {
  route: Route;
  fromAmountUsd: string;
  toAmountUsdt: string;
  toAmountLocal: string;
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
      toChainId: ARBITRUM_CHAIN_ID,
      fromTokenAddress: fromToken,
      toTokenAddress: ARB_USDT_ADDRESS,
      fromAmount: amountRaw.toString(),
      fromAddress,
      toAddress,
    });
    const route = result.routes?.[0];
    if (!route) return null;
    const fromAmt = Number(route.fromAmount) / 10 ** fromDecimals;
    const toAmt = Number(route.toAmount) / 10 ** 6;
    const gasCostUsd = route.gasCostUSD ?? "0";
    const feeCostUsd = route.steps.reduce(
      (acc, step) => acc + (step.estimate.feeCosts?.reduce((a, f) => a + Number(f.amountUSD ?? 0), 0) ?? 0),
      0,
    );
    const totalFee = Number(gasCostUsd) + feeCostUsd;
    const durationSec = route.steps.reduce((acc, s) => acc + (s.estimate.executionDuration ?? 0), 0);
    const bridge = route.steps[0]?.toolDetails?.name ?? "Bridge";
    return {
      route,
      fromAmountUsd: fromAmt.toFixed(2),
      toAmountUsdt: toAmt.toFixed(4),
      toAmountLocal: (toAmt * exchangeRate).toFixed(2),
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
  route: Route,
  address: `0x${string}`,
  feeCurrency: `0x${string}`,
  onStatus?: (status: string) => void,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
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
          args: [spender, maxUint256],
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
    if (onStatus) onStatus("Bridging to Arbitrum...");
    const txReq = freshStep.transactionRequest;
    const bridgeHash = await walletClient.sendTransaction({
      account: address,
      to: txReq.to as `0x${string}`,
      data: txReq.data as `0x${string}`,
      value: txReq.value ? BigInt(txReq.value as string) : 0n,
      feeCurrency,
    });

    return { txHash: bridgeHash, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[LI.fi] executeBridge failed:", message);
    return { txHash: "", success: false, error: message };
  }
}
