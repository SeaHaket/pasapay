"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import type { StablecoinBalance } from "@/lib/stablecoins";

type Props = {
  balances: StablecoinBalance[];
  preferred: StablecoinBalance | null;
  totalUsd: number;
  toLocalFiat: (usd: number) => string;
  isLoading: boolean;
  address?: string | null;
};

const TOKEN_COLORS: Record<string, string> = {
  USDT: "var(--usdt-green)",
  USDC: "var(--usdc-blue)",
  USDm: "var(--usdm-yellow)",
  CELO: "#FBCC5C",
};

export default function BalanceCard({ 
  balances, 
  preferred, 
  totalUsd, 
  toLocalFiat, 
  isLoading,
  address 
}: Props) {
  const t = useTranslations("home");
  const [showOthers, setShowOthers] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="card card--green balance-card" style={{ minHeight: 180 }}>
        <div className="balance-card__label">{t("balance")}</div>
        <div className="balance-card__amount" style={{ color: "var(--text-secondary)" }}>—</div>
      </div>
    );
  }

  // Check if there are other tokens with value (USDC, USDm, CELO with balance > 0)
  const otherTokensWithValue = balances.filter(
    (b) => b.symbol !== "USDT" && b.raw > 0n
  );

  const hasOthers = otherTokensWithValue.length > 0;

  // Visible tokens list
  const visibleTokens = balances.filter((b) => {
    if (b.symbol === "USDT") return true; // Always show USDT by default
    return showOthers && b.raw > 0n; // Show others only if toggle is on and they have value
  });

  return (
    <div className="card card--green balance-card" style={{ padding: "20px 20px 16px" }}>
      <div className="balance-card__bg" />
      
      <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 8 }}>
        <div className="balance-card__label" style={{ margin: 0 }}>{t("totalBalance")}</div>
        
        {address && (
          <button 
            onClick={handleCopy} 
            className="token-pill"
            style={{ 
              background: "rgba(255, 255, 255, 0.06)", 
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "4px 8px", 
              fontSize: 11,
              fontFamily: "monospace",
              cursor: "pointer",
              gap: 4,
              display: "flex",
              alignItems: "center"
            }}
          >
            <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
            {copied ? <Check size={12} className="text-green" /> : <Copy size={12} className="text-secondary" />}
          </button>
        )}
      </div>

      <div className="balance-card__amount">
        ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="balance-card__php">{toLocalFiat(totalUsd)}</div>

      <div className="divider" style={{ margin: "14px 0 10px", background: "rgba(255, 255, 255, 0.08)" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Visible token pills */}
        <div className="balance-card__token-row" style={{ marginTop: 0, gap: 6 }}>
          {visibleTokens.map((b) => (
            <div key={b.symbol} className="token-pill" style={{ background: "rgba(21, 34, 54, 0.6)" }}>
              <span className="token-pill__dot" style={{ background: TOKEN_COLORS[b.symbol] || "var(--text-secondary)" }} />
              <span>{b.formatted} {b.symbol}</span>
            </div>
          ))}
        </div>

        {/* Dynamic toggle trigger */}
        {hasOthers && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowOthers(!showOthers)}
              className="btn btn--ghost"
              style={{
                width: "auto",
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {showOthers ? (
                <>
                  <EyeOff size={13} />
                  <span>Hide other tokens</span>
                </>
              ) : (
                <>
                  <Eye size={13} />
                  <span>Show hidden assets ({otherTokensWithValue.length})</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
