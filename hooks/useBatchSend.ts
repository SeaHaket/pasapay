/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { createPublicClient, http, encodeFunctionData, erc20Abi } from "viem";
import { celo } from "viem/chains";
import { useMiniPay } from "@/hooks/useMiniPay";
import { PASAPAY_BATCH_ROUTER_ADDRESS, CELO_RPC } from "@/lib/constants";

// Minimal ABI for PasaPayBatchRouter
const BATCH_ROUTER_ABI = [
  {
    name: "batchTransferERC20",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "recipients", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
    outputs: [],
  },
] as const;

export type BatchSendStatus = "idle" | "checking" | "approving" | "sending" | "success" | "error";

export function useBatchSend() {
  const { address, sendTransaction } = useMiniPay();
  const [status, setStatus] = useState<BatchSendStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const sendBatch = useCallback(
    async (
      tokenAddress: `0x${string}`,
      recipients: `0x${string}`[],
      amounts: bigint[],
      feeCurrency: `0x${string}`,
      onProgressStep?: (step: string) => void
    ): Promise<string> => {
      if (!address) {
        const errMsg = "Wallet not connected";
        setError(errMsg);
        setStatus("error");
        throw new Error(errMsg);
      }

      if (recipients.length === 0) {
        const errMsg = "Empty batch";
        setError(errMsg);
        setStatus("error");
        throw new Error(errMsg);
      }

      setStatus("checking");
      setError(null);

      try {
        const publicClient = createPublicClient({
          chain: celo,
          transport: http(CELO_RPC),
        });

        // 1. Calculate cumulative sum
        const cumulativeSum = amounts.reduce((sum, amt) => sum + amt, 0n);

        // 2. Read current ERC20 allowance given to PasaPayBatchRouter
        onProgressStep?.("Checking token approval…");
        const allowance = await publicClient.readContract({
          address: tokenAddress,
          abi: erc20Abi,
          functionName: "allowance",
          args: [address, PASAPAY_BATCH_ROUTER_ADDRESS],
        });

        // 3. Trigger ERC20 approve if allowance is insufficient
        if (allowance < cumulativeSum) {
          setStatus("approving");
          onProgressStep?.("Approving batch router…");
          
          const approveData = encodeFunctionData({
            abi: erc20Abi,
            functionName: "approve",
            args: [PASAPAY_BATCH_ROUTER_ADDRESS, cumulativeSum],
          });

          let approveHash: string;
          try {
            approveHash = await sendTransaction({
              to: tokenAddress,
              data: approveData,
              feeCurrency,
            });
          } catch (err: any) {
            // MiniPay compliance error code interceptor
            if (err?.code === -32604 || err?.code === -32000 || err?.message?.includes("rejected")) {
              throw new Error("Approval canceled by user");
            }
            throw err;
          }

          onProgressStep?.("Awaiting approval confirmation…");
          await publicClient.waitForTransactionReceipt({
            hash: approveHash as `0x${string}`,
            timeout: 60_000,
          });
        }

        // 4. Execute the batchTransferERC20 contract method call
        setStatus("sending");
        onProgressStep?.("Sending batch transaction…");

        const batchData = encodeFunctionData({
          abi: BATCH_ROUTER_ABI,
          functionName: "batchTransferERC20",
          args: [tokenAddress, recipients, amounts],
        });

        let txHash: string;
        try {
          txHash = await sendTransaction({
            to: PASAPAY_BATCH_ROUTER_ADDRESS,
            data: batchData,
            feeCurrency,
          });
        } catch (err: any) {
          // MiniPay compliance error code interceptor
          if (err?.code === -32604 || err?.code === -32000 || err?.message?.includes("rejected")) {
            throw new Error("Batch send transaction canceled by user");
          }
          throw err;
        }

        setStatus("success");
        onProgressStep?.("");
        return txHash;
      } catch (err: any) {
        console.error("Batch send error:", err);
        const errMsg = err?.message ?? "Batch transaction failed";
        setError(errMsg);
        setStatus("error");
        onProgressStep?.("");
        throw new Error(errMsg);
      }
    },
    [address, sendTransaction]
  );

  return { sendBatch, status, error, setStatus, setError };
}
