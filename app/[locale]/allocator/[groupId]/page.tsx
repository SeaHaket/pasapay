"use client";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Plus, Trash2, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { getGroup, upsertGroup, type AllocatorGroup, type AllocatorRecipient } from "@/lib/allocator";
import { COUNTRIES, getCountryConfig, type OfframpProvider } from "@/config/countries";

const ROUTE_LABELS: Record<OfframpProvider | "vault" | "vault_aave" | "vault_morpho", string> = {
  minipay: "MiniPay",
  fonbnk: "Fonbnk",
  localcrypto: "Local Crypto",
  transak: "Bank / eWallet",
  vault: "Savings Vault (Aave V3)",
  vault_aave: "Savings Vault (Aave V3)",
  vault_morpho: "Savings Vault (Morpho / Feather)",
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type AddForm = {
  name: string;
  route: OfframpProvider | "vault" | "vault_aave" | "vault_morpho";
  countryId: string;
  recipientAddress: string;
  recipientDisplay: string;
  defaultAmount: string;
};

const BLANK_FORM: AddForm = {
  name: "",
  route: "minipay",
  countryId: "PH",
  recipientAddress: "",
  recipientDisplay: "",
  defaultAmount: "",
};

type Props = { params: Promise<{ groupId: string }> };

export default function EditGroupPage({ params }: Props) {
  const { groupId } = use(params);
  const isNew = groupId === "new";
  const router = useRouter();

  const [groupName, setGroupName] = useState("");
  const [recipients, setRecipients] = useState<AllocatorRecipient[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<AddForm>(BLANK_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isNew) {
      const g = getGroup(groupId);
      if (g) {
        setGroupName(g.name);
        setRecipients(g.recipients);
      }
    }
  }, [groupId, isNew]);

  const country = getCountryConfig(form.countryId);
  const supportedRoutes = country.supportedOfframps;

  function handleSaveGroup() {
    if (!groupName.trim()) return;
    const group: AllocatorGroup = {
      id: isNew ? makeId() : groupId,
      name: groupName.trim(),
      recipients,
      createdAt: isNew ? Date.now() : (getGroup(groupId)?.createdAt ?? Date.now()),
    };
    upsertGroup(group);
    setSaved(true);
    setTimeout(() => router.push("/allocator"), 600);
  }

  const VALID_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

  function handleAddOrUpdate() {
    if (!form.name.trim()) return;
    const amountNum = parseFloat(form.defaultAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;

    if (form.route !== "fonbnk" && !form.route.startsWith("vault")) {
      const addr = form.recipientAddress.trim();
      if (!addr) return;
      // For minipay, accept resolved 0x addresses only (phone resolution happens in the send flow)
      if (!VALID_ADDRESS.test(addr)) return;
    }

    const recipient: AllocatorRecipient = {
      id: editingId ?? makeId(),
      name: form.name.trim().slice(0, 30),
      route: form.route,
      countryId: form.countryId,
      recipientAddress: (form.route === "fonbnk" || form.route.startsWith("vault")) ? "" : form.recipientAddress.trim(),
      recipientDisplay: form.route === "vault_morpho"
        ? "Savings Vault (Morpho Blue)"
        : (form.route === "vault_aave" || form.route === "vault" ? "Savings Vault (Aave v3)" : (form.route === "fonbnk" ? `Fonbnk (${country.currencyCode})` : (form.recipientDisplay.trim() || form.recipientAddress.trim()))),
      defaultAmount: amountNum.toFixed(6),
    };

    if (editingId) {
      setRecipients((prev) => prev.map((r) => (r.id === editingId ? recipient : r)));
    } else {
      setRecipients((prev) => [...prev, recipient]);
    }

    setForm(BLANK_FORM);
    setShowAdd(false);
    setEditingId(null);
  }

  function handleEdit(r: AllocatorRecipient) {
    const routeMigrated = r.route === "vault" ? "vault_aave" : r.route;
    setForm({
      name: r.name,
      route: routeMigrated as any,
      countryId: r.countryId,
      recipientAddress: r.recipientAddress,
      recipientDisplay: r.recipientDisplay,
      defaultAmount: r.defaultAmount,
    });
    setEditingId(r.id);
    setShowAdd(true);
  }

  function handleRemove(id: string) {
    setRecipients((prev) => prev.filter((r) => r.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setShowAdd(false);
      setForm(BLANK_FORM);
    }
  }

  const canAddRecipient =
    form.name.trim() &&
    (form.route === "fonbnk" || form.route.startsWith("vault") || VALID_ADDRESS.test(form.recipientAddress.trim())) &&
    Number.isFinite(parseFloat(form.defaultAmount)) &&
    parseFloat(form.defaultAmount) > 0;

  return (
    <>
      <header className="app-header">
        <button
          onClick={() => router.push("/allocator")}
          className="btn btn--ghost"
          style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{isNew ? "New Group" : "Edit Group"}</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 120 }}>
        {/* Group name */}
        <div className="input-group">
          <label className="input-label">Group name</label>
          <input
            className="input-field"
            placeholder="e.g. Pamilya, Team Kenya"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            maxLength={40}
          />
        </div>

        {/* Recipients list */}
        <p className="section-title" style={{ marginTop: 20, marginBottom: 10 }}>Recipients</p>

        {recipients.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "20px", marginBottom: 12 }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No recipients yet — add one below.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {recipients.map((r) => (
              <div key={r.id} className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: "var(--surface-raised)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{r.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ROUTE_LABELS[r.route]} · {r.countryId}
                  </p>
                </div>
                <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>${r.defaultAmount}</span>
                <button
                  onClick={() => handleEdit(r)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--text-secondary)" }}
                >
                  <Plus size={16} style={{ transform: "rotate(45deg)" }} />
                </button>
                <button
                  onClick={() => handleRemove(r.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--error)" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit recipient form */}
        {!showAdd ? (
          <button
            className="btn btn--secondary"
            onClick={() => { setShowAdd(true); setEditingId(null); setForm(BLANK_FORM); }}
            style={{ gap: 8, marginBottom: 20 }}
          >
            <Plus size={18} /> Add Recipient
          </button>
        ) : (
          <div className="card" style={{ marginBottom: 20, padding: "16px" }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
              {editingId ? "Edit Recipient" : "Add Recipient"}
            </p>

            <div className="input-group">
              <label className="input-label">Name</label>
              <input
                className="input-field"
                placeholder="e.g. Mama, Personal Savings"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                maxLength={30}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Country</label>
              <select
                className="input-field"
                value={form.countryId}
                onChange={(e) => {
                  const newCountry = getCountryConfig(e.target.value);
                  const firstRoute = newCountry.supportedOfframps[0];
                  setForm((f) => ({ ...f, countryId: e.target.value, route: firstRoute }));
                }}
                style={{ appearance: "none" }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.currencyCode})</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Send via</label>
              <select
                className="input-field"
                value={form.route}
                onChange={(e) => setForm((f) => ({ ...f, route: e.target.value as any }))}
                style={{ appearance: "none" }}
              >
                {supportedRoutes.map((r) => (
                  <option key={r} value={r}>{ROUTE_LABELS[r]}</option>
                ))}
                <option value="vault_aave">Savings Vault (Aave V3)</option>
                <option value="vault_morpho">Savings Vault (Morpho / Feather)</option>
              </select>
            </div>

            {form.route !== "fonbnk" && !form.route.startsWith("vault") && (
              <div className="input-group">
                <label className="input-label">Wallet address (0x...)</label>
                <input
                  className={`input-field${form.recipientAddress && !VALID_ADDRESS.test(form.recipientAddress.trim()) ? " input-field--error" : ""}`}
                  placeholder="0x..."
                  value={form.recipientAddress}
                  onChange={(e) => setForm((f) => ({ ...f, recipientAddress: e.target.value, recipientDisplay: e.target.value }))}
                />
                {form.recipientAddress && !VALID_ADDRESS.test(form.recipientAddress.trim()) && (
                  <p style={{ fontSize: 11, color: "var(--error)", marginTop: 4 }}>Must be a valid 0x wallet address</p>
                )}
              </div>
            )}

            <div className="input-group" style={{ marginBottom: 0 }}>
              <label className="input-label">Default amount (USD)</label>
              <input
                className="input-field"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={form.defaultAmount}
                onChange={(e) => setForm((f) => ({ ...f, defaultAmount: e.target.value }))}
                min="0"
                step="0.01"
              />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                className="btn btn--ghost"
                style={{ flex: 1, padding: "12px" }}
                onClick={() => { setShowAdd(false); setEditingId(null); setForm(BLANK_FORM); }}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary"
                style={{ flex: 2, padding: "12px" }}
                disabled={!canAddRecipient}
                onClick={handleAddOrUpdate}
              >
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </div>
        )}

        {/* Save group */}
        <button
          className="btn btn--primary"
          disabled={!groupName.trim() || saved}
          onClick={handleSaveGroup}
          style={{ gap: 8 }}
        >
          {saved ? <><Check size={18} /> Saved!</> : "Save Group"}
        </button>
      </main>
    </>
  );
}
