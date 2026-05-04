"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { truncateAddress } from "@/lib/celoscan";
import { OfframpProvider } from "@/config/countries";

type Props = {
  route: OfframpProvider;
  onResolved: (address: `0x${string}` | null, display: string) => void;
};

type InputMode = "phone" | "wallet";

export default function RecipientInput({ route, onResolved }: Props) {
  const t = useTranslations("send");
  const [mode, setMode] = useState<InputMode>("phone");
  const [value, setValue] = useState("");
  const [resolving, setResolving] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<{display: string, address: string, route: string}[]>([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("pp_contacts") || "[]");
      setContacts(saved);
    } catch (e) {}
  }, []);

  // localcrypto and Transak only need a wallet address (Arbitrum)
  const isWalletOnly = route === "localcrypto" || route === "transak";

  async function handleResolvePhone() {
    setResolving(true);
    setError(null);
    setResolvedAddress(null);
    try {
      const res = await fetch("/api/resolve-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: value.replace(/\s/g, "") }),
      });
      const data = await res.json();
      if (data.address) {
        setResolvedAddress(data.address);
        onResolved(data.address as `0x${string}`, value);
      } else {
        setError(t("notFound"));
        onResolved(null, value);
      }
    } catch {
      setError(t("notFound"));
    } finally {
      setResolving(false);
    }
  }

  function handleWalletChange(v: string) {
    setValue(v);
    setError(null);
    setResolvedAddress(null);
    if (/^0x[0-9a-fA-F]{40}$/.test(v)) {
      onResolved(v as `0x${string}`, truncateAddress(v));
    } else {
      onResolved(null, v);
    }
  }

  // Wallet-only route (localcrypto)
  if (isWalletOnly) {
    const routeContacts = contacts.filter(c => c.route === route);
    return (
      <div className="input-group">
        {routeContacts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Recent Contacts</p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {routeContacts.map(c => (
                <button
                  key={c.address}
                  className="btn btn--secondary"
                  style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                  onClick={() => { setValue(c.address); handleWalletChange(c.address); }}
                >
                  {c.display === c.address ? truncateAddress(c.address) : c.display}
                </button>
              ))}
            </div>
          </div>
        )}
        <label className="input-label">{t("recipientWallet")}</label>
        <input
          id="recipient-wallet"
          className={`input-field${error ? " input-field--error" : ""}`}
          placeholder={t("recipientWalletPlaceholder")}
          value={value}
          onChange={e => handleWalletChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>{error}</p>}
        {route === "localcrypto" && (
          <div style={{ marginTop: 12, padding: "12px", borderRadius: "8px", background: "rgba(255, 152, 0, 0.1)", border: "1px solid rgba(255, 152, 0, 0.3)" }}>
            <p style={{ color: "#FF9800", fontSize: 13, lineHeight: 1.4, margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <span><strong>Important:</strong> Paste an <strong>Arbitrum (ARB)</strong> network address from your local crypto exchange account. Do not use other networks or your funds will be lost!</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  const routeContacts = contacts.filter(c => c.route === route || (!isWalletOnly && c.route !== "localcrypto" && c.route !== "transak"));

  return (
    <div>
      {routeContacts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8, fontWeight: 600 }}>Recent Contacts</p>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {routeContacts.map(c => (
              <button
                key={c.address}
                className="btn btn--secondary"
                style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={() => { 
                  setValue(c.display); 
                  setResolvedAddress(c.address);
                  onResolved(c.address as `0x${string}`, c.display);
                  if (c.display.startsWith("0x")) setMode("wallet");
                  else setMode("phone");
                }}
              >
                {c.display === c.address ? truncateAddress(c.address) : c.display}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle phone / wallet */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          className={`btn${mode === "phone" ? " btn--primary" : " btn--secondary"}`}
          style={{ flex: 1, padding: "10px 8px", fontSize: 13 }}
          onClick={() => { setMode("phone"); setValue(""); setError(null); setResolvedAddress(null); onResolved(null, ""); }}
        >📞 {t("recipientPhone")}</button>
        <button
          className={`btn${mode === "wallet" ? " btn--primary" : " btn--secondary"}`}
          style={{ flex: 1, padding: "10px 8px", fontSize: 13 }}
          onClick={() => { setMode("wallet"); setValue(""); setError(null); setResolvedAddress(null); onResolved(null, ""); }}
        >🔑 {t("recipientWallet")}</button>
      </div>

      {mode === "phone" ? (
        <div className="input-group">
          <input
            id="recipient-phone"
            className={`input-field${error ? " input-field--error" : ""}`}
            placeholder={t("recipientPhonePlaceholder")}
            value={value}
            onChange={e => { setValue(e.target.value); setError(null); setResolvedAddress(null); }}
            type="tel"
            inputMode="tel"
          />
          <button
            className="btn btn--secondary mt-8"
            onClick={handleResolvePhone}
            disabled={!value || resolving}
          >
            {resolving ? <><span className="spinner" /> {t("resolving")}</> : "🔍 " + t("resolved")}
          </button>
          {resolvedAddress && (
            <p style={{ color: "var(--green)", fontSize: 12, marginTop: 8 }}>
              ✅ {t("resolved")}: {truncateAddress(resolvedAddress)}
            </p>
          )}
          {error && (
            <div style={{ marginTop: 8 }}>
              <p style={{ color: "var(--error)", fontSize: 12 }}>{error}</p>
              <button className="btn btn--ghost" style={{ fontSize: 12, marginTop: 4, padding: "4px 0" }}
                onClick={() => { setMode("wallet"); setValue(""); setError(null); }}>
                {t("useWalletFallback")} →
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="input-group">
          <input
            id="recipient-wallet-fallback"
            className={`input-field${error ? " input-field--error" : ""}`}
            placeholder={t("recipientWalletPlaceholder")}
            value={value}
            onChange={e => handleWalletChange(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
          {error && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>{error}</p>}
        </div>
      )}
    </div>
  );
}
