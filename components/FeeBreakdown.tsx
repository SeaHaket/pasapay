"use client";
import { useTranslations } from "next-intl";
import type { BridgeQuote } from "@/lib/lifi";

type Props = {
  networkFeeUsd?: string;
  bridgeQuote?: BridgeQuote | null;
  toLocalFiat: (usd: number) => string;
  isLoading?: boolean;
};

export default function FeeBreakdown({ networkFeeUsd, bridgeQuote, toLocalFiat, isLoading }: Props) {
  const t = useTranslations("send");
  const tc = useTranslations("common");

  if (isLoading) {
    return (
      <div className="card" style={{ padding: "14px 16px" }}>
        <div className="flex items-center gap-8" style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          <span className="spinner" style={{ width: 14, height: 14 }} />
          <span>{t("gettingRoute")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "14px 16px" }}>
      {networkFeeUsd && (
        <div className="fee-row">
          <span className="fee-row__label">{tc("networkFee")}</span>
          <span className="fee-row__value">≈ ${networkFeeUsd}</span>
        </div>
      )}
      {bridgeQuote && (
        <>
          <div className="fee-row">
            <span className="fee-row__label">{t("bridgeFee")}</span>
            <span className="fee-row__value">≈ ${bridgeQuote.bridgeFeeUsd}</span>
          </div>
          <div className="fee-row fee-row--total">
            <span className="fee-row__label">{t("totalFee")}</span>
            <span className="fee-row__value">${bridgeQuote.totalFeeUsd}</span>
          </div>
          <div className="fee-row">
            <span className="fee-row__label">{t("estimatedTime")}</span>
            <span className="fee-row__value text-green">{bridgeQuote.estimatedDuration}</span>
          </div>
          <div className="divider" />
          <div className="fee-row">
            <span className="fee-row__label">{t("theyReceive")}</span>
            <span className="fee-row__value">
              {bridgeQuote.toAmountUsdt} USDT
              <span style={{ color: "var(--text-secondary)", fontSize: 12, display: "block" }}>
                ≈ {toLocalFiat(Number(bridgeQuote.toAmountUsdt))}
              </span>
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
            {t("via", { bridge: bridgeQuote.bridge })}
          </div>
        </>
      )}
    </div>
  );
}
