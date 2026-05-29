"use client";
import { useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { ChevronLeft } from "lucide-react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { useLifi } from "@/hooks/useLifi";
import { useBatchSend } from "@/hooks/useBatchSend";
import Numpad from "@/components/Numpad";
import RouteSelector, { type SendRoute } from "@/components/RouteSelector";
import RecipientInput from "@/components/RecipientInput";
import FeeBreakdown from "@/components/FeeBreakdown";
import { MINIPAY_DEPOSIT_DEEPLINK, PASAPAY_FEE_ADDRESS, FONBNK_APP_FEE, FONBNK_POOL_ADDRESS, CELO_RPC } from "@/lib/constants";
import { COUNTRIES, getCountryConfig, type OfframpProvider } from "@/config/countries";
import { executeBridge } from "@/lib/lifi";
import { saveTransaction } from "@/lib/history";

export default function SendPage() {
  const t = useTranslations("send");
  const router = useRouter();
  const { address, preferred, totalUsd, sendTransaction, refreshBalances } = useMiniPay();
  const { sendBatch } = useBatchSend();
  
  const [countryId, setCountryId] = useState("PH");
  const country = getCountryConfig(countryId);
  const { rate, toLocalFiat } = useExchangeRate(country.currencyCode);
  
  const { quote, status: bridgeStatus, fetchQuote } = useLifi();

  const [amount, setAmount] = useState("0");
  const [route, setRoute] = useState<SendRoute | null>(null);
  const [recipientAddress, setRecipientAddress] = useState<`0x${string}` | null>(null);
  const [recipientDisplay, setRecipientDisplay] = useState("");
  const [step, setStep] = useState<"amount" | "route" | "recipient" | "review">("amount");
  const [isQuickSend, setIsQuickSend] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStep, setSendStep] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);

  // Pre-fill from Quick Send tap
  useEffect(() => {
    const raw = sessionStorage.getItem("pp_quicksend");
    if (!raw) return;
    sessionStorage.removeItem("pp_quicksend");
      try {
        const qs = JSON.parse(raw);
        const VALID_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
        const VALID_ROUTES: SendRoute[] = ["minipay", "localcrypto", "transak", "fonbnk"];
        const VALID_COUNTRIES = /^[A-Z]{2}$/;
        // Reject the payload if the address is present but malformed
        if (qs.recipientAddress && !VALID_ADDRESS.test(qs.recipientAddress)) return;
        if (qs.recipientAddress) setRecipientAddress(qs.recipientAddress as `0x${string}`);
      if (qs.recipientDisplay && typeof qs.recipientDisplay === "string")
        setRecipientDisplay(qs.recipientDisplay.slice(0, 100));
      if (qs.countryId && VALID_COUNTRIES.test(qs.countryId)) setCountryId(qs.countryId);
      if (qs.route && VALID_ROUTES.includes(qs.route)) setRoute(qs.route as SendRoute);
      setIsQuickSend(true);
    } catch {}
  }, []);

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
    if (route === "fonbnk") {
      if (!address || !preferred) return;
      setSending(true);
      setSendError(null);

      try {
        const recipients: `0x${string}`[] = [];
        const amounts: bigint[] = [];

        // 1. App fee ($0.10) if re-enabled
        if (PASAPAY_FEE_ADDRESS) {
          setSendStep("Preparing batch payload…");
          recipients.push(PASAPAY_FEE_ADDRESS);
          amounts.push(parseUnits(FONBNK_APP_FEE, preferred.decimals));
        }

        // 2. User remittance amount
        recipients.push(FONBNK_POOL_ADDRESS);
        amounts.push(parseUnits(amountNum.toFixed(preferred.decimals), preferred.decimals));

        // 3. Execute combined atomic batch transfer using useBatchSend hook
        const hash = await sendBatch(
          preferred.address as `0x${string}`,
          recipients,
          amounts,
          preferred.feeCurrency as `0x${string}`,
          (step) => setSendStep(step)
        );

        saveTransaction({
          timestamp: Date.now(),
          hash,
          chain: "celo",
          amount,
          tokenSymbol: preferred.symbol,
          route: "fonbnk",
          recipientDisplay: `Fonbnk (${country.currencyCode})`,
          recipientAddress: FONBNK_POOL_ADDRESS,
          countryId,
          currencyCode: country.currencyCode,
          currencySymbol: country.currencySymbol,
          fiatEstimate: toLocalFiat(amountNum, country.currencySymbol),
        });

        const { openFonbnk } = await import("@/lib/fonbnk");
        openFonbnk(address, country.currencyCode);
      } catch (err: any) {
        setSendError(err?.message ?? "Transaction failed — please try again");
      } finally {
        setSending(false);
        setSendStep("");
      }
      return;
    }

    if (!address || !preferred || !recipientAddress) return;
    setSending(true);
    setSendStep("Sending...");
    setSendError(null);

    try {
      let hash: string;
      let chain: "celo" | "bsc" = "celo";

      if (route === "localcrypto" && quote?.route) {
        const result = await executeBridge(
          quote.route,
          address,
          preferred.feeCurrency as `0x${string}`,
          (s) => setSendStep(s),
        );
        if (!result.success || !result.txHash) throw new Error(result.error || "Bridge failed — please try again");
        hash = result.txHash;
      } else {
        const amountRaw = parseUnits(amount, preferred.decimals);
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [recipientAddress, amountRaw],
        });
        hash = await sendTransaction({
          to: preferred.address as `0x${string}`,
          data,
          feeCurrency: preferred.feeCurrency as `0x${string}`,
        });
      }

      sessionStorage.setItem("pp_tx", JSON.stringify({ hash, route, chain }));
      saveTransaction({
        timestamp: Date.now(),
        hash,
        chain,
        amount,
        tokenSymbol: preferred.symbol,
        route: route!,
        recipientDisplay,
        recipientAddress,
        countryId,
        currencyCode: country.currencyCode,
        currencySymbol: country.currencySymbol,
        fiatEstimate: toLocalFiat(amountNum, country.currencySymbol),
      });

      await refreshBalances();
      router.push("/send/status");
    } catch (err: any) {
      setSendError(err?.message ?? "Transaction failed");
      setSending(false);
      setSendStep("");
    }
  }

  function handleRouteSelect(r: SendRoute) {
    setRoute(r);
    if (r === "fonbnk") { setStep("review"); return; }
    setStep("recipient");
  }

  function handleBack() {
    if (sending) return;
    if (step === "review") {
      if (isQuickSend) setStep("amount");
      else if (route === "fonbnk") setStep("route");
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
            {isQuickSend && recipientDisplay && (
              <div className="card" style={{ marginTop: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {recipientDisplay.startsWith("0x") ? recipientDisplay.slice(2, 4).toUpperCase() : recipientDisplay.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Sending to</p>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{recipientDisplay}</p>
                </div>
              </div>
            )}
            <div style={{ padding: "16px 8px 0" }}>
              <button
                className="btn btn--primary"
                onClick={() => isQuickSend ? setStep("review") : setStep("route")}
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
              route={(route && route.startsWith("vault") ? "minipay" : (route ?? "minipay")) as OfframpProvider}
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

            {route === "fonbnk" && PASAPAY_FEE_ADDRESS && (
              <div className="card" style={{ marginBottom: 16, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>App fee</p>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>$0.10 {preferred?.symbol}</p>
                </div>
                <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "4px 0 0" }}>
                  Charged before opening Fonbnk
                </p>
              </div>
            )}

            {sendError && (
              <div className="card" style={{ borderColor: "var(--error)", marginTop: 12 }}>
                <p style={{ color: "var(--error)", fontSize: 13 }}>❌ {sendError}</p>
              </div>
            )}

            <button
              className="btn btn--primary mt-16"
              onClick={handleConfirm}
              disabled={sending || (route === "localcrypto" && bridgeStatus === "quoting")}
            >
              {sending
                ? <><span className="spinner" /> {sendStep}</>
                : route === "fonbnk" ? t("openWithdraw") + " →" : "Send →"
              }
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
