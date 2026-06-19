"use client";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { 
  ChevronLeft, Send, Sparkles, Loader, CheckCircle, AlertCircle, 
  TrendingUp, Wallet, ArrowRightLeft, PiggyBank, Home, Send as SendIcon, Clock, Trash2,
  ShieldCheck, Star, Activity, Award, X, ExternalLink, Lock, Zap
} from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import { createPublicClient, http, encodeFunctionData, parseUnits, erc20Abi } from "viem";
import { celo } from "viem/chains";
import { CELO_RPC, USDT_FEE_CURRENCY, USDT_ADDRESS } from "@/lib/constants";
import { loadHistory, getQuickContacts, type QuickContact } from "@/lib/history";
import { getATokenBalance, getFeatherBalance, AUSDT_ADDRESS } from "@/lib/vault";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { getCountryConfig } from "@/config/countries";
import { getAgentReputation, type AgentReputationSummary } from "@/lib/agent-trust";
import { AGENT_ID_MAINNET, REPUTATION_REGISTRY_MAINNET, REPUTATION_REGISTRY_ABI } from "@/config/agent";

interface PaywallInfo {
  price: string;
  currency: string;
  destination: string;
  originalText: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  txs?: any[] | null;
  paywall?: PaywallInfo | null;
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

  const [reputation, setReputation] = useState<AgentReputationSummary | null>(null);
  const [showTrustModal, setShowTrustModal] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    async function loadRep() {
      try {
        const rep = await getAgentReputation(AGENT_ID_MAINNET);
        setReputation(rep);
      } catch (err) {
        console.error("Failed to load reputation summary:", err);
      }
    }
    loadRep();
  }, []);

  const submitFeedback = async (rating: number) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const data = encodeFunctionData({
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "giveFeedback",
        args: [
          BigInt(AGENT_ID_MAINNET),
          BigInt(rating),
          0,
          "starred",
          "",
          "",
          "",
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        ]
      });

      const hash = await sendTransaction({
        to: REPUTATION_REGISTRY_MAINNET,
        data,
        feeCurrency: USDT_FEE_CURRENCY,
      });

      const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60_000 });

      const updated = await getAgentReputation(AGENT_ID_MAINNET);
      setReputation(updated);
      alert("Thank you! Star rating submitted on Celo Mainnet.");
      setShowTrustModal(false);
    } catch (err: any) {
      console.error(err);
      alert("Feedback transaction failed: " + (err.message || err));
    } finally {
      setSubmittingFeedback(false);
    }
  };

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

  const [countryId, setCountryId] = useState("PH");
  useEffect(() => {
    const saved = localStorage.getItem("pp_country");
    if (saved) setCountryId(saved);
  }, []);

  const country = getCountryConfig(countryId);
  const { rate: exchangeRate } = useExchangeRate(country.currencyCode);
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

  const handleClearChat = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I am your PasaPay AI Co-pilot. I can help you check live savings yields, deposit into vaults, or transfer stablecoins to other users. What would you like to do today?",
      }
    ]);
    setTxStepIndex(-1);
    setTxStatus("idle");
    setActiveTxMsg("");
    setActiveError(null);
    setInput("");
  };

  const handleSend = async (textToSend?: string, paymentTxHash?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) setInput("");
    setIsLoading(true);
    setActiveError(null);

    // Only add a user message bubble if this is NOT a payment retry
    let updatedMessages: Message[];
    if (!paymentTxHash) {
      const userMsg: Message = {
        id: Math.random().toString(),
        role: "user",
        content: text,
      };
      updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);
    } else {
      updatedMessages = messages;
    }

    try {
      const baseUrl = typeof window !== "undefined" && window.location.origin && !window.location.origin.startsWith("minipay") && !window.location.origin.startsWith("file")
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "";

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (paymentTxHash) {
        headers["x-payment-tx"] = paymentTxHash;
      }

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          messages: updatedMessages,
          history: loadHistory(),
          walletAddress: address,
          balances: balances.map(b => ({ ...b, raw: b.raw.toString() })),
          quickContacts: quickContacts,
          vaultBalances: vaultBalances,
          exchangeRate: exchangeRate,
          currencyCode: country.currencyCode
        }),
      });

      // x402: Handle 402 Payment Required
      if (res.status === 402) {
        const payData = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: "assistant",
            content: "",
            paywall: {
              price: payData.price || "0.05",
              currency: payData.currency || "USDT",
              destination: payData.destination || "0x3cbf3d4442d1c87498c36484E0228eE1dbc95EC0",
              originalText: text,
            }
          }
        ]);
        setIsLoading(false);
        return;
      }

      if (!res.ok) throw new Error("Failed to contact assistant");

      const data = await res.json();

      // If retrying after payment, remove the paywall message first
      if (paymentTxHash) {
        setMessages((prev) => {
          const cleaned = prev.filter(m => !m.paywall);
          return [
            ...cleaned,
            {
              id: Math.random().toString(),
              role: "assistant" as const,
              content: data.content,
              txs: data.txs,
            }
          ];
        });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: "assistant",
            content: data.content,
            txs: data.txs,
          }
        ]);
      }

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

  const [payingForQuery, setPayingForQuery] = useState(false);

  const handlePayAndRetry = async (paywall: PaywallInfo) => {
    if (!address) {
      alert("Please connect your wallet first");
      return;
    }
    setPayingForQuery(true);
    try {
      const amountRaw = parseUnits(paywall.price, 6);
      const data = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [paywall.destination as `0x${string}`, amountRaw]
      });

      const hash = await sendTransaction({
        to: USDT_ADDRESS as `0x${string}`,
        data,
        feeCurrency: USDT_FEE_CURRENCY,
      });

      const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
      await publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}`, timeout: 60_000 });

      // Retry the original query with the payment tx hash
      await handleSend(paywall.originalText, hash);
    } catch (err: any) {
      console.error("x402 payment failed:", err);
      alert("Payment failed: " + (err.message || err));
    } finally {
      setPayingForQuery(false);
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
    { text: "Predict Aave yield next month", label: "🔮 Premium Forecast" },
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
        <button
          onClick={handleClearChat}
          className="btn btn--ghost"
          style={{ width: 40, height: 40, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}
          title="Clear Chat"
        >
          <Trash2 size={20} />
        </button>
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 160, display: "flex", flexDirection: "column", height: "calc(100vh - 120px)" }}>
        {/* On-chain Trust Badge */}
        <div 
          onClick={() => setShowTrustModal(true)}
          style={{
            background: "rgba(0, 200, 83, 0.08)",
            border: "1px solid rgba(0, 200, 83, 0.15)",
            borderRadius: 12,
            margin: "8px 16px 4px 16px",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: "pointer",
            fontSize: 13,
            color: "var(--text)",
            flexShrink: 0
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShieldCheck size={16} color="var(--green)" />
            <span style={{ fontWeight: 600 }}>On-chain Trust Score</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Star size={13} fill="var(--green)" color="var(--green)" />
              <span style={{ fontWeight: 700 }}>
                {reputation ? reputation.averageRating.toFixed(1) : "5.0"}
              </span>
              <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>
                ({reputation ? reputation.count : 0} reviews)
              </span>
            </div>
            <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 12 }}>INFO</span>
          </div>
        </div>

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

                {/* x402 Paywall Card */}
                {m.paywall && (
                  <div 
                    style={{
                      background: "linear-gradient(135deg, rgba(255,193,7,0.08), rgba(255,152,0,0.06))",
                      border: "1px solid rgba(255,193,7,0.25)",
                      borderRadius: 16,
                      padding: 20,
                      marginTop: 6,
                      display: "flex",
                      flexDirection: "column",
                      gap: 14
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "rgba(255,193,7,0.15)",
                        display: "flex", alignItems: "center", justifyContent: "center"
                      }}>
                        <Lock size={18} color="#FFC107" />
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>Premium Insight</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>This query requires a micropayment</p>
                      </div>
                    </div>

                    <div style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.15)",
                      borderRadius: 10,
                      padding: "10px 14px"
                    }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Cost</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: "#FFC107" }}>${m.paywall.price}</span>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{m.paywall.currency}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePayAndRetry(m.paywall!)}
                      disabled={payingForQuery || !address}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: payingForQuery ? "rgba(255,193,7,0.3)" : "linear-gradient(135deg, #FFC107, #FF9800)",
                        color: "#000",
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: payingForQuery ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        transition: "all 0.2s",
                        opacity: !address ? 0.5 : 1
                      }}
                    >
                      {payingForQuery ? (
                        <>
                          <Loader size={14} className="spinner" />
                          Processing Payment…
                        </>
                      ) : (
                        <>
                          <Zap size={14} />
                          {address ? "Pay & Unlock" : "Connect Wallet to Unlock"}
                        </>
                      )}
                    </button>

                    <p style={{ margin: 0, fontSize: 10, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.4 }}>
                      Powered by x402 · Payment sent on Celo Mainnet
                    </p>
                  </div>
                )}

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

      {/* Trust & Reputation Modal */}
      {showTrustModal && (
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
        >
          <div 
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--border)",
              borderRadius: 20,
              width: "100%",
              maxWidth: 380,
              padding: 24,
              boxShadow: "0 15px 35px rgba(0,0,0,0.5)",
              color: "var(--text)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck color="var(--green)" size={20} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Agent Trust Profile</h3>
              </div>
              <button 
                onClick={() => setShowTrustModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0 }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 16px 0", lineHeight: 1.4 }}>
              This AI Co-pilot is registered on the Celo blockchain via the ERC-8004 open trust registry.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Agent Name:</span>
                <span style={{ fontWeight: 600 }}>Pasa</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>ERC-8004 ID:</span>
                <span style={{ fontWeight: 600, color: "var(--green)" }}>#9227</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Uptime:</span>
                <span style={{ fontWeight: 600 }}>{reputation ? reputation.uptime.toFixed(1) : "100.0"}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Success Rate:</span>
                <span style={{ fontWeight: 600 }}>{reputation ? reputation.successRate.toFixed(1) : "100.0"}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-secondary)" }}>Owner:</span>
                <a 
                  href="https://celoscan.io/address/0x1649d54eE9A07533671d9da8C0C1AA1590b23E8C" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ color: "var(--green)", display: "flex", alignItems: "center", gap: 3, textDecoration: "underline" }}
                >
                  0x1649...3E8C <ExternalLink size={10} />
                </a>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 4px 0", textAlign: "center" }}>Rate Co-pilot Performance</h4>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "0 0 12px 0", textAlign: "center" }}>
                Submit your rating directly to the Celo blockchain.
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 10, margin: "12px 0 20px" }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingInput(star)}
                    disabled={submittingFeedback}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    <Star
                      size={28}
                      fill={star <= ratingInput ? "var(--green)" : "none"}
                      color={star <= ratingInput ? "var(--green)" : "var(--text-secondary)"}
                      style={{ transition: "all 0.1s" }}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={() => submitFeedback(ratingInput)}
                disabled={submittingFeedback || !address}
                className="btn btn--primary"
                style={{ 
                  width: "100%", 
                  padding: "12px", 
                  borderRadius: 12, 
                  background: "var(--green)", 
                  color: "#000",
                  fontWeight: 700,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                {submittingFeedback ? (
                  <>
                    <Loader size={14} className="spinner" />
                    Submitting to Blockchain…
                  </>
                ) : (
                  <>
                    <Award size={14} />
                    {address ? "Submit Rating" : "Connect Wallet to Rate"}
                  </>
                )}
              </button>
              
              {address && (
                <p style={{ fontSize: 9, color: "var(--text-secondary)", textAlign: "center", margin: "8px 0 0 0" }}>
                  Rating requires signing a transaction. A tiny stablecoin network fee applies.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
