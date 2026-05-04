"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import type { StablecoinBalance } from "@/lib/stablecoins";

type Props = {
  balances: StablecoinBalance[];
  preferred: StablecoinBalance | null;
  totalUsd: number;
  toLocalFiat: (usd: number, symbol: string) => string;
  isLoading: boolean;
};

const TOKEN_COLORS: Record<string, string> = {
  USDT: "var(--usdt-green)",
  USDC: "var(--usdc-blue)",
  USDm: "var(--usdm-yellow)",
};

export default function BalanceCard({ balances, preferred, totalUsd, toLocalFiat, isLoading }: Props) {
  const t = useTranslations("home");

  if (isLoading) {
    return (
      <div className="card card--green balance-card" style={{ minHeight: 160 }}>
        <div className="balance-card__label">{t("balance")}</div>
        <div className="balance-card__amount" style={{ color: "var(--text-secondary)" }}>—</div>
      </div>
    );
  }

  return (
    <div className="card card--green balance-card">
      <div className="balance-card__bg" />
      <div className="balance-card__label">{t("totalBalance")}</div>
      <div className="balance-card__amount">
        ${totalUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="balance-card__php">{toLocalFiat(totalUsd, "₱")}</div>

      {balances.some(b => b.raw > 0n) && (
        <div className="balance-card__token-row">
          {balances.filter(b => b.raw > 0n).map(b => (
            <div key={b.symbol} className="token-pill">
              <span className="token-pill__dot" style={{ background: TOKEN_COLORS[b.symbol] }} />
              <span>{b.formatted} {b.symbol}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
