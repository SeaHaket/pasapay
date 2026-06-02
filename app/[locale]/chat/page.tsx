"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  ChevronLeft, Send, Sparkles, Loader, CheckCircle, AlertCircle, 
  TrendingUp, Wallet, ArrowRightLeft, PiggyBank, Home, Send as SendIcon, Clock
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { CELO_RPC } from "@/lib/constants";
import { loadHistory, getQuickContacts, type QuickContact } from "@/lib/history";
import { getATokenBalance, getFeatherBalance, AUSDT_ADDRESS } from "@/lib/vault";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  txs?: any[] | null;
}

type TxStepStatus = "idle" | "sending" | "confirmed" | "error";

export default function ChatPage() {
  const router = useRouter();
  const tc = useTranslations("common");
  const te = useTranslations("errors");
  const { address, isMiniPay, balances, sendTransaction } = useMiniPay();

  const [quickContacts, setQuickContacts] = useState<QuickContact[]>([]);
  const [vaultBalances, setVaultBalances] = useState<{ aave: number; morpho: number } | null>(null);
  const [input, setInput] = useState("");

  useEffect(() => {
    setQuickContacts(getQuickContacts(5));
  }, []);

  useEffect(() => {
    async function loadVault() {
      if (!address) return;
      try {
        const [aaveRaw, morphoRaw] = await Promise.all([
          getATokenBalance(AUSDT_ADDRESS, address),
          getFeatherBalance(address),
        ]);
        setVaultBalances({
          aave: Number(aaveRaw) / 1e6,
          morpho: Number(morphoRaw) / 1e6,
        });
      } catch (err) {
        console.error("Failed to load vault balances for page:", err);
      }
    }
    if (address) {
      loadVault();
    }
  }, [address]);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your PasaPay AI Co-pilot. I can help you check live savings yields, deposit into vaults, or transfer stablecoins to other users. What would you like to do today?",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [txStepIndex, setTxStepIndex] = useState<number>(-1);
  const [txStatus, setTxStatus] = useState<TxStepStatus>("idle");
  const [activeTxMsg, setActiveTxMsg] = useState("");
  const [activeError, setActiveError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSuggestion = (text: string) => {
    setInput(text);
  };

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput("");
    setIsLoading(true);
    setActiveError(null);

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: updatedMessages,
          history: loadHistory(),
          walletAddress: address,
          balances: balances,
          quickContacts: quickContacts,
          vaultBalances: vaultBalances
        }),
      });

      if (!res.ok) throw new Error("Failed to contact assistant");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: data.content,
          txs: data.txs,
        }
      ]);

      // If new transactions were drafted, reset the execution steps
      if (data.txs && data.txs.length > 0) {
        setTxStepIndex(0);
        setTxStatus("idle");
        setActiveTxMsg("");
      } else {
        setTxStepIndex(-1);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          content: "Sorry, I encountered an error processing that request. Please verify your connection and try again.",
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to replace placeholder address in generated transaction data with active wallet
  const prepareTransaction = (tx: any) => {
    if (!address) return tx;
    const userAddressHex = address.toLowerCase().substring(2);
    // Replace hex placeholder (lower-case 0x8888...) in the calldata
    const cleanedData = tx.data.toLowerCase().replaceAll("8888888888888888888888888888888888888888", userAddressHex);
    return {
      to: tx.to as `0x${string}`,
      data: cleanedData as `0x${string}`,
      feeCurrency: tx.feeCurrency as `0x${string}`,
    };
  };

  const executeTxStep = async (txs: any[], index: number) => {
    if (!address) {
      setActiveError("Wallet not connected");
      return;
    }

    setTxStepIndex(index);
    setTxStatus("sending");
    setActiveError(null);
    const tx = txs[index];
    setActiveTxMsg(`Triggering: ${tx.label || "Transaction"}…`);

    try {
      const prepared = prepareTransaction(tx);
      const hash = await sendTransaction({
        to: prepared.to,
        data: prepared.data,
        feeCurrency: prepared.feeCurrency,
      });

      setActiveTxMsg("Confirming transaction on-chain…");
      const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60_000 });

      setTxStatus("confirmed");
      setActiveTxMsg("Confirmed!");

      // If there are more steps, wait briefly and trigger next step index
      if (index + 1 < txs.length) {
        setTimeout(() => {
          executeTxStep(txs, index + 1);
        }, 1500);
      } else {
        // All transactions completed successfully!
        setTimeout(() => {
          setTxStepIndex(-1);
          setMessages((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              role: "assistant",
              content: "✨ Fantastic! All drafted transactions have been executed successfully on Celo.",
            }
          ]);
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setTxStatus("error");
      setActiveError(err?.message || "Transaction failed — please try again");
    }
  };

  const SUGGESTIONS = [
    { text: "What is the best APY right now?", label: "📈 Show APYs" },
    { text: "Save 5 USDT into Morpho Blue", label: "💰 Deposit Morpho" },
    { text: "Withdraw 2 USDT from Aave", label: "🏦 Withdraw Aave" },
  ];

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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} className="text-glow" style={{ color: "var(--green)" }} />
          <h1 style={{ fontSize: 18, fontWeight: 700 }}>AI Co-pilot</h1>
        </div>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 160, display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
        {/* Messages container */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((m) => {
            const isUser = m.role === "user";
            return (
              <div 
                key={m.id} 
                style={{
                  alignSelf: isUser ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                {/* Message bubble */}
                <div 
                  style={{
                    background: isUser ? "var(--green)" : "var(--surface-raised)",
                    color: isUser ? "#000" : "var(--text)",
                    padding: "12px 16px",
                    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    border: isUser ? "none" : "1px solid var(--border)",
                    whiteSpace: "pre-line"
                  }}
                >
                  {m.content}
                </div>

                {/* Drafted Transaction Cards */}
                {m.txs && m.txs.length > 0 && (
                  <div 
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      padding: 14,
                      marginTop: 4,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Wallet size={16} color="var(--green)" />
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
                        Drafted Transactions
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {m.txs.map((tx: any, idx: number) => {
                        const isCurrent = txStepIndex === idx;
                        const isPast = txStepIndex > idx || (txStepIndex === -1 && txStatus === "confirmed");
                        
                        let stepColor = "var(--text-secondary)";
                        let icon = <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--text-secondary)" }} />;

                        if (isCurrent) {
                          stepColor = "var(--green)";
                          icon = txStatus === "sending" 
                            ? <Loader size={12} className="spinner" color="var(--green)" />
                            : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />;
                        } else if (isPast) {
                          stepColor = "var(--green)";
                          icon = <CheckCircle size={12} color="var(--green)" />;
                        }

                        return (
                          <div 
                            key={idx} 
                            style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              gap: 10,
                              background: isCurrent ? "rgba(0,200,83,0.05)" : "rgba(255,255,255,0.02)",
                              padding: "8px 12px",
                              borderRadius: 8,
                              border: isCurrent ? "1px solid rgba(0,200,83,0.2)" : "1px solid transparent"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 16 }}>
                              {icon}
                            </div>
                            <span style={{ fontSize: 13, color: stepColor, fontWeight: isCurrent ? 700 : 500 }}>
                              {tx.label || "Action"}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Progress indicators / Action trigger */}
                    {txStepIndex === -1 ? (
                      <button
                        onClick={() => executeTxStep(m.txs!, 0)}
                        className="btn btn--primary"
                        style={{ padding: "10px 14px", fontSize: 13, borderRadius: 10, width: "100%", background: "var(--green)", color: "#000" }}
                      >
                        Confirm & Execute
                      </button>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        {txStatus === "sending" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)" }}>
                            <Loader size={14} className="spinner" />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{activeTxMsg}</span>
                          </div>
                        )}
                        {txStatus === "error" && activeError && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "var(--error)" }}>
                              <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                              <span style={{ fontSize: 12, fontWeight: 600 }}>{activeError}</span>
                            </div>
                            <button
                              onClick={() => executeTxStep(m.txs!, txStepIndex)}
                              className="btn btn--ghost"
                              style={{ padding: "6px 12px", fontSize: 11, alignSelf: "flex-start", color: "var(--green)", textDecoration: "underline" }}
                            >
                              Retry step
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: "var(--surface-raised)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: "16px 16px 16px 4px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
              <Loader size={16} className="spinner" color="var(--green)" />
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>AI is thinking…</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Floating suggestion starters (only show when no message input and welcome) */}
        {messages.length === 1 && !input && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: 0, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Suggested Queries
            </p>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(s.text)}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 20,
                    padding: "8px 16px",
                    color: "var(--text)",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s"
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input box */}
        <div style={{ padding: "12px 16px", background: "var(--background)", borderTop: "1px solid var(--border)", position: "fixed", bottom: 64, left: 0, right: 0 }}>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Ask anything or request a transfer/deposit…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading || txStepIndex !== -1}
              style={{
                width: "100%",
                background: "var(--surface-raised)",
                border: "1px solid var(--border)",
                borderRadius: 24,
                padding: "14px 48px 14px 18px",
                color: "var(--text)",
                fontSize: 14,
                outline: "none",
                transition: "border 0.2s"
              }}
            />
            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim() || txStepIndex !== -1}
              style={{
                position: "absolute",
                right: 6,
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: input.trim() && !isLoading && txStepIndex === -1 ? "var(--green)" : "rgba(255,255,255,0.05)",
                color: input.trim() && !isLoading && txStepIndex === -1 ? "#000" : "var(--text-secondary)",
                border: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s"
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Nav */}
      <nav className="bottom-nav">
        <Link href="/" className="bottom-nav__item">
          <span className="bottom-nav__icon"><Home size={22} /></span>
          <span>{tc("home")}</span>
        </Link>
        <Link href="/send" className="bottom-nav__item">
          <span className="bottom-nav__icon"><SendIcon size={22} /></span>
          <span>{tc("send")}</span>
        </Link>
        <Link href="/chat" className="bottom-nav__item bottom-nav__item--active">
          <span className="bottom-nav__icon"><Sparkles size={22} color="var(--green)" /></span>
          <span>Co-pilot</span>
        </Link>
        <Link href="/vault" className="bottom-nav__item">
          <span className="bottom-nav__icon"><PiggyBank size={22} /></span>
          <span>Vault</span>
        </Link>
        <Link href="/history" className="bottom-nav__item">
          <span className="bottom-nav__icon"><Clock size={22} /></span>
          <span>{tc("history")}</span>
        </Link>
      </nav>
    </>
  );
}
