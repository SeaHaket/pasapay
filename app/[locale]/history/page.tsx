"use client";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Home, Send, Clock, Settings, Inbox } from "lucide-react";
import AppHeader from "@/components/AppHeader";

export default function HistoryPage() {
  const t = useTranslations("history");
  return (
    <>
      <AppHeader />
      <main className="page page-padded">
        <h1 className="section-title">{t("title")}</h1>
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
          <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><Inbox size={48} strokeWidth={1.5} /></div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("empty")}</p>
        </div>
      </main>
      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav__item"><span className="bottom-nav__icon"><Home size={22} /></span><span>Home</span></Link>
        <Link href="/send" className="bottom-nav__item"><span className="bottom-nav__icon"><Send size={22} /></span><span>Send</span></Link>
        <Link href="/history" className="bottom-nav__item bottom-nav__item--active"><span className="bottom-nav__icon"><Clock size={22} /></span><span>History</span></Link>
        <Link href="/settings" className="bottom-nav__item"><span className="bottom-nav__icon"><Settings size={22} /></span><span>Settings</span></Link>
      </nav>
    </>
  );
}
