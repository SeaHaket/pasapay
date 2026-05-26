"use client";
import { useState, useEffect } from "react";
import { ChevronLeft, Plus, Send, Pencil, Trash2, Users } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { loadGroups, deleteGroup, totalAmount, type AllocatorGroup } from "@/lib/allocator";
import { COUNTRIES } from "@/config/countries";

const COUNTRY_FLAGS: Record<string, string> = {
  PH: "🇵🇭", NG: "🇳🇬", KE: "🇰🇪", GH: "🇬🇭", ZA: "🇿🇦",
  UG: "🇺🇬", TZ: "🇹🇿", RW: "🇷🇼", SN: "🇸🇳", CM: "🇨🇲",
  IN: "🇮🇳", ID: "🇮🇩", VN: "🇻🇳", MY: "🇲🇾", TH: "🇹🇭",
  SG: "🇸🇬", KR: "🇰🇷", JP: "🇯🇵", BR: "🇧🇷",
};

function routeBadgeColor(route: string): string {
  if (route === "fonbnk") return "#9C27B0";
  if (route === "localcrypto") return "#FF9800";
  if (route === "minipay") return "var(--green)";
  if (route === "vault") return "#00B0FF";
  return "var(--text-secondary)";
}

export default function AllocatorPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<AllocatorGroup[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    setGroups(loadGroups());
  }, []);

  function handleDelete(id: string) {
    deleteGroup(id);
    setGroups(loadGroups());
    setConfirmDelete(null);
  }

  return (
    <>
      <header className="app-header">
        <button
          onClick={() => router.push("/")}
          className="btn btn--ghost"
          style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Allocator</h1>
        <Link
          href="/allocator/new"
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "var(--green)", display: "flex", alignItems: "center",
            justifyContent: "center", color: "#000", flexShrink: 0,
          }}
        >
          <Plus size={20} />
        </Link>
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 100 }}>
        {groups.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, gap: 16, textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--surface)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={32} color="var(--text-secondary)" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No groups yet</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
                Create a group to send to<br />multiple people at once.
              </p>
            </div>
            <Link href="/allocator/new" className="btn btn--primary" style={{ width: "auto", padding: "14px 28px" }}>
              Create First Group
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groups.map((group) => {
              const total = totalAmount(group);
              const flags = [...new Set(group.recipients.map((r) => COUNTRY_FLAGS[r.countryId]).filter(Boolean))];

              return (
                <div key={group.id} className="card" style={{ padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <p style={{ fontWeight: 700, fontSize: 16, margin: 0 }}>{group.name}</p>
                        {flags.length > 0 && (
                          <span style={{ fontSize: 16 }}>{flags.join(" ")}</span>
                        )}
                      </div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
                        {group.recipients.length} recipient{group.recipients.length !== 1 ? "s" : ""} · ${total.toFixed(2)} total
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Link
                        href={`/allocator/${group.id}`}
                        style={{
                          width: 34, height: 34, borderRadius: 8, background: "var(--surface-raised)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--text-secondary)",
                        }}
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => setConfirmDelete(group.id)}
                        style={{
                          width: 34, height: 34, borderRadius: 8, background: "rgba(255,82,82,0.1)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: "var(--error)", border: "none", cursor: "pointer",
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Recipients preview */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                    {group.recipients.map((r) => (
                      <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "var(--surface-raised)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "var(--text)", flexShrink: 0,
                        }}>
                          {r.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{r.name}</span>
                        <span style={{ fontSize: 11, borderRadius: 4, padding: "2px 6px", background: "var(--surface-raised)", color: routeBadgeColor(r.route), fontWeight: 600, flexShrink: 0 }}>
                          {r.route}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>${r.defaultAmount}</span>
                      </div>
                    ))}
                  </div>

                  {group.recipients.length > 0 && (
                    <Link
                      href={`/allocator/${group.id}/send`}
                      className="btn btn--primary"
                      style={{ gap: 8 }}
                    >
                      <Send size={16} />
                      Send to {group.name}
                    </Link>
                  )}

                  {confirmDelete === group.id && (
                    <div style={{ marginTop: 10, padding: "12px", background: "rgba(255,82,82,0.08)", borderRadius: 10, border: "1px solid rgba(255,82,82,0.2)" }}>
                      <p style={{ fontSize: 13, color: "var(--error)", marginBottom: 10 }}>Delete "{group.name}"?</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn--ghost" style={{ flex: 1, padding: "10px" }} onClick={() => setConfirmDelete(null)}>
                          Cancel
                        </button>
                        <button className="btn btn--danger" style={{ flex: 1, padding: "10px" }} onClick={() => handleDelete(group.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
