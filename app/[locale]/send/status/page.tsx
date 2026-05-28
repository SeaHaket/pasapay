"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import StatusTracker from "@/components/StatusTracker";
import BlockchainReceipt from "@/components/BlockchainReceipt";
import { loadHistory } from "@/lib/history";

type TxData = { hash: string; route: string; chain: "celo" | "bsc" };

export default function StatusPage() {
  const t = useTranslations("status");
  const tc = useTranslations("common");
  const [tx, setTx] = useState<TxData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pp_tx");
    if (raw) { setTx(JSON.parse(raw)); return; }
    // Fallback: if the page was refreshed, recover from persistent history
    const history = loadHistory();
    if (history.length > 0) {
      const last = history[0];
      setTx({ hash: last.hash, route: last.route, chain: last.chain });
    }
  }, []);

  if (!tx) return (
    <div className="not-minipay">
      <p style={{ color: "var(--text-secondary)" }}>No transaction found.</p>
      <Link href="/" className="btn btn--primary" style={{ width: "auto", padding: "14px 32px", marginTop: 16 }}>{tc("goHome")}</Link>
    </div>
  );

  return (
    <>
      <main className="page page-padded" style={{ paddingBottom: 120 }}>
        <StatusTracker status="success" txHash={tx.hash} />

        <div style={{ marginTop: 24 }}>
          <BlockchainReceipt txHash={tx.hash} chain={tx.chain} />
        </div>
      </main>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
        <Link href="/send" className="btn btn--secondary" style={{ marginBottom: 8 }}>{t("sendAnother")}</Link>
        <Link href="/" className="btn btn--ghost">{tc("home")}</Link>
      </div>
    </>
  );
}
