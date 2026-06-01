"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ScanLine, Settings } from "lucide-react";
import { truncateAddress } from "@/lib/celoscan";
import { OfframpProvider } from "@/config/countries";
import dynamic from "next/dynamic";

const QrScannerModal = dynamic(() => import("@/components/QrScannerModal"), { ssr: false });
const ManageContactsModal = dynamic(() => import("@/components/ManageContactsModal"), { ssr: false });

export type Contact = {
  name?: string;
  display: string;
  address: string;
  route: string;
};

type Props = {
  route: OfframpProvider;
  onResolved: (address: `0x${string}` | null, display: string) => void;
};

const WALLET_RE = /^0x[0-9a-fA-F]{40}$/;

export function loadContacts(): Contact[] {
  try { return JSON.parse(localStorage.getItem("pp_contacts") || "[]"); } catch { return []; }
}

export function persistContact(contact: Contact) {
  const all = loadContacts();
  const idx = all.findIndex(c => c.address === contact.address && c.route === contact.route);
  if (idx >= 0) all[idx] = contact;
  else all.unshift(contact);
  localStorage.setItem("pp_contacts", JSON.stringify(all.slice(0, 20)));
}

export function deleteContact(address: string, route: string) {
  const all = loadContacts();
  const filtered = all.filter(c => !(c.address === address && c.route === route));
  localStorage.setItem("pp_contacts", JSON.stringify(filtered));
}

export function updateContact(address: string, route: string, newName: string) {
  const all = loadContacts();
  const idx = all.findIndex(c => c.address === address && c.route === route);
  if (idx >= 0) {
    all[idx].name = newName;
    localStorage.setItem("pp_contacts", JSON.stringify(all));
  }
}

