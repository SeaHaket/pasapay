"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Home, Send, Clock, Settings, Wallet, Smartphone, Gift } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import BalanceCard from "@/components/BalanceCard";
import AppHeader from "@/components/AppHeader";
import QuickSend from "@/components/QuickSend";
import { COUNTRIES, getCountryConfig } from "@/config/countries";
import { loadHistory, getQuickContacts, type HistoryEntry, type QuickContact } from "@/lib/history";

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
  const [recentTxs, setRecentTxs] = useState<HistoryEntry[]>([]);
  const [quickContacts, setQuickContacts] = useState<QuickContact[]>([]);
  useEffect(() => {
    setRecentTxs(loadHistory().slice(0, 3));
    setQuickContacts(getQuickContacts(5));
  }, []);

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

        {quickContacts.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <QuickSend contacts={quickContacts} address={address ?? undefined} />
          </div>
        )}

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
        {recentTxs.length === 0 ? (
          <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("noTransactions")}</p>
          </div>
        ) : (
          <>
            {recentTxs.map(tx => (
              <div key={tx.id} className="card" style={{ padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>${tx.amount} <span style={{ fontWeight: 400, color: "var(--text-secondary)", fontSize: 13 }}>{tx.tokenSymbol}</span></p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {tx.recipientDisplay}</p>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", flexShrink: 0 }}>{new Date(tx.timestamp).toLocaleDateString()}</p>
              </div>
            ))}
            <Link href="/history" style={{ display: "block", textAlign: "center", color: "var(--text-secondary)", fontSize: 13, padding: "8px 0" }}>
              View all history →
            </Link>
          </>
        )}
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
