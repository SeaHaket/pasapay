"use client";

import { useEffect, useState, useCallback } from "react";
import { createWalletClient, createPublicClient, custom, http } from "viem";
import { celo } from "viem/chains";
import { getAllBalances, getPreferredStablecoin, type StablecoinBalance } from "@/lib/stablecoins";
import { MINIPAY_DEPOSIT_DEEPLINK } from "@/lib/constants";

export type MiniPayState = {
  address: `0x${string}` | null;
  isMiniPay: boolean;
  isLoading: boolean;
  balances: StablecoinBalance[];
  preferred: StablecoinBalance | null;
  totalUsd: number;
  refreshBalances: () => Promise<void>;
  sendTransaction: (params: SendTxParams) => Promise<string>;
};

export type SendTxParams = {
  to: `0x${string}`;
  data: `0x${string}`;
  feeCurrency: `0x${string}`;
};

export function useMiniPay(): MiniPayState {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<StablecoinBalance[]>([]);
  const [preferred, setPreferred] = useState<StablecoinBalance | null>(null);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    const [all, pref] = await Promise.all([
      getAllBalances(address),
      getPreferredStablecoin(address),
    ]);
    setBalances(all);
    setPreferred(pref);

    // MiniPay requirement: redirect to deposit deeplink if zero balance
    if (pref === null && typeof window !== "undefined") {
      // Only redirect if we're actually in MiniPay and all balances are zero
      // Don't auto-redirect — let the UI show the deposit button instead
    }
  }, [address]);

  useEffect(() => {
    async function init() {
      try {
        if (typeof window === "undefined" || !window.ethereum) {
          setIsLoading(false);
          return;
        }
        const mp = window.ethereum.isMiniPay === true;
        setIsMiniPay(mp);

        if (mp) {
          const client = createWalletClient({ chain: celo, transport: custom(window.ethereum!) });
          // Use eth_requestAccounts instead of getAddresses to ensure MiniPay triggers connection if needed
          const [addr] = await client.requestAddresses().catch(async () => {
             // Fallback to getAddresses if requestAddresses is not supported
             return await client.getAddresses();
          });
          if (addr) setAddress(addr);
        }
      } catch (err) {
        console.error("MiniPay Init Error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Slight delay to ensure MiniPay provider is fully injected
    setTimeout(init, 100);
  }, []);

  useEffect(() => {
    if (address) refreshBalances();
  }, [address, refreshBalances]);

  const totalUsd = balances.reduce((sum, b) => sum + b.human, 0);

  const sendTransaction = useCallback(async ({ to, data, feeCurrency }: SendTxParams): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");
    const client = createWalletClient({ chain: celo, transport: custom(window.ethereum!) });

    // MiniPay constraint: legacy transactions only — no maxFeePerGas / maxPriorityFeePerGas
    const hash = await client.sendTransaction({
      account: address,
      to,
      data,
      feeCurrency,
    });
    return hash;
  }, [address]);

  return { address, isMiniPay, isLoading, balances, preferred, totalUsd, refreshBalances, sendTransaction };
}
