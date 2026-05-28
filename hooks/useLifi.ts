"use client";

import { useState, useCallback } from "react";
import { getBridgeQuote, type BridgeQuote } from "@/lib/lifi";
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

export function useLifi() {
  const [quote, setQuote] = useState<BridgeQuote | null>(null);
  const [status, setStatus] = useState<BridgeStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchQuote = useCallback(async (params: {
    fromAddress: `0x${string}`;
    toAddress: string;
    token: StablecoinBalance;
    amountRaw: bigint;
    exchangeRate: number;
    toChain?: "arbitrum" | "solana";
  }) => {
    setStatus("quoting");
    setError(null);
    setQuote(null);
    try {
      const result = await getBridgeQuote({
        fromAddress: params.fromAddress,
        toAddress: params.toAddress,
        fromToken: params.token.address,
        fromDecimals: params.token.decimals,
        amountRaw: params.amountRaw,
        exchangeRate: params.exchangeRate,
        toChain: params.toChain,
      });
      if (!result) throw new Error("No route found");
      setQuote(result);
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
