"use client";
import { useState, useRef, useEffect } from "react";
import { 
  Sparkles, Send, Loader, CheckCircle, AlertCircle, 
  Wallet, X, RefreshCw
} from "lucide-react";
import { useMiniPay } from "@/hooks/useMiniPay";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { CELO_RPC } from "@/lib/constants";
import { loadHistory, getQuickContacts, type QuickContact } from "@/lib/history";
import { getATokenBalance, getFeatherBalance, AUSDT_ADDRESS } from "@/lib/vault";

import { usePathname } from "next/navigation";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  txs?: any[] | null;
}

type TxStepStatus = "idle" | "sending" | "confirmed" | "error";

export default function PasaCopilotWidget() {
  const pathname = usePathname();
  const { address, isMiniPay, balances, sendTransaction } = useMiniPay();

  const [isOpen, setIsOpen] = useState(false);
  const [quickContacts, setQuickContacts] = useState<QuickContact[]>([]);
  const [vaultBalances, setVaultBalances] = useState<{ aave: number; morpho: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setQuickContacts(getQuickContacts(5));
    }
  }, [isOpen]);

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
        console.error("Failed to load vault balances for widget:", err);
      }
    }
    if (address && isOpen) {
      loadVault();
    }
  }, [address, isOpen]);

  // Prevent double rendering if already on the full-page chat route
  if (pathname && pathname.includes("/chat")) return null;
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am Pasa, your PasaPay AI Co-pilot. I can help you check savings vault yields, deposit funds, or review your transaction history. Just ask me!",
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [txStepIndex, setTxStepIndex] = useState<number>(-1);
  const [txStatus, setTxStatus] = useState<TxStepStatus>("idle");
  const [activeTxMsg, setActiveTxMsg] = useState("");
  const [activeError, setActiveError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [messages, isLoading, isOpen]);

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
      // Gather latest transaction history context from localStorage
      const txHistory = loadHistory();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: updatedMessages,
          history: txHistory,
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
    { text: "What is the best APY right now?", label: "📈 APYs" },
    { text: "What was my last transaction?", label: "🕒 Last Tx" },
    { text: "Save 5 USDT into Morpho Blue", label: "💰 Save Morpho" },
  ];

  return (
    <>
      {/* Floating Sparkly Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="text-glow"
        style={{
          position: "fixed",
          bottom: "80px",
          right: "16px",
          width: "56px",
          height: "56px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #00C853 0%, #8B5CF6 100%)",
          color: "#fff",
          border: "none",
          boxShadow: "0 4px 20px rgba(0,200,83,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 9999,
          transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
          transform: isOpen ? "scale(0) rotate(90deg)" : "scale(1) rotate(0)",
        }}
      >
        <Sparkles size={24} style={{ animation: "pulse 2s infinite" }} />
      </button>

      {/* Slide-Up Chat Drawer overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 10000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.25s ease-in-out",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-end",
        }}
        onClick={() => setIsOpen(false)}
      >
        {/* Chat Drawer Container */}
        <div
          style={{
            width: "100%",
            maxWidth: "480px",
            height: "78vh",
            background: "rgba(13, 27, 42, 0.95)",
            backdropFilter: "blur(20px)",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            border: "1px solid rgba(255,255,255,0.08)",
            borderBottom: "none",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
            transform: isOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(0,0,0,0.2)",
              borderTopLeftRadius: "24px",
              borderTopRightRadius: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00C853 0%, #8B5CF6 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={16} color="#fff" />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, letterSpacing: -0.2 }}>Pasa AI</h3>
                <span style={{ fontSize: 10, color: "#00C853", fontWeight: 600 }}>Active Co-pilot</span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.05)",
                border: "none",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages Body */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
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
                    gap: 6,
                  }}
                >
                  {/* Message bubble */}
                  <div
                    style={{
                      background: isUser ? "#00C853" : "rgba(255,255,255,0.05)",
                      color: isUser ? "#000" : "#fff",
                      padding: "12px 16px",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      border: isUser ? "none" : "1px solid rgba(255,255,255,0.05)",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {m.content}
                  </div>

                  {/* Drafted Transaction Cards */}
                  {m.txs && m.txs.length > 0 && (
                    <div
                      style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 12,
                        padding: 14,
                        marginTop: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Wallet size={14} color="#00C853" />
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--text-secondary)" }}>
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
                            stepColor = "#00C853";
                            icon = txStatus === "sending" 
                              ? <Loader size={12} className="spinner" color="#00C853" />
                              : <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00C853" }} />;
                          } else if (isPast) {
                            stepColor = "#00C853";
                            icon = <CheckCircle size={12} color="#00C853" />;
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
                              <span style={{ fontSize: 12.5, color: stepColor, fontWeight: isCurrent ? 700 : 500 }}>
                                {tx.label || "Action"}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {txStepIndex === -1 ? (
                        <button
                          onClick={() => executeTxStep(m.txs!, 0)}
                          className="btn btn--primary"
                          style={{ padding: "10px 14px", fontSize: 13, borderRadius: 10, width: "100%", background: "#00C853", color: "#000" }}
                        >
                          Confirm & Execute
                        </button>
                      ) : (
                        <div style={{ marginTop: 4 }}>
                          {txStatus === "sending" && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#00C853" }}>
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
                                style={{ padding: "6px 12px", fontSize: 11, alignSelf: "flex-start", color: "#00C853", textDecoration: "underline" }}
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
              <div style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "12px 16px", borderRadius: "16px 16px 16px 4px" }}>
                <Loader size={16} className="spinner" color="#00C853" />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pasa is thinking…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions */}
          {messages.length === 1 && !input && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                {SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(s.text)}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      padding: "6px 14px",
                      color: "#fff",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input box */}
          <div
            style={{
              padding: "12px 20px 24px",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type="text"
                placeholder="Ask Pasa to check history or draft transfers…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={isLoading || txStepIndex !== -1}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 24,
                  padding: "12px 48px 12px 16px",
                  color: "#fff",
                  fontSize: 13.5,
                  outline: "none",
                }}
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim() || txStepIndex !== -1}
                style={{
                  position: "absolute",
                  right: 6,
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: input.trim() && !isLoading && txStepIndex === -1 ? "#00C853" : "rgba(255,255,255,0.03)",
                  color: input.trim() && !isLoading && txStepIndex === -1 ? "#000" : "var(--text-secondary)",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
