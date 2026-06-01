"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Home, Send, Clock, PiggyBank, Inbox, ChevronDown, ChevronUp, ExternalLink, Copy, Check, Sparkles } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import { loadHistory, type HistoryEntry } from "@/lib/history";
import { celoscanTx, bscscanTx } from "@/lib/celoscan";

const ROUTE_LABELS: Record<string, string> = {
  minipay: "MiniPay",
  localcrypto: "Local Exchange",
  fonbnk: "Fonbnk",
  transak: "Bank Transfer",
};

const ROUTE_COLORS: Record<string, string> = {
  minipay: "var(--green)",
  localcrypto: "#FF9800",
  fonbnk: "#9C27B0",
  transak: "#2196F3",
};

function truncateHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    + " · "
    + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function TxCard({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const explorerUrl = entry.chain === "bsc" ? bscscanTx(entry.hash) : celoscanTx(entry.hash);
  const routeColor = ROUTE_COLORS[entry.route] ?? "var(--text-secondary)";
  const routeLabel = ROUTE_LABELS[entry.route] ?? entry.route;

  async function copyHash() {
    await navigator.clipboard.writeText(entry.hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="card"
      style={{ marginBottom: 10, padding: 0, overflow: "hidden", cursor: "pointer" }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        {/* Route dot */}
        <div style={{
          width: 10, height: 10, borderRadius: "50%",
          background: routeColor, flexShrink: 0,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              ${entry.amount} <span style={{ fontSize: 13, fontWeight: 500 }}>{entry.tokenSymbol}</span>
            </span>
            {entry.fiatEstimate && (
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>≈ {entry.fiatEstimate}</span>
            )}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            → {entry.recipientDisplay}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
            background: `${routeColor}22`, color: routeColor,
          }}>
            {routeLabel}
          </span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{formatDate(entry.timestamp)}</span>
        </div>

        <div style={{ color: "var(--text-secondary)", marginLeft: 4 }}>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{ borderTop: "1px solid var(--border)", padding: "14px 16px", background: "var(--card-alt, rgba(0,0,0,0.02))" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Recipient address */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 3 }}>
              Recipient Address
            </p>
            <p style={{ fontSize: 13, fontFamily: "monospace", wordBreak: "break-all", color: "var(--text)" }}>
              {entry.recipientAddress}
            </p>
          </div>

          {/* Network */}
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 3 }}>
              Network
            </p>
            <p style={{ fontSize: 13 }}>{entry.chain === "bsc" ? "BNB Smart Chain" : "Celo"}</p>
          </div>

          {/* TX Hash */}
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: 3 }}>
              Transaction Hash
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text)", flex: 1, wordBreak: "break-all" }}>
                {truncateHash(entry.hash)}
              </p>
              <button
                className="btn btn--ghost"
                style={{ width: "auto", padding: "4px 10px", fontSize: 12, flexShrink: 0 }}
                onClick={copyHash}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Block explorer link */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--secondary"
            style={{ fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <ExternalLink size={14} />
            View on {entry.chain === "bsc" ? "BscScan" : "Celoscan"}
          </a>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  const t = useTranslations("history");
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setEntries(loadHistory());
  }, []);

  return (
    <>
      <AppHeader />
      <main className="page page-padded" style={{ paddingBottom: 80 }}>
        <h1 className="section-title">{t("title")}</h1>

        {entries.length === 0 ? (
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 48 }}>
            <div style={{ color: "var(--text-secondary)", marginBottom: 16 }}><Inbox size={48} strokeWidth={1.5} /></div>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{t("empty")}</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 14 }}>
              {entries.length} transaction{entries.length !== 1 ? "s" : ""} · tap any row to see details
            </p>
            {entries.map(e => <TxCard key={e.id} entry={e} />)}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav__item"><span className="bottom-nav__icon"><Home size={22} /></span><span>Home</span></Link>
        <Link href="/send" className="bottom-nav__item"><span className="bottom-nav__icon"><Send size={22} /></span><span>Send</span></Link>
        <Link href="/chat" className="bottom-nav__item"><span className="bottom-nav__icon"><Sparkles size={22} /></span><span>Co-pilot</span></Link>
        <Link href="/vault" className="bottom-nav__item"><span className="bottom-nav__icon"><PiggyBank size={22} /></span><span>Vault</span></Link>
        <Link href="/history" className="bottom-nav__item bottom-nav__item--active"><span className="bottom-nav__icon"><Clock size={22} /></span><span>History</span></Link>
      </nav>
    </>
  );
}
