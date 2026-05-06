"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Home, Send, Clock, Settings, Wallet, Smartphone, Gift } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import BalanceCard from "@/components/BalanceCard";
import AppHeader from "@/components/AppHeader";
import { COUNTRIES, getCountryConfig } from "@/config/countries";

export default function HomePage() {
  const t = useTranslations("home");
  const te = useTranslations("errors");
  const tc = useTranslations("common");
  const { address, isMiniPay, isLoading, balances, preferred, totalUsd } = useMiniPay();
  
  const [countryId, setCountryId] = useState("PH");
  useEffect(() => {
    const saved = localStorage.getItem("pp_country");
    if (saved) setCountryId(saved);
  }, []);

  const country = getCountryConfig(countryId);
  const { toLocalFiat } = useExchangeRate(country.currencyCode);

  const [previewMode, setPreviewMode] = useState(false);

  if (!isLoading && !isMiniPay && !previewMode) {
    return (
      <div className="not-minipay">
        <div className="not-minipay__icon"><Smartphone size={48} strokeWidth={1.5} /></div>
        <h1 className="not-minipay__title">PasaPay</h1>
        <p className="not-minipay__desc">{te("walletNotConnected")}</p>
        <a href="https://minipay.opera.com" target="_blank" rel="noopener noreferrer"
          className="btn btn--primary" style={{ width: "auto", padding: "14px 32px", marginBottom: 16 }}>
          {te("openInMiniPay")}
        </a>
        <button 
          className="btn btn--ghost" 
          onClick={() => setPreviewMode(true)}
          style={{ fontSize: 13, textDecoration: "underline" }}>
          Developer: Preview UI in Browser
        </button>
      </div>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="page page-padded">
        <BalanceCard
          balances={balances}
          preferred={preferred}
          totalUsd={totalUsd}
          toLocalFiat={(usd) => toLocalFiat(usd, country.currencySymbol)}
          isLoading={isLoading}
        />

        <div className="action-row">
          <Link href="/send" className="action-btn action-btn--primary">
            <div className="action-btn__icon"><Send size={20} /></div>
            <span className="action-btn__label">{t("send")}</span>
          </Link>
          <Link href="/history" className="action-btn">
            <div className="action-btn__icon"><Clock size={20} /></div>
            <span className="action-btn__label">{t("history")}</span>
          </Link>
        </div>

        <div className="card card--glass" style={{ margin: "24px 0", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", padding: "16px" }} onClick={() => { window.location.href = "https://claim.minipay.xyz/"; }}>
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(252, 209, 22, 0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ph-gold)", flexShrink: 0 }}>
            <Gift size={22} />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>Claim MiniPay Rewards</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>Don't forget to claim your daily USDT rewards!</p>
          </div>
        </div>

        <p className="section-title">{t("recentActivity")}</p>
        <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("noTransactions")}</p>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav__item bottom-nav__item--active">
          <span className="bottom-nav__icon"><Home size={22} /></span>
          <span>{tc("home")}</span>
        </Link>
        <Link href="/send" className="bottom-nav__item">
          <span className="bottom-nav__icon"><Send size={22} /></span>
          <span>{t("send")}</span>
        </Link>
        <Link href="/history" className="bottom-nav__item">
          <span className="bottom-nav__icon"><Clock size={22} /></span>
          <span>{t("history")}</span>
        </Link>
        <Link href="/settings" className="bottom-nav__item">
          <span className="bottom-nav__icon"><Settings size={22} /></span>
          <span>{tc("settings")}</span>
        </Link>
      </nav>
    </>
  );
}
