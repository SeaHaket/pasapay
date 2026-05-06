"use client";
import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { ChevronLeft } from "lucide-react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useLifi } from "@/hooks/useLifi";
import Numpad from "@/components/Numpad";
import RouteSelector, { type SendRoute } from "@/components/RouteSelector";
import RecipientInput from "@/components/RecipientInput";
import FeeBreakdown from "@/components/FeeBreakdown";
import { MINIPAY_DEPOSIT_DEEPLINK } from "@/lib/constants";
import { COUNTRIES, getCountryConfig } from "@/config/countries";

export default function SendPage() {
  const t = useTranslations("send");
  const router = useRouter();
  const { address, preferred, totalUsd, sendTransaction } = useMiniPay();
  
  const [countryId, setCountryId] = useState("PH");
  const country = getCountryConfig(countryId);
  const { rate, toLocalFiat } = useExchangeRate(country.currencyCode);
  
  const { quote, status: bridgeStatus, fetchQuote } = useLifi();

  const [amount, setAmount] = useState("0");
  const [route, setRoute] = useState<SendRoute | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<`0x${string}` | null>(null);
  const [recipientDisplay, setRecipientDisplay] = useState("");
  const [step, setStep] = useState<"amount" | "route" | "recipient" | "review">("amount");

  const amountNum = parseFloat(amount) || 0;
  const hasBalance = amountNum > 0 && amountNum <= (preferred?.human ?? 0);

  // Auto-fetch bridge quote when on review step for localcrypto
  useEffect(() => {
    if (step === "review" && route === "localcrypto" && address && recipientAddress && preferred && amountNum > 0 && rate) {
      const raw = parseUnits(amount, preferred.decimals);
      fetchQuote({ fromAddress: address, toAddress: recipientAddress, token: preferred, amountRaw: raw, exchangeRate: rate ?? 0 });
    }
  }, [step, route]);

  async function handleConfirm() {
    if (!address || !preferred || !recipientAddress) return;

    if (route === "fonbnk") {
      const { openFonbnk } = await import("@/lib/fonbnk");
      openFonbnk(address);
      return;
    }

    // Store params in sessionStorage for confirm page
    sessionStorage.setItem("pp_send", JSON.stringify({
      amount, route, recipientAddress, recipientDisplay,
      tokenSymbol: preferred.symbol, tokenAddress: preferred.address,
      tokenDecimals: preferred.decimals, feeCurrency: preferred.feeCurrency,
      quote: quote ? { ...quote, route: undefined } : null,
      countryId
    }));
    router.push("/send/confirm");
  }

  function handleRouteSelect(r: SendRoute) {
    setRoute(r);
    if (r === "fonbnk") { setStep("review"); return; }
    setStep("recipient");
  }

  function handleBack() {
    if (step === "review") {
      if (route === "fonbnk") setStep("route");
      else setStep("recipient");
    } else if (step === "recipient") {
      setStep("route");
    } else if (step === "route") {
      setStep("amount");
    } else {
      router.push("/");
    }
  }

  return (
    <>
      <header className="app-header">
        <button onClick={handleBack} className="btn btn--ghost" style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{t("title")}</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingBottom: 100 }}>
        {/* Step 1 — Amount */}
        {step === "amount" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <label className="input-label" style={{ marginBottom: 8, fontSize: 13 }}>{t("recipientCountry")}</label>
              <select 
                className="input-field" 
                value={countryId} 
                onChange={(e) => {
                  const id = e.target.value;
                  setCountryId(id);
                  localStorage.setItem("pp_country", id);
                }}
                style={{ appearance: "none", backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239BA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")', backgroundRepeat: "no-repeat", backgroundPosition: "right 16px top 50%", backgroundSize: "12px auto" }}
              >
                {COUNTRIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.currencyCode})</option>
                ))}
              </select>
            </div>
            <Numpad
              value={amount}
              onChange={setAmount}
              fiatDisplay={toLocalFiat(amountNum, country.currencySymbol)}
              tokenSymbol={preferred?.symbol}
              maxDecimals={preferred?.decimals === 18 ? 6 : preferred?.decimals ?? 6}
            />
            {totalUsd === 0 && (
              <div className="card" style={{ textAlign: "center", margin: "16px 0" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, marginBottom: 12 }}>{t("insufficientBalance")}</p>
                <a href={MINIPAY_DEPOSIT_DEEPLINK} className="btn btn--primary">{t("depositCTA")}</a>
              </div>
            )}
            <div style={{ padding: "16px 8px 0" }}>
              <button
                className="btn btn--primary"
                onClick={() => setStep("route")}
                disabled={!hasBalance}
              >
                {t("continue")} →
              </button>
            </div>
          </>
        )}

        {/* Step 2 — Route */}
        {step === "route" && (
          <>
            <RouteSelector 
              selected={route} 
              onSelect={handleRouteSelect} 
              supported={country.supportedOfframps} 
              localCryptoName={country.localCryptoName} 
              bankOfframpExample={country.bankOfframpExample}
              currencyCode={country.currencyCode}
            />
          </>
        )}

        {/* Step 3 — Recipient */}
        {step === "recipient" && route !== "fonbnk" && (
          <>
            <p className="section-title">{t("to")}</p>
            <RecipientInput
              route={route ?? "minipay"}
              onResolved={(addr, display) => { setRecipientAddress(addr); setRecipientDisplay(display); }}
            />
            <button
              className="btn btn--primary mt-16"
              disabled={!recipientAddress}
              onClick={() => setStep("review")}
            >
              {t("continue")} →
            </button>
          </>
        )}

        {/* Step 4 — Review */}
        {step === "review" && (
          <>
            <div className="card card--green" style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("youSend")}</p>
              <p style={{ fontSize: 32, fontWeight: 800 }}>${amount} {preferred?.symbol}</p>
              <p style={{ fontSize: 15, color: "var(--text-secondary)" }}>{t("fiatEstimate", { amount: toLocalFiat(amountNum, ""), symbol: country.currencySymbol })}</p>
            </div>

            {route !== "fonbnk" && recipientDisplay && (
              <div className="card" style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{t("to")}</p>
                <p style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{recipientDisplay}</p>
              </div>
            )}

            <FeeBreakdown
              bridgeQuote={route === "localcrypto" ? quote : undefined}
              toLocalFiat={(usd) => toLocalFiat(usd, country.currencySymbol)}
              isLoading={route === "localcrypto" && bridgeStatus === "quoting"}
            />

            <button className="btn btn--primary mt-16" onClick={handleConfirm}>
              {route === "fonbnk" ? t("openWithdraw") + " →" : t("continue") + " →"}
            </button>
          </>
        )}
      </main>

      {/* Step indicator */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {(["amount","route","recipient","review"] as const).map((s, i) => (
            <div key={s} style={{ width: 8, height: 8, borderRadius: "50%", background: s === step ? "var(--green)" : "var(--border)" }} />
          ))}
        </div>
      </div>
    </>
  );
}
