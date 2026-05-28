"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { celoscanTx, arbiscanTx } from "@/lib/celoscan";

type Props = { txHash: string; chain?: "celo" | "arbitrum" | "solana" };

export default function BlockchainReceipt({ txHash, chain = "celo" }: Props) {
  const t = useTranslations("status");
  const [copied, setCopied] = useState(false);
  
  const url = chain === "solana"
    ? `https://solscan.io/tx/${txHash}`
    : chain === "arbitrum"
      ? arbiscanTx(txHash)
      : celoscanTx(txHash);

  async function copy() {
    await navigator.clipboard.writeText(txHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="receipt-box">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase" }}>
          {chain === "solana" ? "Solscan" : chain === "arbitrum" ? "Arbiscan" : "Celoscan"} Receipt
        </span>
        <button onClick={copy} className="btn btn--ghost" style={{ width: "auto", padding: "2px 8px", fontSize: 12 }}>
          {copied ? "✅ Copied!" : "Copy"}
        </button>
      </div>
      <p className="receipt-hash">{txHash}</p>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="btn btn--secondary mt-8" style={{ marginTop: 12, fontSize: 14 }}>
        🔍 {t("viewReceipt")} ↗
      </a>
    </div>
  );
}