export default function RecipientInput({ route, onResolved }: Props) {
  const t = useTranslations("send");
  const tc = useTranslations("common");
  const te = useTranslations("errors");

  const [walletValue, setWalletValue] = useState("");
  const [pickedContact, setPickedContact] = useState<{ name: string; address: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showQr, setShowQr] = useState(false);
  const [showManage, setShowManage] = useState(false);

  const [phoneInput, setPhoneInput] = useState("");
  const [resolvingPhone, setResolvingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Save-contact form state
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [contactNameInput, setContactNameInput] = useState("");
  const [savedAsName, setSavedAsName] = useState<string | null>(null);

  useEffect(() => { setContacts(loadContacts()); }, []);

  function handleCloseManage() {
    setShowManage(false);
    setContacts(loadContacts());
  }
  const isWalletOnly = route === "localcrypto";
  const isMiniPayEnv =
    typeof window !== "undefined" &&
    (window.ethereum as any)?.isMiniPay === true;

  function findContact(addr: string) {
    return contacts.find(c => c.address === addr && c.route === route);
  }

  function contactLabel(c: Contact) {
    if (c.name) return c.name;
    return c.display === c.address ? truncateAddress(c.address) : c.display;
  }

  function resetSave() {
    setShowSaveForm(false);
    setContactNameInput("");
    setSavedAsName(null);
  }

  function handleSaveContact(addr: string, displayValue: string) {
    const name = contactNameInput.trim() || displayValue;
    persistContact({ name, display: displayValue, address: addr, route });
    setContacts(loadContacts());
    setSavedAsName(name);
    setShowSaveForm(false);
    setContactNameInput("");
  }

  // Native MiniPay contact picker
  async function handlePickContact() {
    try {
      const contact = await (window.ethereum as any).request({
        method: "minipay_requestContact",
      });
      if (contact?.address) {
        setPickedContact(contact);
        setWalletValue("");
        setError(null);
        resetSave();
        onResolved(contact.address as `0x${string}`, contact.name || contact.address);
        const existing = findContact(contact.address);
        if (existing?.name) setSavedAsName(existing.name);
      }
    } catch {
      // user cancelled — silent
    }
  }

  async function handlePhoneLookup() {
    setResolvingPhone(true);
    setPhoneError(null);
    try {
      let phone = phoneInput.trim();
      if (!phone.startsWith("+")) {
        if (phone.startsWith("09") && phone.length === 11) {
          phone = "+63" + phone.slice(1);
        } else if (phone.startsWith("9") && phone.length === 10) {
          phone = "+63" + phone;
        } else {
          phone = "+" + phone;
        }
      }

      if (!/^\+[1-9]\d{6,14}$/.test(phone)) {
        throw new Error(te("invalidPhone") || "Phone must be in E.164 format (e.g. +639171234567)");
      }

      const res = await fetch("/api/resolve-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.status === 429) {
        throw new Error(data.error || "Too many requests — try again in a minute");
      }
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to resolve phone number");
      }
      if (!data.address) {
        throw new Error(t("notFound") || "No MiniPay wallet found for this number");
      }

      setPickedContact({ name: phone, address: data.address });
      setWalletValue("");
      setError(null);
      resetSave();
      onResolved(data.address as `0x${string}`, phone);
      const existing = findContact(data.address);
      if (existing?.name) setSavedAsName(existing.name);
    } catch (err: any) {
      setPhoneError(err?.message ?? "Failed to resolve phone number");
      onResolved(null, "");
    } finally {
      setResolvingPhone(false);
    }
  }

  function handleWalletChange(v: string) {
    setWalletValue(v);
    setPickedContact(null);
    setError(null);
    resetSave();
    if (WALLET_RE.test(v)) {
      onResolved(v as `0x${string}`, truncateAddress(v));
      const existing = findContact(v);
      if (existing?.name) setSavedAsName(existing.name);
    } else {
      onResolved(null, v);
    }
  }

  // Inline save-contact UI (shared between picker result and manual wallet)
  function SaveForm({ addr, displayValue }: { addr: string; displayValue: string }) {
    if (savedAsName) {
      return (
        <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 8 }}>
          💾 {t("contactSaved")} <strong>{savedAsName}</strong>
        </p>
      );
    }
    const existing = findContact(addr);
    return (
      <div style={{ marginTop: 10 }}>
        {!showSaveForm ? (
          <button
            className="btn btn--ghost"
            style={{ fontSize: 12, padding: "4px 0", color: "var(--text-secondary)" }}
            onClick={() => { setContactNameInput(existing?.name || ""); setShowSaveForm(true); }}
          >
            💾 {existing?.name ? t("editContact") : t("saveContact")}
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
            <input
              className="input-field"
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              placeholder={t("contactNamePlaceholder")}
              value={contactNameInput}
              onChange={e => setContactNameInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleSaveContact(addr, displayValue); }}
              autoFocus
            />
            <button
              className="btn btn--primary"
              style={{ padding: "8px 14px", fontSize: 13, width: "auto" }}
              onClick={() => handleSaveContact(addr, displayValue)}
            >
              {tc("confirm")}
            </button>
            <button
              className="btn btn--ghost"
              style={{ padding: "8px", fontSize: 20, width: "auto", lineHeight: 1 }}
              onClick={() => { setShowSaveForm(false); setContactNameInput(""); }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Wallet-only path (localcrypto — BSC address) ──────────────────────────
  if (isWalletOnly) {
    const routeContacts = contacts.filter(c => c.route === route);
    const isValid = WALLET_RE.test(walletValue);
    return (
      <div className="input-group">
        {showQr && (
          <QrScannerModal
            onScan={(address) => { setShowQr(false); handleWalletChange(address); }}
            onClose={() => setShowQr(false)}
          />
        )}
        {routeContacts.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, fontWeight: 600 }}>
                {tc("recentContacts")}
              </p>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setShowManage(true)}
                style={{ width: "auto", padding: "2px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
              >
                <Settings size={12} /> {t("manageContactsLink")}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {routeContacts.map(c => (
                <button
                  key={c.address}
                  className="btn btn--secondary"
                  style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                  onClick={() => handleWalletChange(c.address)}
                >
                  {contactLabel(c)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <label className="input-label" style={{ margin: 0 }}>{t("recipientWallet")}</label>
          <button
            className="btn btn--ghost"
            onClick={() => setShowQr(true)}
            style={{ width: "auto", padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
          >
            <ScanLine size={14} /> Scan QR
          </button>
        </div>
        <input
          id="recipient-wallet"
          className={`input-field${error ? " input-field--error" : ""}`}
          placeholder={t("recipientWalletPlaceholder")}
          value={walletValue}
          onChange={e => handleWalletChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
        {error && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>{error}</p>}
        {isValid && <SaveForm addr={walletValue} displayValue={truncateAddress(walletValue)} />}
        <div style={{ marginTop: 12, padding: "12px", borderRadius: "8px", background: "rgba(255, 152, 0, 0.1)", border: "1px solid rgba(255, 152, 0, 0.3)" }}>
          <p style={{ color: "#FF9800", fontSize: 13, lineHeight: 1.4, margin: 0, display: "flex", gap: 6, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <span>
              <strong>Important:</strong> Paste a <strong>BNB Smart Chain (BSC)</strong> network address from your local exchange account. Do not use other networks or your funds will be lost!
            </span>
          </p>
        </div>

        {showManage && (
          <ManageContactsModal
            route={route}
            onClose={handleCloseManage}
          />
        )}
      </div>
    );
  }

  // ── MiniPay send route ────────────────────────────────────────────────────
  const routeContacts = contacts.filter(c => c.route === route);
  const activeAddr = pickedContact?.address || (WALLET_RE.test(walletValue) ? walletValue : null);

  return (
    <div>
      {/* Saved contacts chips */}
      {routeContacts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, fontWeight: 600 }}>
              {tc("recentContacts")}
            </p>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setShowManage(true)}
              style={{ width: "auto", padding: "2px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}
            >
              <Settings size={12} /> {t("manageContactsLink")}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {routeContacts.map(c => (
              <button
                key={c.address}
                className="btn btn--secondary"
                style={{ padding: "6px 12px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={() => {
                  setPickedContact({ name: c.name || c.display, address: c.address });
                  setWalletValue("");
                  setError(null);
                  setSavedAsName(c.name || null);
                  setShowSaveForm(false);
                  onResolved(c.address as `0x${string}`, c.name || c.display);
                }}
              >
                {contactLabel(c)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Native MiniPay contact picker */}
      {isMiniPayEnv && (
        <button
          className="btn btn--primary"
          onClick={handlePickContact}
          style={{ marginBottom: 12 }}
        >
          📱 {t("pickContact")}
        </button>
      )}

      {/* Picked contact confirmation */}
      {pickedContact && (
        <div
          className="card"
          style={{ padding: "12px 16px", marginBottom: 12, borderColor: "var(--green)" }}
        >
          <p style={{ color: "var(--green)", fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
            ✅ {pickedContact.name || truncateAddress(pickedContact.address)}
          </p>
          <SaveForm addr={pickedContact.address} displayValue={pickedContact.name || pickedContact.address} />
        </div>
      )}

      {/* Divider */}
      {isMiniPayEnv && (
        <p style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13, margin: "4px 0 12px" }}>
          — {tc("or")} —
        </p>
      )}

      {/* Phone Number Lookup (ODIS) */}
      <div className="input-group" style={{ marginBottom: 12 }}>
        <label className="input-label">{t("recipientPhone")}</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            className={`input-field${phoneError ? " input-field--error" : ""}`}
            style={{ flex: 1, padding: "10px 14px" }}
            placeholder="+639171234567"
            value={phoneInput}
            onChange={e => {
              setPhoneInput(e.target.value);
              setPhoneError(null);
            }}
            disabled={resolvingPhone}
            autoComplete="tel"
          />
          <button
            type="button"
            className="btn btn--primary"
            style={{ width: "auto", padding: "10px 16px", fontSize: 13, whiteSpace: "nowrap" }}
            onClick={handlePhoneLookup}
            disabled={resolvingPhone || !phoneInput.trim()}
          >
            {resolvingPhone ? <span className="spinner" style={{ width: 14, height: 14 }} /> : t("lookup") || "Look Up"}
          </button>
        </div>
        {phoneError && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>❌ {phoneError}</p>}
      </div>

      {showQr && (
        <QrScannerModal
          onScan={(address) => { setShowQr(false); handleWalletChange(address); }}
          onClose={() => setShowQr(false)}
        />
      )}

      {/* Manual Celo wallet address */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <label className="input-label" style={{ margin: 0 }}>{t("recipientWallet")}</label>
        <button
          className="btn btn--ghost"
          onClick={() => setShowQr(true)}
          style={{ width: "auto", padding: "4px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
        >
          <ScanLine size={14} /> Scan QR
        </button>
      </div>
      <input
        id="recipient-wallet-celo"
        className={`input-field${error ? " input-field--error" : ""}`}
        placeholder={t("recipientWalletPlaceholder")}
        value={walletValue}
        onChange={e => handleWalletChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
      />
      {error && <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>{error}</p>}
      {WALLET_RE.test(walletValue) && (
        <SaveForm addr={walletValue} displayValue={truncateAddress(walletValue)} />
      )}

      {/* Overall validation state for parent */}
      {!activeAddr && walletValue.length > 5 && !WALLET_RE.test(walletValue) && (
        <p style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>
          {t("notFound")}
        </p>
      )}

      {showManage && (
        <ManageContactsModal
          route={route}
          onClose={handleCloseManage}
        />
      )}
    </div>
  );
}
