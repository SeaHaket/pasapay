"use client";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Edit2, Trash2, Check } from "lucide-react";
import { loadContacts, deleteContact, updateContact, type Contact } from "./RecipientInput";
import { truncateAddress } from "@/lib/celoscan";

type Props = {
  route: string;
  onClose: () => void;
};

export default function ManageContactsModal({ route, onClose }: Props) {
  const t = useTranslations("send");
  const tc = useTranslations("common");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [editingAddr, setEditingAddr] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    // Load contacts filtered by active route
    const all = loadContacts();
    setContacts(all.filter(c => c.route === route));
  }, [route]);

  function handleStartEdit(c: Contact) {
    setEditingAddr(c.address);
    setEditName(c.name || c.display);
  }

  function handleSaveEdit(address: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    updateContact(address, route, trimmed);
    setEditingAddr(null);
    // Reload
    const all = loadContacts();
    setContacts(all.filter(c => c.route === route));
  }

  function handleDelete(address: string) {
    deleteContact(address, route);
    // Reload
    const all = loadContacts();
    setContacts(all.filter(c => c.route === route));
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1001,
      background: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column",
      justifyContent: "flex-end",
    }}>
      <div style={{
        background: "var(--card-bg, #1a202c)",
        borderTop: "1px solid var(--border)",
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: "85vh",
        display: "flex", flexDirection: "column",
        padding: "24px 20px",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.4)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", margin: 0 }}>
              {t("manageContacts")}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0" }}>
              {t("manageContactsDesc")}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "none",
              borderRadius: "50%",
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} color="var(--text)" />
          </button>
        </div>

        {/* Contacts list */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 200, maxHeight: 400, paddingBottom: 16 }}>
          {contacts.length === 0 ? (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-secondary)" }}>
              <p style={{ fontSize: 14, margin: 0 }}>{t("noSavedContacts")}</p>
            </div>
          ) : (
            contacts.map(c => {
              const isEditing = editingAddr === c.address;
              return (
                <div
                  key={c.address}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    marginBottom: 10,
                  }}
                >
                  {/* Left avatar */}
                  <div style={{
                    width: 38, height: 38, borderRadius: "50%",
                    background: "rgba(255, 152, 0, 0.15)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#FF9800", fontWeight: 700, fontSize: 13, flexShrink: 0
                  }}>
                    {c.name ? c.name.slice(0, 2).toUpperCase() : "WA"}
                  </div>

                  {/* Contact info / Edit Input */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <input
                          className="input-field"
                          style={{ flex: 1, padding: "6px 10px", fontSize: 13, margin: 0 }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(c.address); }}
                          autoFocus
                        />
                        <button
                          className="btn btn--primary"
                          style={{ width: "auto", padding: 8, borderRadius: 8 }}
                          onClick={() => handleSaveEdit(c.address)}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="btn btn--ghost"
                          style={{ width: "auto", padding: 8, borderRadius: 8 }}
                          onClick={() => setEditingAddr(null)}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "var(--text)" }}>
                          {c.name || c.display}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                          {truncateAddress(c.address)}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions (if not editing) */}
                  {!isEditing && (
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <button
                        title="Edit name"
                        style={{
                          background: "none", border: "none", padding: 6, cursor: "pointer",
                          color: "var(--text-secondary)", hover: { color: "var(--text)" }
                        } as any}
                        onClick={() => handleStartEdit(c)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        title="Delete contact"
                        style={{
                          background: "none", border: "none", padding: 6, cursor: "pointer",
                          color: "#f87171"
                        }}
                        onClick={() => handleDelete(c.address)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <button
          className="btn btn--secondary"
          onClick={onClose}
          style={{ marginTop: 8 }}
        >
          {tc("close")}
        </button>
      </div>
    </div>
  );
}
