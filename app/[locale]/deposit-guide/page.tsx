"use client";
import { useState, useCallback } from "react";
import {
  ChevronLeft, ChevronDown, ChevronUp, Copy, Check,
  Building2, User, CreditCard, CheckCircle2, RotateCcw,
  Ship, ArrowRight, ClipboardPaste, ExternalLink, Wallet
} from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";

// ─── Copyable Field ────────────────────────────────────────────────────────────

interface CopyableFieldProps {
  label: string;
  value: string;
  note?: string;
}

function CopyableField({ label, value, note }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [value]);

  const isBlank = value.toLowerCase() === "leave blank";

  return (
    <div
      onClick={isBlank ? undefined : handleCopy}
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 14px",
        background: isBlank ? "rgba(255,255,255,0.02)" : "rgba(0,200,83,0.04)",
        borderRadius: 10, cursor: isBlank ? "default" : "pointer",
        border: copied ? "1px solid rgba(0,200,83,0.4)" : "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.2s", gap: 12,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>{label}</p>
        <p style={{ fontSize: 15, fontWeight: isBlank ? 400 : 600, margin: "3px 0 0", color: isBlank ? "var(--text-secondary)" : "var(--text)", fontStyle: isBlank ? "italic" : "normal" }}>{value}</p>
        {note && <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "2px 0 0", fontStyle: "italic" }}>{note}</p>}
      </div>
      {!isBlank && (
        <div style={{ width: 32, height: 32, borderRadius: 8, background: copied ? "rgba(0,200,83,0.2)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
          {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} color="var(--text-secondary)" />}
        </div>
      )}
    </div>
  );
}

// ─── Paste-able Input Field ────────────────────────────────────────────────────

interface PasteFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function PasteField({ label, value, onChange, placeholder }: PasteFieldProps) {
  const [justPasted, setJustPasted] = useState(false);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        onChange(text.trim());
        setJustPasted(true);
        setTimeout(() => setJustPasted(false), 1500);
      }
    } catch {
      // Clipboard API not available — user can type manually
    }
  }, [onChange]);

  // If value is set, show as copyable field
  if (value) {
    return (
      <div style={{ position: "relative" }}>
        <CopyableField label={label} value={value} />
        <button
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          style={{
            position: "absolute", top: 6, right: 6,
            width: 20, height: 20, borderRadius: 4,
            background: "rgba(255,82,82,0.15)", border: "none",
            color: "var(--error)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 800,
          }}
          title="Clear"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "10px 12px",
      background: "var(--surface-raised)",
      borderRadius: 10,
      border: justPasted ? "1px solid rgba(0,200,83,0.4)" : "1px solid var(--border)",
      transition: "all 0.2s",
    }}>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 10, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Paste from MiniPay…"}
          style={{
            width: "100%", background: "none", border: "none", outline: "none",
            color: "var(--text)", fontSize: 14, fontWeight: 600,
            padding: "4px 0 0", fontFamily: "inherit",
          }}
        />
      </div>
      <button
        onClick={handlePaste}
        style={{
          width: 36, height: 36, borderRadius: 8,
          background: "rgba(0,200,83,0.1)", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
        }}
        title="Paste from clipboard"
      >
        <ClipboardPaste size={15} color="var(--green)" />
      </button>
    </div>
  );
}

// ─── Accordion Step ────────────────────────────────────────────────────────────

interface StepConfig {
  number: number;
  title: string;
  description: string;
  content: React.ReactNode;
}

function AccordionStep({ step, isActive, isCompleted, onToggle }: {
  step: StepConfig; isActive: boolean; isCompleted: boolean; onToggle: () => void;
}) {
  return (
    <div style={{
      background: isActive ? "var(--surface-raised)" : "var(--surface)",
      border: isActive ? "1px solid rgba(0,200,83,0.25)" : "1px solid var(--border)",
      borderRadius: 16, overflow: "hidden",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: isActive ? "0 4px 20px rgba(0,200,83,0.1)" : "none",
    }}>
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px",
        background: "none", border: "none", cursor: "pointer", color: "var(--text)", textAlign: "left",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: isCompleted ? "var(--green)" : isActive ? "linear-gradient(135deg, var(--green), #00E676)" : "var(--surface-raised)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          color: isCompleted || isActive ? "#000" : "var(--text-secondary)",
          fontWeight: 800, fontSize: 14, transition: "all 0.3s",
          boxShadow: isActive ? "0 0 12px rgba(0,200,83,0.35)" : "none",
        }}>
          {isCompleted ? <Check size={16} strokeWidth={3} /> : step.number}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: isCompleted ? "var(--green)" : isActive ? "var(--text)" : "var(--text-secondary)" }}>{step.title}</p>
          {!isActive && <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "2px 0 0" }}>{step.description}</p>}
        </div>
        <div style={{ color: "var(--text-secondary)", flexShrink: 0 }}>
          {isActive ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>
      <div style={{ maxHeight: isActive ? 1400 : 0, overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)" }}>
        <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>{step.description}</p>
          {step.content}
        </div>
      </div>
    </div>
  );
}

