"use client";
import { useEffect, useState } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { COUNTRIES, getCountryConfig } from "@/config/countries";
import { ChevronLeft } from "lucide-react";
import FeeBreakdown from "@/components/FeeBreakdown";

type StoredSend = {
  amount: string;
  route: string;
  recipientAddress: string;
  recipientDisplay: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  feeCurrency: string;
  quote: any;
  countryId?: string;
};

export default function ConfirmPage() {
  const t = useTranslations("confirm");
  const router = useRouter();
  const { address, sendTransaction, refreshBalances } = useMiniPay();
  const [params, setParams] = useState<StoredSend | null>(null);
  const country = params ? getCountryConfig(params.countryId || "PH") : getCountryConfig("PH");
  const { rate, toLocalFiat } = useExchangeRate(country.currencyCode);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pp_send");
    if (!raw) { router.replace("/send"); return; }
    setParams(JSON.parse(raw));
  }, []);

  async function handleSend() {
    if (!address || !params) return;
    setSending(true);
    setError(null);
    try {
      const amountRaw = parseUnits(params.amount, params.tokenDecimals);
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [params.recipientAddress as `0x${string}`, amountRaw],
      });
      try {
        const prevContacts = JSON.parse(localStorage.getItem("pp_contacts") || "[]");
        if (!prevContacts.some((c: any) => c.address === params.recipientAddress && c.route === params.route)) {
          prevContacts.unshift({ display: params.recipientDisplay, address: params.recipientAddress, route: params.route });
          localStorage.setItem("pp_contacts", JSON.stringify(prevContacts.slice(0, 10)));
        }
      } catch (e) {}

      const hash = await sendTransaction({
        to: params.tokenAddress as `0x${string}`,
        data,
        feeCurrency: params.feeCurrency as `0x${string}`,
      });
      sessionStorage.setItem("pp_tx", JSON.stringify({ hash, route: params.route, chain: "celo" }));

      await refreshBalances();
      router.push("/send/status");
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
      setSending(false);
    }
  }

  if (!params) return null;

  return (
    <>
      <header className="app-header">
        <Link href="/send" className="btn btn--ghost" style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </Link>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{t("title")}</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page page-padded" style={{ paddingBottom: 120 }}>
        <div className="card card--green" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("sending")}</p>
          <p style={{ fontSize: 36, fontWeight: 800 }}>${params.amount} {params.tokenSymbol}</p>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginTop: 4 }}>{toLocalFiat(parseFloat(params.amount), country.currencySymbol)}</p>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("to")}</p>
          <p style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{params.recipientDisplay}</p>
        </div>

        <FeeBreakdown
          bridgeQuote={params.route === "localcrypto" ? params.quote : undefined}
          toLocalFiat={(usd: number) => toLocalFiat(usd, country.currencySymbol)}
        />

        {error && (
          <div className="card" style={{ borderColor: "var(--error)", marginTop: 16 }}>
            <p style={{ color: "var(--error)", fontSize: 14 }}>❌ {error}</p>
          </div>
        )}

        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "16px", background: "var(--bg)", borderTop: "1px solid var(--border)" }}>
          <button className="btn btn--primary" onClick={handleSend} disabled={sending}>
            {sending ? <><span className="spinner" /> Sending...</> : `✅ ${t("swipeToSend")}`}
          </button>
          <Link href="/send" className="btn btn--ghost mt-8" style={{ marginTop: 8 }}>
            {t("cancel")}
          </Link>
        </div>
      </main>
    </>
  );
}
