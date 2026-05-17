"use client";
import { useState, useEffect, use } from "react";
import { ChevronLeft, Send, ExternalLink, CheckCircle, Loader } from "lucide-react";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { useRouter } from "@/i18n/navigation";
import { getGroup, type AllocatorGroup, type AllocatorRecipient } from "@/lib/allocator";
import { useMiniPay } from "@/hooks/useMiniPay";
import { getCountryConfig } from "@/config/countries";
import { saveTransaction } from "@/lib/history";
import { PASAPAY_FEE_ADDRESS, FONBNK_APP_FEE, CELO_RPC } from "@/lib/constants";

type SendStatus = "idle" | "sending" | "done" | "error";

type RecipientState = {
  recipient: AllocatorRecipient;
  amount: string;
  status: "pending" | "sending" | "done" | "error" | "manual";
  error?: string;
};

type Props = { params: Promise<{ groupId: string }> };

export default function AllocatorSendPage({ params }: Props) {
  const { groupId } = use(params);
  const router = useRouter();
  const { address, preferred, sendTransaction, refreshBalances } = useMiniPay();

  const [group, setGroup] = useState<AllocatorGroup | null>(null);
  const [rows, setRows] = useState<RecipientState[]>([]);
  const [overallStatus, setOverallStatus] = useState<SendStatus>("idle");
  const [currentStep, setCurrentStep] = useState("");

  useEffect(() => {
    const g = getGroup(groupId);
    if (!g) { router.push("/allocator"); return; }
    setGroup(g);
    setRows(g.recipients.map((r) => ({ recipient: r, amount: r.defaultAmount, status: "pending" })));
  }, [groupId]);

  const cryptoRows = rows.filter((r) => r.recipient.route === "minipay");
  const externalRows = rows.filter((r) => r.recipient.route !== "minipay");

  const allCryptoDone = cryptoRows.every((r) => r.status === "done" || r.status === "error");
  const totalUsd = rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  function updateRow(id: string, patch: Partial<RecipientState>) {
    setRows((prev) => prev.map((r) => (r.recipient.id === id ? { ...r, ...patch } : r)));
  }

  const VALID_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

  async function handleSendCrypto() {
    if (!address || !preferred) return;
    setOverallStatus("sending");

    const { decimals, symbol, feeCurrency, address: tokenAddress } = preferred;

    for (const row of cryptoRows) {
      if (row.status === "done") continue;
      const amountNum = parseFloat(row.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        updateRow(row.recipient.id, { status: "error", error: "Invalid amount" });
        continue;
      }
      if (!VALID_ADDRESS.test(row.recipient.recipientAddress)) {
        updateRow(row.recipient.id, { status: "error", error: "Invalid wallet address" });
        continue;
      }

      updateRow(row.recipient.id, { status: "sending" });
      setCurrentStep(`Sending to ${row.recipient.name}…`);

      try {
        const amountRaw = parseUnits(amountNum.toFixed(decimals), decimals);
        const data = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [row.recipient.recipientAddress as `0x${string}`, amountRaw],
        });
        const hash = await sendTransaction({
          to: tokenAddress as `0x${string}`,
          data,
          feeCurrency: feeCurrency as `0x${string}`,
        });

        const country = getCountryConfig(row.recipient.countryId);
        saveTransaction({
          timestamp: Date.now(),
          hash,
          chain: "celo",
          amount: row.amount,
          tokenSymbol: symbol,
          route: row.recipient.route,
          recipientDisplay: row.recipient.name,
          recipientAddress: row.recipient.recipientAddress,
          countryId: row.recipient.countryId,
          currencyCode: country.currencyCode,
          currencySymbol: country.currencySymbol,
          fiatEstimate: "",
        });

        updateRow(row.recipient.id, { status: "done" });
      } catch (err: any) {
        updateRow(row.recipient.id, { status: "error", error: err?.message ?? "Transaction failed" });
      }
    }

    await refreshBalances();
    setCurrentStep("");
    setOverallStatus("done");
  }

  async function handleFonbnkSend(row: RecipientState) {
    if (!address || !preferred) return;
    updateRow(row.recipient.id, { status: "sending" });

    const country = getCountryConfig(row.recipient.countryId);

    if (PASAPAY_FEE_ADDRESS) {
      try {
        const { createPublicClient, http: httpTransport } = await import("viem");
        const { celo: celoChain } = await import("viem/chains");
        const publicClient = createPublicClient({ chain: celoChain, transport: httpTransport(CELO_RPC) });

        const feeRaw = parseUnits(FONBNK_APP_FEE, preferred.decimals);
        const feeData = encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [PASAPAY_FEE_ADDRESS, feeRaw],
        });
        const feeHash = await sendTransaction({
          to: preferred.address as `0x${string}`,
          data: feeData,
          feeCurrency: preferred.feeCurrency as `0x${string}`,
        });
        await publicClient.waitForTransactionReceipt({ hash: feeHash as `0x${string}`, timeout: 60_000 });
      } catch (err: any) {
        updateRow(row.recipient.id, { status: "error", error: err?.message ?? "Fee payment failed" });
        return;
      }
    }

    saveTransaction({
      timestamp: Date.now(),
      hash: "fonbnk",
      chain: "celo",
      amount: row.amount,
      tokenSymbol: preferred.symbol,
      route: "fonbnk",
      recipientDisplay: `Fonbnk (${country.currencyCode})`,
      recipientAddress: "",
      countryId: row.recipient.countryId,
      currencyCode: country.currencyCode,
      currencySymbol: country.currencySymbol,
      fiatEstimate: "",
    });

    updateRow(row.recipient.id, { status: "manual" });
    const { openFonbnk } = await import("@/lib/fonbnk");
    openFonbnk(address, country.currencyCode);
  }

  function handleExternalSend(row: RecipientState) {
    sessionStorage.setItem(
      "pp_quicksend",
      JSON.stringify({
        recipientAddress: row.recipient.recipientAddress,
        recipientDisplay: row.recipient.name,
        countryId: row.recipient.countryId,
        route: row.recipient.route,
      }),
    );
    router.push("/send");
  }

  if (!group) return null;

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
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>{group.name}</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 120 }}>
        {/* Summary card */}
        <div className="card card--green" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Total sending</p>
          <p style={{ fontSize: 32, fontWeight: 800 }}>${totalUsd.toFixed(2)} <span style={{ fontSize: 16, fontWeight: 400, color: "var(--text-secondary)" }}>{preferred?.symbol}</span></p>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{rows.length} recipient{rows.length !== 1 ? "s" : ""}</p>
        </div>

        {/* MiniPay direct sends */}
        {cryptoRows.length > 0 && (
          <>
            <p className="section-title" style={{ marginBottom: 10 }}>Direct Sends</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {cryptoRows.map((row) => (
                <RecipientRow
                  key={row.recipient.id}
                  row={row}
                  onChange={(val) => updateRow(row.recipient.id, { amount: val })}
                  disabled={overallStatus === "sending"}
                />
              ))}
            </div>

            {!allCryptoDone ? (
              <button
                className="btn btn--primary"
                onClick={handleSendCrypto}
                disabled={overallStatus === "sending" || !preferred}
                style={{ marginBottom: 20, gap: 8 }}
              >
                {overallStatus === "sending"
                  ? <><span className="spinner" /> {currentStep}</>
                  : <><Send size={16} /> Send All Direct</>}
              </button>
            ) : (
              <div className="card" style={{ marginBottom: 20, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, borderColor: "rgba(0,200,83,0.3)" }}>
                <CheckCircle size={18} color="var(--green)" />
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--green)", margin: 0 }}>All direct sends complete</p>
              </div>
            )}
          </>
        )}

        {/* Fonbnk / external sends */}
        {externalRows.length > 0 && (
          <>
            <p className="section-title" style={{ marginBottom: 10 }}>Manual Sends</p>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
              These routes open an external provider — tap each button to complete.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {externalRows.map((row) => {
                const isFonbnk = row.recipient.route === "fonbnk";
                const country = getCountryConfig(row.recipient.countryId);

                return (
                  <div key={row.recipient.id} className="card" style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%", background: "var(--surface-raised)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 700, flexShrink: 0,
                      }}>
                        {row.recipient.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{row.recipient.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0" }}>
                          {isFonbnk ? `Fonbnk · ${country.currencyCode}` : `${row.recipient.route} · ${row.recipient.countryId}`}
                        </p>
                      </div>
                      <div>
                        <input
                          type="number"
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) => updateRow(row.recipient.id, { amount: e.target.value })}
                          disabled={row.status === "sending" || row.status === "done" || row.status === "manual"}
                          style={{
                            width: 80, padding: "6px 10px", borderRadius: 8,
                            background: "var(--surface-raised)", border: "1px solid var(--border)",
                            color: "var(--text)", fontSize: 14, fontWeight: 700, textAlign: "right",
                          }}
                        />
                        <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 4 }}>USD</span>
                      </div>
                    </div>

                    {row.status === "done" || row.status === "manual" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                        <CheckCircle size={16} color="var(--green)" />
                        <span style={{ fontSize: 13, color: "var(--green)", fontWeight: 600 }}>
                          {row.status === "manual" ? "Fonbnk opened — complete in app" : "Sent"}
                        </span>
                      </div>
                    ) : row.status === "error" ? (
                      <div>
                        <p style={{ fontSize: 12, color: "var(--error)", marginBottom: 8 }}>{row.error}</p>
                        <button
                          className="btn btn--secondary"
                          style={{ padding: "10px", fontSize: 13 }}
                          onClick={() => isFonbnk ? handleFonbnkSend(row) : handleExternalSend(row)}
                        >
                          Retry
                        </button>
                      </div>
                    ) : row.status === "sending" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                        <Loader size={16} color="var(--text-secondary)" style={{ animation: "spin 1s linear infinite" }} />
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Processing…</span>
                      </div>
                    ) : (
                      <button
                        className="btn btn--secondary"
                        style={{ padding: "10px", fontSize: 13, gap: 8 }}
                        onClick={() => isFonbnk ? handleFonbnkSend(row) : handleExternalSend(row)}
                      >
                        <ExternalLink size={14} />
                        {isFonbnk ? `Open Fonbnk for ${row.recipient.name}` : `Send via ${row.recipient.route}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </>
  );
}

function RecipientRow({
  row,
  onChange,
  disabled,
}: {
  row: RecipientState;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="card" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%", background: "var(--surface-raised)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {row.recipient.name.slice(0, 2).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>{row.recipient.name}</p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {row.recipient.recipientDisplay}
        </p>
      </div>

      {row.status === "done" ? (
        <CheckCircle size={20} color="var(--green)" style={{ flexShrink: 0 }} />
      ) : row.status === "sending" ? (
        <Loader size={20} color="var(--text-secondary)" style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} />
      ) : row.status === "error" ? (
        <span style={{ fontSize: 11, color: "var(--error)", flexShrink: 0 }}>Failed</span>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <input
            type="number"
            inputMode="decimal"
            value={row.amount}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            style={{
              width: 72, padding: "6px 10px", borderRadius: 8,
              background: "var(--surface-raised)", border: "1px solid var(--border)",
              color: "var(--text)", fontSize: 14, fontWeight: 700, textAlign: "right",
            }}
          />
          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>USD</span>
        </div>
      )}
    </div>
  );
}
