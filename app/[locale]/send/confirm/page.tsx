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
import { loadContacts, persistContact } from "@/components/RecipientInput";
import { saveTransaction } from "@/lib/history";
import { executeBridge } from "@/lib/lifi";

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
  const [bridgeStep, setBridgeStep] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("pp_send");
    if (!raw) { router.replace("/send"); return; }
    setParams(JSON.parse(raw));
  }, []);

  async function handleSend() {
    if (!address || !params) return;
    setSending(true);
    setBridgeStep("");
    setError(null);
    try {
      // Persist contact
      try {
        const existing = loadContacts().find(
          c => c.address === params.recipientAddress && c.route === params.route
        );
        if (!existing) {
          persistContact({ display: params.recipientDisplay, address: params.recipientAddress, route: params.route });
        }
      } catch {}

      let hash: string;
      let chain: "celo" | "arbitrum" = "celo";

      if (params.route === "localcrypto" && params.quote?.route) {
        // Execute LI.fi bridge (Celo → Arbitrum) using MiniPay-compatible CIP-64 txs
        setBridgeStep("Preparing...");
        const result = await executeBridge(
          params.quote.route,
          address,
          params.feeCurrency as `0x${string}`,
          (s) => setBridgeStep(s),
        );
        if (!result.success || !result.txHash) {
          throw new Error(result.error || "Bridge failed — please try again");
        }
        hash = result.txHash;
        chain = "celo";
      } else {
        // Direct ERC-20 transfer on Celo (minipay route)
        const amountRaw = parseUnits(params.amount, params.tokenDecimals);
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [params.recipientAddress as `0x${string}`, amountRaw],
        });
        hash = await sendTransaction({
          to: params.tokenAddress as `0x${string}`,
          data,
          feeCurrency: params.feeCurrency as `0x${string}`,
        });
      }

      sessionStorage.setItem("pp_tx", JSON.stringify({ hash, route: params.route, chain }));
      saveTransaction({
        timestamp: Date.now(),
        hash,
        chain,
        amount: params.amount,
        tokenSymbol: params.tokenSymbol,
        route: params.route,
        recipientDisplay: params.recipientDisplay,
        recipientAddress: params.recipientAddress,
        countryId: params.countryId || "PH",
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        fiatEstimate: toLocalFiat(parseFloat(params.amount), country.currencySymbol),
      });

      await refreshBalances();
      router.push("/send/status");
    } catch (err: any) {
      setError(err?.message ?? "Transaction failed");
      setSending(false);
      setBridgeStep("");
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
            {sending
              ? <><span className="spinner" /> {bridgeStep || "Sending..."}</>
              : `✅ ${t("swipeToSend")}`}
          </button>
          <Link href="/send" className="btn btn--ghost mt-8" style={{ marginTop: 8 }}>
            {t("cancel")}
          </Link>
        </div>
      </main>
    </>
  );
}
