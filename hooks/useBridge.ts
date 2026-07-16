"use client";

import { useState, useCallback } from "react";
import { getBridgeQuote, type BridgeQuote } from "@/lib/lifi";
import { getRelayQuote } from "@/lib/relay";
import type { StablecoinBalance } from "@/lib/stablecoins";

export type BridgeStatus =
  | "idle"
  | "quoting"
  | "quoted"
  | "approving"
  | "bridging"
  | "pending"
  | "success"
  | "error";

export type BridgeQuoteParams = {
  fromAddress: `0x${string}`;
  toAddress: `0x${string}`;
  token: StablecoinBalance;
  amountRaw: bigint;
  exchangeRate: number;
};

// Quote both LI.Fi and Relay in parallel and prefer LI.Fi when available.
// Falls back to Relay automatically if LI.Fi has no MiniPay-safe route.
export function useBridge() {
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (params: BridgeQuoteParams) => {
    setStatus("quoting");
    setError(null);
    setQuote(null);

    try {
      const sharedParams = {
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        fromToken: params.token.address,
        fromDecimals: params.token.decimals,
        amountRaw: params.amountRaw,
        exchangeRate: params.exchangeRate,
      };

      // Race both providers in parallel — whichever returns a valid quote wins,
      // but LI.Fi is preferred: we wait for both and prefer it when available.
      const [lifiResult, relayResult] = await Promise.allSettled([
        getBridgeQuote(sharedParams),
        getRelayQuote(sharedParams),
      ]);

      const lifiQuote =
        lifiResult.status === "fulfilled" ? lifiResult.value : null;
      const relayQuote =
        relayResult.status === "fulfilled" ? relayResult.value : null;

      const best = lifiQuote ?? relayQuote;

      if (!best) {
        throw new Error(
          "No bridge route available right now. Please try a smaller amount or try again later.",
        );
      }

      setQuote(best);
      setStatus("quoted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setQuote(null);
    setStatus("idle");
    setError(null);
  }, []);

  return { quote, status, error, fetchQuote, reset };
}

// Keep the old export name so any existing imports still work.
export { useBridge as useLifi };