// ─── Instruction mini-step ─────────────────────────────────────────────────────

function MiniStep({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--green)", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{n}</div>
      <span style={{ fontSize: 13 }}>{children}</span>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,179,0,0.08)", border: "1px solid rgba(255,179,0,0.2)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ fontSize: 12, color: "var(--warning)", margin: 0, lineHeight: 1.5 }}>💡 {children}</p>
    </div>
  );
}

function StepDoneButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      width: "100%", padding: "12px", borderRadius: 10,
      background: "var(--green)", color: "#000", border: "none",
      fontWeight: 700, fontSize: 13, cursor: "pointer",
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
    }}>
      {label} <ArrowRight size={14} />
    </button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function DepositGuidePage() {
  const router = useRouter();
  const { address } = useMiniPay();
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // User-pasted bank details from MiniPay
  const [beneficiary, setBeneficiary] = useState({
    name: "", street: "", city: "", state: "", zip: "",
  });
  const [bank, setBank] = useState({
    name: "", street: "", city: "", state: "", zip: "",
    routing: "", account: "",
  });

  const handleToggle = (i: number) => setActiveStep(activeStep === i ? -1 : i);

  const handleMarkDone = (i: number) => {
    setCompletedSteps((prev) => { const n = new Set(prev); n.add(i); return n; });
    if (i + 1 < steps.length) setActiveStep(i + 1);
  };

  const openMiniPayDeposit = () => {
    // Try deep-link to MiniPay's Add Money screen; fallback to alert
    try {
      // MiniPay runs dApps in a webview — going "back" returns to MiniPay home
      // We can also try the celo:// URI scheme
      window.open("celo://wallet/add", "_blank");
    } catch {
      alert("Go back to your MiniPay home screen and tap \"Add Money\" → \"Bank Transfer\" to see your bank details.");
    }
  };

  // ─── Steps ───────────────────────────────────────────────────────────────────

  const steps: StepConfig[] = [
    {
      number: 1,
      title: "Get Your MiniPay Bank Details",
      description: "Open MiniPay's deposit screen to see your assigned bank account details.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "rgba(0,200,83,0.06)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <MiniStep n="1">Open your <strong>MiniPay</strong> app</MiniStep>
            <MiniStep n="2">Tap <strong>&quot;Add Money&quot;</strong> or <strong>&quot;Deposit&quot;</strong></MiniStep>
            <MiniStep n="3">Select <strong>&quot;Bank Transfer&quot;</strong> as your method</MiniStep>
            <MiniStep n="4">You&apos;ll see your <strong>bank account details</strong> — keep this screen open</MiniStep>
          </div>

          {/* Deep-link button to MiniPay deposit */}
          <button
            onClick={openMiniPayDeposit}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              background: "linear-gradient(135deg, #0a2e1a, #0f3d24)",
              border: "1px solid rgba(0,200,83,0.3)",
              color: "var(--text)", fontWeight: 700, fontSize: 14,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 10,
              boxShadow: "0 0 16px rgba(0,200,83,0.15)",
              transition: "all 0.2s",
            }}
          >
            <Wallet size={18} color="var(--green)" />
            Open MiniPay Deposit Screen
            <ExternalLink size={13} color="var(--text-secondary)" />
          </button>

          {address && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 14px", background: "rgba(0,200,83,0.06)",
              borderRadius: 10, border: "1px solid rgba(0,200,83,0.15)",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: 0, fontWeight: 600, textTransform: "uppercase" }}>Your wallet</p>
                <p style={{ fontSize: 12, color: "var(--text)", margin: "1px 0 0", fontFamily: "monospace", wordBreak: "break-all" }}>{address}</p>
              </div>
            </div>
          )}

          <Tip>
            <strong>Keep MiniPay&apos;s deposit screen open</strong> — you&apos;ll paste the bank details into this guide in the next steps. Then copy them into Brightwell.
          </Tip>

          <StepDoneButton onClick={() => handleMarkDone(0)} label="I can see my bank details" />
        </div>
      ),
    },
    {
      number: 2,
      title: "Add Bank Account in Brightwell",
      description: "Open Brightwell and start adding a new bank account.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "rgba(0,200,83,0.06)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <MiniStep n="1">Log in to the <strong>Brightwell</strong> app</MiniStep>
            <MiniStep n="2">Go to <strong>&quot;Settings&quot;</strong> tab</MiniStep>
            <MiniStep n="3">Tap <strong>&quot;Bank Accounts&quot;</strong>, then the <strong>&quot;+&quot;</strong> button</MiniStep>
          </div>

          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
            Brightwell will ask for Country &amp; Currency. Enter:
          </p>

          <CopyableField label="Country" value="United States of America" />
          <CopyableField label="Currency" value="U.S. Dollar" />

          <Tip>After entering, tap <strong>&quot;Next: Confirm Exchange&quot;</strong> in Brightwell.</Tip>

          <StepDoneButton onClick={() => handleMarkDone(1)} label="Done, what's next?" />
        </div>
      ),
    },
    {
      number: 3,
      title: "Enter Beneficiary Details",
      description: "Paste your details from MiniPay, then copy each field into Brightwell.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,83,0.08), rgba(0,230,118,0.04))",
            borderRadius: 12, padding: "12px 14px",
            border: "1px solid rgba(0,200,83,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ClipboardPaste size={14} color="var(--green)" />
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", margin: 0 }}>Paste from MiniPay</p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Paste each field from your MiniPay deposit screen below. Once pasted, tap any field to copy it into Brightwell.
            </p>
          </div>

          <PasteField label="Recipient full name" value={beneficiary.name} onChange={(v) => setBeneficiary(p => ({ ...p, name: v }))} placeholder="e.g. Juan Dela Cruz" />
          <PasteField label="Recipient street address" value={beneficiary.street} onChange={(v) => setBeneficiary(p => ({ ...p, street: v }))} placeholder="e.g. 123 Main St" />
          <PasteField label="Recipient city" value={beneficiary.city} onChange={(v) => setBeneficiary(p => ({ ...p, city: v }))} placeholder="e.g. Mandaluyong City" />
          <PasteField label="Recipient state or province" value={beneficiary.state} onChange={(v) => setBeneficiary(p => ({ ...p, state: v }))} placeholder="e.g. Metro Manila" />
          <PasteField label="Recipient postal/zip code" value={beneficiary.zip} onChange={(v) => setBeneficiary(p => ({ ...p, zip: v }))} placeholder="e.g. 1550" />
          <CopyableField label="Recipient country" value="Philippines" />
          <CopyableField label="Payment reference" value="Leave blank" />
          <CopyableField label="Recipient phone number" value="Leave blank" />
          <CopyableField label="ID number" value="Leave blank" />
          <CopyableField label="Recipient nature of relationship" value="Self" />

          <StepDoneButton onClick={() => handleMarkDone(2)} label="Done, continue to bank details" />
        </div>
      ),
    },
    {
      number: 4,
      title: "Enter Bank Details",
      description: "Paste the bank info from MiniPay, then copy each field into Brightwell.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,83,0.08), rgba(0,230,118,0.04))",
            borderRadius: 12, padding: "12px 14px",
            border: "1px solid rgba(0,200,83,0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ClipboardPaste size={14} color="var(--green)" />
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--green)", margin: 0 }}>Paste bank details from MiniPay</p>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              These details route your Brightwell wages directly to your MiniPay wallet. Copy them exactly.
            </p>
          </div>

          <PasteField label="Bank name" value={bank.name} onChange={(v) => setBank(p => ({ ...p, name: v }))} placeholder="e.g. Lead Bank" />
          <CopyableField label="Bank branch name" value="Leave blank" />
          <PasteField label="Bank street address" value={bank.street} onChange={(v) => setBank(p => ({ ...p, street: v }))} placeholder="e.g. 1801 Main St" />
          <PasteField label="Bank city" value={bank.city} onChange={(v) => setBank(p => ({ ...p, city: v }))} placeholder="e.g. Kansas City" />
          <PasteField label="Bank state or province" value={bank.state} onChange={(v) => setBank(p => ({ ...p, state: v }))} placeholder="e.g. Missouri" />
          <PasteField label="Bank postal/zip code" value={bank.zip} onChange={(v) => setBank(p => ({ ...p, zip: v }))} placeholder="e.g. 64108" />
          <CopyableField label="Bank country" value="United States" />
          <PasteField label="Bank local routing number" value={bank.routing} onChange={(v) => setBank(p => ({ ...p, routing: v }))} placeholder="e.g. 101019644" />
          <CopyableField label="Bank SWIFT code" value="Leave blank" />
          <CopyableField label="Bank SWIFT branch details" value="Leave blank" />
          <PasteField label="Bank account number / IBAN" value={bank.account} onChange={(v) => setBank(p => ({ ...p, account: v }))} placeholder="e.g. 212102419986" />

          <Tip>
            <strong>Double-check the routing and account numbers</strong> — these are the most critical fields. One wrong digit means your wages won&apos;t arrive.
          </Tip>

          <StepDoneButton onClick={() => handleMarkDone(3)} label="Bank added!" />
        </div>
      ),
    },
    {
      number: 5,
      title: "Confirm It Worked",
      description: "Verify the bank account was added to Brightwell successfully.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ background: "rgba(0,200,83,0.06)", borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <MiniStep n="✓">You should see <strong>&quot;Bank added successfully&quot;</strong> — tap <strong>&quot;OK&quot;</strong></MiniStep>
            <MiniStep n="✓">Go to <strong>&quot;Settings&quot;</strong> → <strong>&quot;Bank Accounts&quot;</strong> to verify it appears</MiniStep>
          </div>
          <StepDoneButton onClick={() => handleMarkDone(4)} label="Confirmed!" />
        </div>
      ),
    },
    {
      number: 6,
      title: "Set Up Recurring Transfers",
      description: "Automate your pay so a portion goes directly to PasaPay every payday.",
      content: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,83,0.08), rgba(0,230,118,0.05))",
            borderRadius: 12, padding: 14, border: "1px solid rgba(0,200,83,0.15)",
          }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", margin: "0 0 8px" }}>🎯 Option A: DirectPay (Recommended)</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              If your Brightwell has <strong>&quot;DirectPay&quot;</strong> under Settings, use it to choose what percentage of your pay goes to your MiniPay account.
            </p>
            <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: 8, padding: "10px 12px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "var(--text)", margin: 0, lineHeight: 1.6 }}>
                💡 <strong>Pro tip:</strong> Most crew send <strong>80%</strong> to MiniPay and keep <strong>20%</strong> on Brightwell for onboard expenses.
              </p>
            </div>
          </div>

          <div style={{ background: "var(--surface-raised)", borderRadius: 12, padding: 14, border: "1px solid var(--border)" }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", margin: "0 0 8px" }}>Option B: Manual Transfer</p>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Tap <strong>&quot;Send Money&quot;</strong> on Brightwell home and select your MiniPay bank account.
            </p>
          </div>

          <Tip>
            Transfers from Brightwell typically take <strong>1 business day</strong>. Brightwell may charge <strong>$0.50–$1</strong> — PasaPay charges <strong>no fee</strong>.
          </Tip>

          <button onClick={() => handleMarkDone(5)} style={{
            width: "100%", padding: "12px", borderRadius: 10,
            background: "var(--green)", color: "#000", border: "none",
            fontWeight: 700, fontSize: 13, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4,
          }}>
            All done! 🎉
          </button>
        </div>
      ),
    },
  ];

  const progressPercent = (completedSteps.size / steps.length) * 100;
  const allDone = completedSteps.size === steps.length;

  return (
    <>
      <header className="app-header">
        <button onClick={() => router.push("/")} className="btn btn--ghost" style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Deposit Guide</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 40 }}>
        {/* Hero Card */}
        <div style={{
          background: "linear-gradient(135deg, #0a2e1a 0%, #0f3d24 50%, #152236 100%)",
          borderRadius: 20, padding: "24px 20px", marginBottom: 20,
          border: "1px solid rgba(0,200,83,0.2)",
          boxShadow: "0 0 24px rgba(0,200,83,0.1)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,200,83,0.15), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, position: "relative" }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: "rgba(0,200,83,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ship size={22} color="var(--green)" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>Deposit from Ship</h2>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>Send your Brightwell wages to PasaPay</p>
            </div>
          </div>
          {/* Progress Bar */}
          <div>
            <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: allDone ? "linear-gradient(90deg, var(--green), #00E676)" : "linear-gradient(90deg, var(--green), #4CAF50)",
                width: `${progressPercent}%`, transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{completedSteps.size} of {steps.length} steps</span>
              <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>{Math.round(progressPercent)}%</span>
            </div>
          </div>
        </div>

        {/* Celebration */}
        {allDone && (
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,83,0.12), rgba(0,230,118,0.06))",
            border: "1px solid rgba(0,200,83,0.3)", borderRadius: 16, padding: "20px", marginBottom: 20, textAlign: "center",
          }}>
            <p style={{ fontSize: 28, margin: "0 0 8px" }}>🎉</p>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "var(--green)", margin: "0 0 6px" }}>You&apos;re All Set!</h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              Your Brightwell wages will now deposit directly into your PasaPay wallet. Start saving with our DeFi vaults to earn yield on your money!
            </p>
          </div>
        )}

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {steps.map((step, i) => (
            <AccordionStep key={i} step={step} isActive={activeStep === i} isCompleted={completedSteps.has(i)} onToggle={() => handleToggle(i)} />
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--surface)", borderRadius: 12, border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6, textAlign: "center" }}>
            Need help? Chat with <strong>Pasa</strong>, your AI Co-pilot, or contact support via <strong>Settings → Support</strong>.
          </p>
        </div>
      </main>
    </>
  );
}
