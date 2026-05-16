"use client";
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, TrendingUp, Loader, CheckCircle, AlertCircle, Info } from "lucide-react";
import { parseUnits, createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { useRouter } from "@/i18n/navigation";
import { useMiniPay } from "@/hooks/useMiniPay";
import {
  VAULT_TOKENS,
  AAVE_POOL,
  getATokenBalance,
  getSupplyAPY,
  getAllowance,
  encodeApprove,
  encodeSupply,
  encodeWithdraw,
  formatBalance,
  type VaultTokenSymbol,
} from "@/lib/vault";
import { CELO_RPC } from "@/lib/constants";

type Tab = "deposit" | "withdraw";
type TxStatus = "idle" | "approving" | "depositing" | "withdrawing" | "done" | "error";

type VaultBalance = { usdt: bigint; usdc: bigint };
type VaultAPY = { usdt: number; usdc: number };

function tokenConfig(symbol: VaultTokenSymbol) {
  return VAULT_TOKENS.find((t) => t.symbol === symbol)!;
}

export default function VaultPage() {
  const router = useRouter();
  const { address, balances, sendTransaction, refreshBalances } = useMiniPay();

  const [tab, setTab] = useState<Tab>("deposit");
  const [selectedToken, setSelectedToken] = useState<VaultTokenSymbol>("USDT");
  const [amount, setAmount] = useState("");

  const [vaultBalances, setVaultBalances] = useState<VaultBalance>({ usdt: 0n, usdc: 0n });
  const [apys, setApys] = useState<VaultAPY>({ usdt: 0, usdc: 0 });
  const [isLoadingData, setIsLoadingData] = useState(true);

  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txMsg, setTxMsg] = useState("");
  const [txError, setTxError] = useState<string | null>(null);

  const loadVaultData = useCallback(async () => {
    if (!address) return;
    setIsLoadingData(true);
    try {
      const [usdtBal, usdcBal, usdtApy, usdcApy] = await Promise.all([
        getATokenBalance(VAULT_TOKENS[0].aTokenAddress, address),
        getATokenBalance(VAULT_TOKENS[1].aTokenAddress, address),
        getSupplyAPY(VAULT_TOKENS[0].address),
        getSupplyAPY(VAULT_TOKENS[1].address),
      ]);
      setVaultBalances({ usdt: usdtBal, usdc: usdcBal });
      setApys({ usdt: usdtApy, usdc: usdcApy });
    } catch {
      // non-blocking — balances may just show zero
    } finally {
      setIsLoadingData(false);
    }
  }, [address]);

  useEffect(() => {
    loadVaultData();
  }, [loadVaultData]);

  const token = tokenConfig(selectedToken);
  const walletBal = balances.find((b) => b.symbol === selectedToken);
  const walletHuman = walletBal?.human ?? 0;
  const vaultRaw = selectedToken === "USDT" ? vaultBalances.usdt : vaultBalances.usdc;
  const vaultHuman = Number(vaultRaw) / 1e6;
  const currentApy = selectedToken === "USDT" ? apys.usdt : apys.usdc;

  const totalVaultUsd = Number(vaultBalances.usdt) / 1e6 + Number(vaultBalances.usdc) / 1e6;

  const amountNum = parseFloat(amount) || 0;
  const canDeposit = tab === "deposit" && amountNum > 0 && amountNum <= walletHuman && txStatus === "idle";
  const canWithdraw = tab === "withdraw" && amountNum > 0 && amountNum <= vaultHuman && txStatus === "idle";

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
      // Step 1: check and set allowance
      const allowance = await getAllowance(token.address, address);
      if (allowance < amountRaw) {
        setTxStatus("approving");
        setTxMsg("Approving token spend…");
        const { to: approveTo, data: approveData } = encodeApprove(token.address, amountRaw);
        const approveHash = await sendTransaction({ to: approveTo, data: approveData, feeCurrency: token.feeCurrency });
        const publicClient = createPublicClient({ chain: celo, transport: http(CELO_RPC) });
        await publicClient.waitForTransactionReceipt({ hash: approveHash as `0x${string}`, timeout: 60_000 });
      }

      // Step 2: supply
      setTxStatus("depositing");
      setTxMsg("Depositing into vault…");
      const { to: supplyTo, data: supplyData } = encodeSupply(token.address, amountRaw, address);
      await sendTransaction({ to: supplyTo, data: supplyData, feeCurrency: token.feeCurrency });

      await Promise.all([refreshBalances(), loadVaultData()]);
      setAmount("");
      setTxStatus("done");
      setTxMsg(`Deposited $${amount} ${selectedToken}`);
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
      const isMax = vaultHuman > 0 && Math.abs((vaultHuman - amountNum) / vaultHuman) < 0.001;
      // MaxUint256 triggers a full withdrawal in Aave — handles rounding precisely on-chain
      const amountRaw = isMax
        ? BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")
        : parseUnits(amountNum.toFixed(token.decimals), token.decimals);
      const { to, data } = encodeWithdraw(token.address, amountRaw, address);
      await sendTransaction({ to, data, feeCurrency: token.feeCurrency });

      await Promise.all([refreshBalances(), loadVaultData()]);
      setAmount("");
      setTxStatus("done");
      setTxMsg(`Withdrawn $${amount} ${selectedToken}`);
    } catch (err: any) {
      setTxStatus("error");
      setTxError(err?.message ?? "Transaction failed — please try again");
    }
  }

  function resetTx() {
    setTxStatus("idle");
    setTxMsg("");
    setTxError(null);
  }

  const isBusy = txStatus === "approving" || txStatus === "depositing" || txStatus === "withdrawing";

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

          <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
            {VAULT_TOKENS.map((t) => {
              const bal = t.symbol === "USDT" ? vaultBalances.usdt : vaultBalances.usdc;
              const apy = t.symbol === "USDT" ? apys.usdt : apys.usdc;
              return (
                <div key={t.symbol} style={{
                  background: "rgba(0,0,0,0.25)", borderRadius: 10, padding: "8px 12px",
                  display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 100,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{t.symbol}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>
                    {isLoadingData ? "—" : `$${formatBalance(bal)}`}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--green)" }}>
                    {isLoadingData ? "—" : `${apy.toFixed(2)}% APY`}
                  </span>
                </div>
              );
            })}
          </div>
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

        {/* Token selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {VAULT_TOKENS.map((t) => (
            <button
              key={t.symbol}
              onClick={() => { setSelectedToken(t.symbol); setAmount(""); resetTx(); }}
              style={{
                flex: 1, padding: "10px 12px", borderRadius: 10, border: "2px solid",
                borderColor: selectedToken === t.symbol ? t.color : "var(--border)",
                background: selectedToken === t.symbol ? `${t.color}18` : "var(--surface)",
                color: selectedToken === t.symbol ? t.color : "var(--text-secondary)",
                fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.color }} />
              {t.symbol}
            </button>
          ))}
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
                Max: ${walletHuman.toFixed(2)} {selectedToken}
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
                {selectedToken}
              </span>
            </div>

            {/* APY info */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              background: "rgba(0,200,83,0.08)", borderRadius: 10,
              border: "1px solid rgba(0,200,83,0.2)", marginBottom: 20,
            }}>
              <TrendingUp size={18} color="var(--green)" style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--green)", margin: 0 }}>
                  {isLoadingData ? "Loading APY…" : `${currentApy.toFixed(2)}% APY`}
                </p>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>
                  Powered by Aave v3 on Celo. Yield accrues every block.
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
                Max: ${vaultHuman.toFixed(2)} {selectedToken}
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
                {selectedToken}
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
                  No {selectedToken} deposited yet. Switch to the Deposit tab to start saving.
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
          Funds are deposited into Aave v3 on Celo. APY is variable and may change. Not financial advice.
        </p>
      </main>
    </>
  );
}
