import { createConfig, getRoutes, executeRoute, type Route } from "@lifi/sdk";
import { CELO_CHAIN_ID, ARBITRUM_CHAIN_ID } from "./constants";

export const ARB_USDT_ADDRESS = "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9";

createConfig({ integrator: "PasaPay" });

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
    const feeCostUsd = route.steps.reduce((acc, step) =>
      acc + (step.estimate.feeCosts?.reduce((a, f) => a + Number(f.amountUSD ?? 0), 0) ?? 0), 0);
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
      estimatedDuration: durationSec < 120 ? `~${Math.ceil(durationSec / 60)} min` : `~${Math.ceil(durationSec / 60)} mins`,
      bridge,
    };
  } catch (err) {
    console.error("[LI.fi] getRoutes failed:", err);
    return null;
  }
}

export async function executeBridge(route: Route, onStatus?: (status: string) => void): Promise<{ txHash: string | null; success: boolean }> {
  try {
    const result = await executeRoute(route, {
      updateRouteHook: (updatedRoute) => {
        const status = updatedRoute.steps[0]?.execution?.status;
        if (status && onStatus) onStatus(status);
      },
    });
    const txHash = result.steps[0]?.execution?.process?.[0]?.txHash ?? null;
    return { txHash, success: true };
  } catch (err) {
    console.error("[LI.fi] executeBridge failed:", err);
    return { txHash: null, success: false };
  }
}
