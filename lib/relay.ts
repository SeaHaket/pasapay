import { CELO_CHAIN_ID, BSC_CHAIN_ID, CELO_RPC } from "./constants";
import type { BridgeQuote } from "./lifi";

// BSC native USDT (BEP-20)
const BSC_USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const RELAY_API = "https://api.relay.link";

// ─── Internal Relay API types ─────────────────────────────────────────────────

type RelayCurrency = {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
};

type RelayFeeEntry = {
  currency: RelayCurrency;
  amount: string;
  amountFormatted: string;
  amountUsd: string;
};

type RelayStepItem = {
  status: string;
  data: {
    from?: string;
    to: string;
    data?: string;
    value?: string;
    chainId: number;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    gas?: string;
  };
  check?: { endpoint: string; method: string };
};

export type RelayStep = {
  id: string;
  action: string;
  description: string;
  kind: "transaction" | "signature";
  requestId?: string;
  items: RelayStepItem[];
};

type RelayQuoteResponse = {
  steps: RelayStep[];
  fees: {
    gas?: RelayFeeEntry;
    relayer?: RelayFeeEntry;
    relayerGas?: RelayFeeEntry;
    relayerService?: RelayFeeEntry;
  };
  details: {
    currencyIn: { currency: RelayCurrency; amount: string; amountUsd: string };
    currencyOut: {
      currency: RelayCurrency;
      amount: string;
      amountUsd: string;
      minimumAmount: string;
    };
    timeEstimate?: number;
  };
};

export type RelayQuoteParams = {
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  fromToken: `0x${string}`;
  fromDecimals: number;
  amountRaw: bigint;
  exchangeRate: number;
};

// ─── Quote ────────────────────────────────────────────────────────────────────

export async function getRelayQuote(
  params: RelayQuoteParams,
): Promise<BridgeQuote | null> {
  try {
    const { fromAddress, toAddress, fromToken, fromDecimals, amountRaw, exchangeRate } =
      params;

    const body = {
      user: fromAddress,
      recipient: toAddress,
      originChainId: CELO_CHAIN_ID,
      destinationChainId: BSC_CHAIN_ID,
      originCurrency: fromToken,
      destinationCurrency: BSC_USDT_ADDRESS,
      amount: amountRaw.toString(),
      tradeType: "EXACT_INPUT",
    };

    const res = await fetch(`${RELAY_API}/quote/v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      console.error("[Relay] quote failed:", res.status, text);
      return null;
    }

    const data: RelayQuoteResponse = await res.json();

    // Validate we have at least one executable step
    if (!data.steps?.length) return null;

    // Guard: reject any step that requires non-zero native value on Celo.
    // Relay's intent model generally fronts gas, but be defensive.
    const hasNativeValue = data.steps.some((step) =>
      step.items.some((item) => {
        const v = item.data?.value;
        if (!v) return false;
        const s = String(v);
        if (s === "0" || s === "0x" || s === "0x0") return false;
        try {
          return BigInt(s) > 0n;
        } catch {
          return false;
        }
      }),
    );
    if (hasNativeValue) {
      console.warn("[Relay] route requires native value — skipping");
      return null;
    }

    // ── Parse amounts ────────────────────────────────────────────────────────
    const fromAmt =
      Number(data.details.currencyIn.amount) / 10 ** fromDecimals;

    const outDecimals = data.details.currencyOut.currency.decimals ?? 18;
    const toAmt =
      Number(data.details.currencyOut.minimumAmount ?? data.details.currencyOut.amount) /
      10 ** outDecimals;

    // ── Parse fees ───────────────────────────────────────────────────────────
    const gasFeeUsd = Number(data.fees.gas?.amountUsd ?? "0");
    const relayerFeeUsd = Number(data.fees.relayer?.amountUsd ?? "0");
    const totalFeeUsd = gasFeeUsd + relayerFeeUsd;

    // ── Duration ─────────────────────────────────────────────────────────────
    const durationSec = data.details.timeEstimate ?? 60;
    const estimatedDuration =
      durationSec < 120
        ? `~${Math.ceil(durationSec / 60)} min`
        : `~${Math.ceil(durationSec / 60)} mins`;

    return {
      // Relay-specific payload stored as `route` placeholder; the actual steps
      // are embedded here for executeRelayBridge to consume.
      provider: "relay",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      route: { _relaySteps: data.steps } as any,
      fromAmountUsd: fromAmt.toFixed(2),
      toAmountUsdt: toAmt.toFixed(4),
      toAmountLocal: (toAmt * exchangeRate).toFixed(2),
      toTokenSymbol: data.details.currencyOut.currency.symbol ?? "USDT",
      bridgeFeeUsd: relayerFeeUsd.toFixed(4),
      networkFeeUsd: gasFeeUsd.toFixed(4),
      totalFeeUsd: totalFeeUsd.toFixed(4),
      estimatedDuration,
      bridge: "Relay",
    };
  } catch (err) {
    console.error("[Relay] getRelayQuote failed:", err);
    return null;
  }
}

// ─── Execute ──────────────────────────────────────────────────────────────────

export async function executeRelayBridge(
  quote: BridgeQuote,
  address: `0x${string}`,
  feeCurrency: `0x${string}`,
  onStatus?: (status: string) => void,
): Promise<{ txHash: string; success: boolean; error?: string }> {
  try {
    // Recover the relay steps stored inside the opaque `route` field.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: RelayStep[] = (quote.route as any)._relaySteps;
    if (!steps?.length) throw new Error("No Relay steps found in quote");

    const { createWalletClient, createPublicClient, custom, http, encodeFunctionData, erc20Abi } =
      await import("viem");
    const { celo } = await import("viem/chains");

    const walletClient = createWalletClient({
      chain: celo,
      transport: custom((window as any).ethereum),
    });
    const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });

    let lastTxHash = "";

    for (const step of steps) {
      if (step.kind !== "transaction") {
        // Signature steps (e.g., permit) — skip; standard deposit flow
        // doesn't require them unless usePermit=true was requested.
        console.warn("[Relay] Skipping non-transaction step:", step.id);
        continue;
      }

      for (const item of step.items) {
        const tx = item.data;
        if (!tx.to) continue;

        // Only submit transactions targeting the Celo chain (origin side)
        if (tx.chainId !== CELO_CHAIN_ID) continue;

        // Handle ERC-20 approval step
        if (step.id === "approve") {
          if (onStatus) onStatus("Approving token...");
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [tx.to as `0x${string}`, BigInt(2) ** BigInt(256) - BigInt(1)],
          });
          const approvalHash = await walletClient.sendTransaction({
            account: address,
            to: tx.to as `0x${string}`,
            data: approveData,
            feeCurrency,
          });
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          continue;
        }

        // Main deposit step
        if (onStatus) onStatus("Bridging via Relay...");

        const txHash = await walletClient.sendTransaction({
          account: address,
          to: tx.to as `0x${string}`,
          data: (tx.data ?? "0x") as `0x${string}`,
          value: 0n, // Relay abstracts destination gas; origin value must be 0
          feeCurrency,
        });

        lastTxHash = txHash;
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
    }

    if (!lastTxHash) throw new Error("No Celo transaction was submitted");
    return { txHash: lastTxHash, success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Relay] executeRelayBridge failed:", message);
    return { txHash: "", success: false, error: message };
  }
}
