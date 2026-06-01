"use client";

import { useEffect, useState, useCallback } from "react";
import { createWalletClient, custom } from "viem";
import { celo } from "viem/chains";
import { getAllBalances, type StablecoinBalance } from "@/lib/stablecoins";

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
  data?: `0x${string}`;
  value?: bigint;
  feeCurrency?: `0x${string}`;
};

export function useMiniPay(): MiniPayState {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [balances, setBalances] = useState<StablecoinBalance[]>([]);
  const [preferred, setPreferred] = useState<StablecoinBalance | null>(null);

  const refreshBalances = useCallback(async () => {
    if (!address) return;
    const all = await getAllBalances(address);
    setBalances(all);

    // Set preferred token to USDT by default, fallback to USDC, USDm, or first token
    const usdt = all.find((b) => b.symbol === "USDT");
    const usdc = all.find((b) => b.symbol === "USDC");
    const usdm = all.find((b) => b.symbol === "USDm");
    setPreferred(usdt || usdc || usdm || all[0] || null);
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
    
    setTimeout(init, 0);
  }, []);

  useEffect(() => {
    if (address) refreshBalances();
  }, [address, refreshBalances]);

  // Calculate total USD across all tokens, multiplying balance by priceUsd
  const totalUsd = balances.reduce((sum, b) => sum + b.human * b.priceUsd, 0);

  const sendTransaction = useCallback(async ({ to, data = "0x", value, feeCurrency }: SendTxParams): Promise<string> => {
    if (!address) throw new Error("Wallet not connected");
    const client = createWalletClient({ chain: celo, transport: custom(window.ethereum!) });

    // MiniPay constraint: legacy transactions only — no maxFeePerGas / maxPriorityFeePerGas
    const txParams: any = {
      account: address,
      to,
      data,
    };

    if (value !== undefined) {
      txParams.value = value;
    }

    if (feeCurrency) {
      txParams.feeCurrency = feeCurrency;
    }

    const hash = await client.sendTransaction(txParams);
    return hash;
  }, [address]);

  return { address, isMiniPay, isLoading, balances, preferred, totalUsd, refreshBalances, sendTransaction };
}
