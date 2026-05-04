"use client";

import { useState, useCallback, useRef } from "react";
import { getBridgeQuote, executeBridge, type BridgeQuote } from "@/lib/lifi";
import type { Route } from "@lifi/sdk";
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
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bridgeStepLabel, setBridgeStepLabel] = useState<string>("");
  const routeRef = useRef<Route | null>(null);

  const fetchQuote = useCallback(async (params: {
    fromAddress: `0x${string}`;
    toAddress: `0x${string}`;
    token: StablecoinBalance;
    amountRaw: bigint;
    phpRate: number;
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
        phpRate: params.phpRate,
      });
      if (!result) throw new Error("No route found");
      setQuote(result);
      routeRef.current = result.route;
      setStatus("quoted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
      setStatus("error");
    }
  }, []);

  const execute = useCallback(async () => {
    if (!routeRef.current) return;
    setStatus("bridging");
    setError(null);
    try {
      const result = await executeBridge(routeRef.current, (s) => {
        setBridgeStepLabel(s);
        if (s.toLowerCase().includes("appro")) setStatus("approving");
        else setStatus("bridging");
      });
      if (!result.success) throw new Error("Bridge execution failed");
      setTxHash(result.txHash);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bridge failed");
      setStatus("error");
    }
  }, []);

  const reset = useCallback(() => {
    setQuote(null);
    setStatus("idle");
    setTxHash(null);
    setError(null);
    setBridgeStepLabel("");
    routeRef.current = null;
  }, []);

  return { quote, status, txHash, error, bridgeStepLabel, fetchQuote, execute, reset };
}
