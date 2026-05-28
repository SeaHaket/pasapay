"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, TrendingUp, Loader, CheckCircle, AlertCircle, Info } from "lucide-react";
import { parseUnits, createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { useRouter } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import {
  VAULT_TOKENS,
  getATokenBalance,
  getAllowance,
  encodeApprove,
  encodeSupply,
  encodeWithdraw,
  formatBalance,
  type VaultTokenSymbol,
  // Morpho Blue (Feather) helpers
  getFeatherBalance,
  getFeatherShares,
  getFeatherAllowance,
  encodeFeatherApprove,
  encodeFeatherDeposit,
  encodeFeatherWithdraw,
  encodeFeatherRedeem,
  // Merkl Claim helpers
  getLiveAPYs,
  getMerklRewards,
  encodeMerklClaim,
  type MerklReward,
} from "@/lib/vault";
import { CELO_RPC } from "@/lib/constants";

type Tab = "deposit" | "withdraw";
type TxStatus = "idle" | "approving" | "depositing" | "withdrawing" | "claiming" | "done" | "error";

type VaultBalanceMap = {
  aave: { usdt: bigint; usdc: bigint };
  morpho: { usdt: bigint; usdc: bigint };
};

type VaultAPYMap = {
  aave: { usdt: number; usdc: number };
  morpho: { usdt: number; usdc: number };
};

export default function VaultPage() {
  const router = useRouter();
  const { address, balances, sendTransaction, refreshBalances } = useMiniPay();

  const [tab, setTab] = useState<Tab>("deposit");
  const [protocol, setProtocol] = useState<"aave" | "morpho">("aave");
  const [amount, setAmount] = useState("");

  const [vaultBalances, setVaultBalances] = useState<VaultBalanceMap>({
    aave: { usdt: 0n, usdc: 0n },
    morpho: { usdt: 0n, usdc: 0n },
  });
  const [apys, setApys] = useState<VaultAPYMap>({
    aave: { usdt: 0, usdc: 0 },
    morpho: { usdt: 0, usdc: 0 },
  });
  const [rewards, setRewards] = useState<MerklReward[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txMsg, setTxMsg] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const loadVaultData = useCallback(async () => {
    if (!address) return;
    setIsLoadingData(true);
    try {
      const [aaveUsdtBal, morphoUsdtBal, liveApys, merklRewards] = await Promise.all([
        getATokenBalance(VAULT_TOKENS[0].aTokenAddress, address),
        getFeatherBalance(address),
        getLiveAPYs(),
        getMerklRewards(address),
      ]);

      setVaultBalances({
        aave: { usdt: aaveUsdtBal, usdc: 0n },
        morpho: { usdt: morphoUsdtBal, usdc: 0n },
      });
      setApys({
        aave: { usdt: liveApys.aave, usdc: 0 },
        morpho: { usdt: liveApys.morpho, usdc: 0 },
      });
      setRewards(merklRewards);
    } catch {
      // non-blocking — balances may just show zero
    } finally {
      setIsLoadingData(false);
    }
  }, [address]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  const handleProtocolChange = (p: "aave" | "morpho") => {
    setProtocol(p);
    setAmount("");
    resetTx();
  };

  const token = VAULT_TOKENS[0]; // 100% USDT-only
  const walletBal = balances.find((b) => b.symbol === "USDT");
  const walletHuman = walletBal?.human ?? 0;

  // Dynamic balance, APY, and limits depending on selected protocol
  const vaultRaw = protocol === "morpho" ? vaultBalances.morpho.usdt : vaultBalances.aave.usdt;
  const vaultHuman = Number(vaultRaw) / 10 ** token.decimals;

  const currentApy = protocol === "morpho" ? apys.morpho.usdt : apys.aave.usdt;

  const totalVaultUsd = Number(vaultBalances.aave.usdt) / 1e6 + Number(vaultBalances.morpho.usdt) / 1e6;

  const amountNum = parseFloat(amount) || 0;
  const canDeposit = tab === "deposit" && amountNum > 0 && amountNum <= walletHuman && txStatus === "idle";
  const canWithdraw = tab === "withdraw" && amountNum > 0 && amountNum <= vaultHuman && txStatus === "idle";

  const totalClaimableRewards = rewards.reduce((sum, r) => sum + Number(r.claimable) / 1e18, 0);

  const DISPLAY_VAULTS = [
    {
      name: "Aave V3",
      symbol: "USDT",
      balance: vaultBalances.aave.usdt,
      apy: apys.aave.usdt,
      color: "#26A17B",
    },
    {
      name: "Morpho Blue",
      symbol: "USDT",
      balance: vaultBalances.morpho.usdt,
      apy: apys.morpho.usdt,
      color: "#8B5CF6",
    },
  ];

  async function handleDeposit() {
    if (!address || !canDeposit) return;
    setTxError(null);

    const safeAmount = amountNum.toFixed(token.decimals);
    let amountRaw: bigint;
    try {
      amountRaw = parseUnits(safeAmount, token.decimals);
    } catch {
      setTxStatus("error");
      setTxError("Invalid amount — please enter a valid number");
      return;
    }

    try {
      if (protocol === "morpho") {
        // ─── Morpho Blue (Feather) Deposit ───────────────────────────
        const allowance = await getFeatherAllowance(address);
        if (allowance < amountRaw) {
          setTxStatus("approving");
          setTxMsg("Approving token spend…");
          const { to, data } = encodeFeatherApprove(amountRaw);
          const approveHash = await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
          const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
          await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}`, timeout: 60_000 });
        }

        setTxStatus("depositing");
        setTxMsg("Depositing into Morpho Blue…");
        const { to, data } = encodeFeatherDeposit(amountRaw, address);
        await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
      } else {
        // ─── Aave V3 Deposit ──────────────────────────────────────────
        const allowance = await getAllowance(token.address, address);
        if (allowance < amountRaw) {
          setTxStatus("approving");
          setTxMsg("Approving token spend…");
          const { to, data } = encodeApprove(token.address, amountRaw);
          const approveHash = await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
          const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
          await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}`, timeout: 60_000 });
        }

        setTxStatus("depositing");
        setTxMsg("Depositing into Aave Vault…");
        const { to, data } = encodeSupply(token.address, amountRaw, address);
        await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
      }

      await Promise.all([refreshBalances(), loadVaultData()]);
      setAmount("");
      setTxStatus("done");
      setTxMsg(`Deposited $${amount} USDT`);
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message ?? "Transaction failed — please try again");
    }
  }

  async function handleWithdraw() {
    if (!address || !canWithdraw) return;
    setTxError(null);
    setTxStatus("withdrawing");
    setTxMsg("Withdrawing from vault…");

    try {
      let to: `0x${string}`;
      let data: `0x${string}`;

      const isMax = vaultHuman > 0 && Math.abs((vaultHuman - amountNum) / vaultHuman) < 0.001;

      if (protocol === "morpho") {
        // ─── Morpho Blue (Feather) Withdraw ──────────────────────────
        if (isMax) {
          const shares = await getFeatherShares(address);
          const tx = encodeFeatherRedeem(shares, address, address);
          to = tx.to;
          data = tx.data;
        } else {
          const amountRaw = parseUnits(amountNum.toFixed(token.decimals), token.decimals);
          const tx = encodeFeatherWithdraw(amountRaw, address, address);
          to = tx.to;
          data = tx.data;
        }
      } else {
        // ─── Aave V3 Withdraw ─────────────────────────────────────────
        const amountRaw = isMax
          ? BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")
          : parseUnits(amountNum.toFixed(token.decimals), token.decimals);
        const tx = encodeWithdraw(token.address, amountRaw, address);
        to = tx.to;
        data = tx.data;
      }

      await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
      await Promise.all([refreshBalances(), loadVaultData()]);
      setAmount("");
      setTxStatus("done");
      setTxMsg(`Withdrawn $${amount} USDT`);
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message ?? "Transaction failed — please try again");
    }
  }

  async function handleClaimRewards() {
    if (!address || rewards.length === 0) return;
    setTxError(null);
    setTxStatus("claiming");
    setTxMsg("Claiming Celo incentives…");

    try {
      const tokens = rewards.map((r) => r.token);
      const amounts = rewards.map((r) => r.claimable);
      const proofs = rewards.map((r) => r.proof);

      const { to, data } = encodeMerklClaim(address, tokens, amounts, proofs);

      await sendTransaction({ to, data, feeCurrency: token.feeCurrency });
      await loadVaultData();
      setTxStatus("done");
      setTxMsg("Rewards claimed successfully!");
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message ?? "Claim failed — please try again");
    }
  }

  function resetTx() {
    setTxStatus("idle");
    setTxMsg("");
    setTxError(null);
  }

  const isBusy = txStatus === "approving" || txStatus === "depositing" || txStatus === "withdrawing" || txStatus === "claiming";

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
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Savings Vault</h1>
        <div style={{ width: 40 }} />
      </header>

      <main className="page" style={{ paddingTop: 8, paddingBottom: 120 }}>
        {/* Total balance card */}
        <div className="card card--green" style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 4 }}>Total Saved</p>
          <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: -1 }}>
            ${isLoadingData ? "—" : totalVaultUsd.toFixed(2)}
          </p>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {DISPLAY_VAULTS.map((v, i) => (
              <div key={i} style={{
                background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "8px 12px",
                display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 95,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: v.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>{v.name}</span>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800 }}>
                  {isLoadingData ? "—" : `$${formatBalance(v.balance)} ${v.symbol}`}
                </span>
                <span style={{ fontSize: 10, color: "var(--green)", fontWeight: 600 }}>
                  {isLoadingData ? "—" : `${v.apy.toFixed(2)}% APY`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Claim Rewards Card */}
        {rewards.length > 0 && totalClaimableRewards > 0 && (
          <div style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.15) 0%, rgba(0,200,83,0.15) 100%)",
            borderRadius: 14, padding: "16px", border: "1px solid rgba(139,92,246,0.3)",
            marginBottom: 20, display: "flex", flexDirection: "column", gap: 12
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{
                background: "#8B5CF6", width: 32, height: 32, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, flexShrink: 0
              }}>
                🎁
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Accumulated Celo Rewards!</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.4 }}>
                  You earned extra rewards from Celo stablecoin incentives! Claim them directly into your wallet.
                </p>
              </div>
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Pending Claim:</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: "var(--green)" }}>
                {rewards.map((r) => `${(Number(r.claimable) / 1e18).toFixed(4)} ${r.symbol}`).join(" + ")}
              </span>
            </div>

            <button
              className="btn btn--primary"
              disabled={isBusy}
              onClick={handleClaimRewards}
              style={{ background: "#8B5CF6", color: "#fff", padding: "10px 14px", fontSize: 13, borderRadius: 10, marginTop: 4, width: "100%" }}
            >
              {txStatus === "claiming" ? <><span className="spinner" /> Claiming Rewards…</> : "Claim Celo Rewards"}
            </button>
          </div>
        )}

        {/* Protocol Selector */}
        <p className="input-label" style={{ marginBottom: 8 }}>Savings Provider</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {(["aave", "morpho"] as const).map((p) => (
            <button
              key={p}
              disabled={isBusy}
              onClick={() => handleProtocolChange(p)}
              style={{
                flex: 1, padding: "12px 14px", borderRadius: 12, border: "2px solid",
                borderColor: protocol === p ? (p === "morpho" ? "#8B5CF6" : "var(--green)") : "var(--border)",
                background: protocol === p ? (p === "morpho" ? "rgba(139,92,246,0.08)" : "rgba(0,200,83,0.08)") : "var(--surface)",
                color: protocol === p ? (p === "morpho" ? "#A78BFA" : "var(--green)") : "var(--text-secondary)",
                fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2,
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>
                  {p === "aave" ? "Aave V3" : "Morpho Blue"}
                </span>
                {p === "morpho" && (
                  <span style={{
                    fontSize: 8, background: "#8B5CF6", color: "#fff",
                    padding: "2px 5px", borderRadius: 6, fontWeight: 800, textTransform: "uppercase"
                  }}>
                    Best APY
                  </span>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 400 }}>
                {p === "aave" ? "Deep liquidity & safe" : "Isolated P2P yields"}
              </span>
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--surface)", borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["deposit", "withdraw"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); resetTx(); setAmount(""); }}
              style={{
                flex: 1, padding: "10px", borderRadius: 9, border: "none", cursor: "pointer",
                fontWeight: 700, fontSize: 14,
                background: tab === t ? "var(--green)" : "transparent",
                color: tab === t ? "#000" : "var(--text-secondary)",
                transition: "all 0.15s",
              }}
            >
              {t === "deposit" ? "Deposit" : "Withdraw"}
            </button>
          ))}
        </div>

        {/* Dynamic Token Badge */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            disabled
            style={{
              flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid #26A17B",
              background: "rgba(38,161,123,0.08)", color: "#26A17B",
              fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#26A17B" }} />
            USDT (Only supported asset)
          </button>
        </div>

        {tab === "deposit" && (
          <>
            {/* Wallet balance */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="input-label" style={{ margin: 0 }}>Amount</label>
              <button
                onClick={() => setAmount(walletHuman.toFixed(6))}
                style={{ fontSize: 12, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Max: ${walletHuman.toFixed(2)} USDT
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                className="input-field"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isBusy}
                style={{ paddingRight: 60, fontSize: 20, fontWeight: 700 }}
              />
              <span style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
              }}>
                USDT
              </span>
            </div>

            {/* APY info */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              background: protocol === "morpho" ? "rgba(139,92,246,0.08)" : "rgba(0,200,83,0.08)", borderRadius: 10,
              border: protocol === "morpho" ? "1px solid rgba(139,92,246,0.2)" : "1px solid rgba(0,200,83,0.2)", marginBottom: 20,
            }}>
              <TrendingUp size={18} color={protocol === "morpho" ? "#A78BFA" : "var(--green)"} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: protocol === "morpho" ? "#A78BFA" : "var(--green)", margin: 0 }}>
                  {isLoadingData ? "Loading APY…" : `${currentApy.toFixed(2)}% APY`}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>
                  {protocol === "morpho"
                    ? "Powered by Morpho Blue (Feather USDT Vault) on Celo. Includes Merkl rewards."
                    : "Powered by Aave v3 on Celo. Includes Merkl rewards."}
                </p>
              </div>
            </div>
          </>
        )}

        {tab === "withdraw" && (
          <>
            {/* Vault balance */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <label className="input-label" style={{ margin: 0 }}>Amount</label>
              <button
                onClick={() => setAmount(vaultHuman.toFixed(6))}
                style={{ fontSize: 12, color: "var(--green)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
              >
                Max: ${vaultHuman.toFixed(2)} USDT
              </button>
            </div>
            <div style={{ position: "relative", marginBottom: 16 }}>
              <input
                className="input-field"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isBusy}
                style={{ paddingRight: 60, fontSize: 20, fontWeight: 700 }}
              />
              <span style={{
                position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
                fontSize: 13, fontWeight: 700, color: "var(--text-secondary)",
              }}>
                USDT
              </span>
            </div>

            {vaultHuman === 0 && !isLoadingData && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
                background: "rgba(255,179,0,0.08)", borderRadius: 10,
                border: "1px solid rgba(255,179,0,0.2)", marginBottom: 16,
              }}>
                <Info size={16} color="var(--warning)" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: "var(--warning)", margin: 0 }}>
                  No USDT deposited yet. Switch to the Deposit tab to start saving.
                </p>
              </div>
            )}
          </>
        )}

        {/* Transaction status */}
        {txStatus === "done" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: "rgba(0,200,83,0.08)", borderRadius: 10,
            border: "1px solid rgba(0,200,83,0.2)", marginBottom: 16,
          }}>
            <CheckCircle size={18} color="var(--green)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, color: "var(--green)", margin: 0, fontWeight: 600 }}>{txMsg}</p>
          </div>
        )}

        {txStatus === "error" && txError && (
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px",
            background: "rgba(255,82,82,0.08)", borderRadius: 10,
            border: "1px solid rgba(255,82,82,0.2)", marginBottom: 16,
          }}>
            <AlertCircle size={18} color="var(--error)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontSize: 13, color: "var(--error)", margin: 0, fontWeight: 600 }}>Transaction failed</p>
              <p style={{ fontSize: 12, color: "var(--error)", margin: "2px 0 0", opacity: 0.8, lineHeight: 1.4 }}>{txError}</p>
            </div>
          </div>
        )}

        {/* Multi-step progress */}
        {isBusy && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
            background: "var(--surface-raised)", borderRadius: 10, marginBottom: 16,
          }}>
            <Loader size={18} color="var(--green)" style={{ flexShrink: 0, animation: "spin 1s linear infinite" }} />
            <p style={{ fontSize: 13, margin: 0, fontWeight: 600 }}>{txMsg}</p>
          </div>
        )}

        {/* Action button */}
        {tab === "deposit" ? (
          <button
            className="btn btn--primary"
            disabled={!canDeposit || isBusy}
            onClick={txStatus === "done" ? resetTx : handleDeposit}
            style={{
              background: protocol === "morpho" ? "#8B5CF6" : "var(--green)",
              color: protocol === "morpho" ? "#fff" : "#000",
            }}
          >
            {txStatus === "done"
              ? "Deposit More"
              : txStatus === "approving"
              ? <><span className="spinner" /> Approving…</>
              : txStatus === "depositing"
              ? <><span className="spinner" /> Depositing…</>
              : "Deposit"}
          </button>
        ) : (
          <button
            className="btn btn--primary"
            disabled={!canWithdraw || isBusy}
            onClick={txStatus === "done" ? resetTx : handleWithdraw}
            style={{
              background: protocol === "morpho" ? "#8B5CF6" : "var(--green)",
              color: protocol === "morpho" ? "#fff" : "#000",
            }}
          >
            {txStatus === "done"
              ? "Withdraw More"
              : txStatus === "withdrawing"
              ? <><span className="spinner" /> Withdrawing…</>
              : "Withdraw"}
          </button>
        )}

        {/* Disclaimer */}
        <p style={{ fontSize: 11, color: "var(--text-secondary)", textAlign: "center", marginTop: 20, lineHeight: 1.6, padding: "0 8px" }}>
          {protocol === "morpho"
            ? "Funds are deposited into Morpho Blue (Feather USDT Vault). APY is variable and based on active Merkl Celo incentives. Not financial advice."
            : "Funds are deposited into Aave v3 on Celo. APY is variable and includes Celo rewards. Not financial advice."}
        </p>
      </main>
    </>
  );
}
