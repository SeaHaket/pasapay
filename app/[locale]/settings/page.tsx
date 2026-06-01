"use client";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Home, Send, Clock, PiggyBank, MessageCircle, FileText, Shield, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";

const APP_VERSION = "0.1.0";

export default function SettingsPage() {
  const t = useTranslations("settings");

  // Language selector removed as per request

  return (
    <>
      <AppHeader />
      <main className="page page-padded">
        <h1 className="section-title">{t("title")}</h1>

        {/* Language removed */}

        {/* Support — required by MiniPay listing rules */}
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, fontWeight: 700, textTransform: "uppercase" }}>{t("support")}</p>
          <a href="https://t.me/pasapay_support" target="_blank" rel="noopener noreferrer" className="settings-row">
            <div className="settings-row__left">
              <span className="settings-row__icon"><MessageCircle size={20} /></span>
              <span className="settings-row__label">{t("supportLink")}</span>
            </div>
            <span className="settings-row__right">↗</span>
          </a>
        </div>

        {/* Legal — required by MiniPay listing rules */}
        <div className="card" style={{ marginBottom: 16 }}>
          <Link href="/terms" className="settings-row">
            <div className="settings-row__left">
              <span className="settings-row__icon"><FileText size={20} /></span>
              <span className="settings-row__label">{t("terms")}</span>
            </div>
            <span className="settings-row__right">›</span>
          </Link>
          <Link href="/privacy" className="settings-row" style={{ borderBottom: "none" }}>
            <div className="settings-row__left">
              <span className="settings-row__icon"><Shield size={20} /></span>
              <span className="settings-row__label">{t("privacy")}</span>
            </div>
            <span className="settings-row__right">›</span>
          </Link>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)", marginTop: 24, lineHeight: 1.8 }}>
          PasaPay v{APP_VERSION} · Powered by Celo MiniPay{"\n"}
          <span style={{ opacity: 0.6 }}>Built by SeaHaket</span>
        </p>
      </main>

      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav__item"><span className="bottom-nav__icon"><Home size={22} /></span><span>Home</span></Link>
        <Link href="/send" className="bottom-nav__item"><span className="bottom-nav__icon"><Send size={22} /></span><span>Send</span></Link>
        <Link href="/chat" className="bottom-nav__item"><span className="bottom-nav__icon"><Sparkles size={22} /></span><span>Co-pilot</span></Link>
        <Link href="/vault" className="bottom-nav__item"><span className="bottom-nav__icon"><PiggyBank size={22} /></span><span>Vault</span></Link>
        <Link href="/history" className="bottom-nav__item"><span className="bottom-nav__icon"><Clock size={22} /></span><span>History</span></Link>
      </nav>
    </>
  );
}
