import { createPublicClient, http, erc20Abi, encodeFunctionData } from "viem";
import { celo } from "viem/chains";
import {
  CELO_RPC,
  USDT_ADDRESS,
  USDC_ADDRESS,
  USDT_FEE_CURRENCY,
  USDC_FEE_CURRENCY,
} from "@/lib/constants";

// ─── Aave v3 Celo Mainnet ────────────────────────────────────────────────────
export const AAVE_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402" as const;
export const AUSDT_ADDRESS = "0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df" as const;
export const AUSDC_ADDRESS = "0xFF8309b9e99bfd2D4021bc71a362aBD93dBd4785" as const;

const POOL_ABI = [
  {
    name: "supply",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "onBehalfOf", type: "address" },
      { name: "referralCode", type: "uint16" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "asset", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "to", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getReserveData",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "configuration", type: "uint256" },
          { name: "liquidityIndex", type: "uint128" },
          { name: "currentLiquidityRate", type: "uint128" },
          { name: "variableBorrowIndex", type: "uint128" },
          { name: "currentVariableBorrowRate", type: "uint128" },
          { name: "currentStableBorrowRate", type: "uint128" },
          { name: "lastUpdateTimestamp", type: "uint40" },
          { name: "id", type: "uint16" },
          { name: "aTokenAddress", type: "address" },
          { name: "stableDebtTokenAddress", type: "address" },
          { name: "variableDebtTokenAddress", type: "address" },
          { name: "interestRateStrategyAddress", type: "address" },
          { name: "accruedToTreasury", type: "uint128" },
          { name: "unbacked", type: "uint128" },
          { name: "isolationModeTotalDebt", type: "uint128" },
        ],
      },
    ],
  },
] as const;

export type VaultTokenSymbol = "USDT" | "USDC";

export const VAULT_TOKENS = [
  {
    symbol: "USDT" as VaultTokenSymbol,
    address: USDT_ADDRESS as `0x${string}`,
    aTokenAddress: AUSDT_ADDRESS as `0x${string}`,
    decimals: 6,
    feeCurrency: USDT_FEE_CURRENCY as `0x${string}`,
    color: "#26A17B",
  },
  {
    symbol: "USDC" as VaultTokenSymbol,
    address: USDC_ADDRESS as `0x${string}`,
    aTokenAddress: AUSDC_ADDRESS as `0x${string}`,
    decimals: 6,
    feeCurrency: USDC_FEE_CURRENCY as `0x${string}`,
    color: "#2775CA",
  },
] as const;

function getClient() {
  return createPublicClient({ chain: celo, transport: http(CELO_RPC) });
}

export async function getATokenBalance(
  aTokenAddress: `0x${string}`,
  userAddress: `0x${string}`,
): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: aTokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [userAddress],
  });
}

export async function getSupplyAPY(assetAddress: `0x${string}`): Promise<number> {
  const client = getClient();
  const data = await client.readContract({
    address: AAVE_POOL,
    abi: POOL_ABI,
    functionName: "getReserveData",
    args: [assetAddress],
  });
  // currentLiquidityRate is the annualised rate in RAY (1e27).
  // Divide by seconds-per-year to get the per-second rate, then compound to true APY.
  const SECONDS_PER_YEAR = 31_536_000;
  const apr = Number(data.currentLiquidityRate) / 1e27;
  return ((1 + apr / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1) * 100;
}

export async function getAllowance(
  tokenAddress: `0x${string}`,
  owner: `0x${string}`,
): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, AAVE_POOL],
  });
}

export function encodeApprove(
  tokenAddress: `0x${string}`,
  amount: bigint,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: tokenAddress,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [AAVE_POOL, amount] }),
  };
}

export function encodeSupply(
  assetAddress: `0x${string}`,
  amount: bigint,
  onBehalfOf: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: AAVE_POOL,
    data: encodeFunctionData({
      abi: POOL_ABI,
      functionName: "supply",
      args: [assetAddress, amount, onBehalfOf, 0],
    }),
  };
}

export function encodeWithdraw(
  assetAddress: `0x${string}`,
  amount: bigint,
  to: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: AAVE_POOL,
    data: encodeFunctionData({
      abi: POOL_ABI,
      functionName: "withdraw",
      args: [assetAddress, amount, to],
    }),
  };
}

export function formatBalance(raw: bigint, decimals = 6): string {
  const num = Number(raw) / 10 ** decimals;
  return num.toFixed(2);
}

// ─── Feather MetaMorpho Vault (Celo Mainnet) ─────────────────────────────────
// Vault: MetaMorpho v1.1 ERC-4626, underlying asset: USDT (6 decimals)
// Shares have 18 decimals; underlying USDT has 6 decimals.
export const FEATHER_USDT_VAULT = "0xb2cDf6403da1ef1Bb911D87D0DD155a699869BC2" as const;

const ERC4626_ABI = [
  {
    name: "deposit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "shares", type: "uint256" }],
  },
  {
    name: "redeem",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ name: "assets", type: "uint256" }],
  },
  {
    name: "maxWithdraw",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "convertToAssets",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// Returns max USDT the user can withdraw right now (accounts for Morpho liquidity).
export async function getFeatherBalance(userAddress: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: FEATHER_USDT_VAULT,
    abi: ERC4626_ABI,
    functionName: "maxWithdraw",
    args: [userAddress],
  });
}

// Returns vault shares held by the user (needed for full redeem).
export async function getFeatherShares(userAddress: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: FEATHER_USDT_VAULT,
    abi: ERC4626_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });
}

// Derives APY from 7-day rolling share-price change (on-chain, no external API needed).
export async function getFeatherAPY(): Promise<number> {
  const client = getClient();
  try {
    const currentBlock = await client.getBlockNumber();
    const pastBlock = currentBlock > 604_800n ? currentBlock - 604_800n : 1n;
    const ONE_SHARE = 10n ** 18n; // shares are 18-decimal
    const [cur, past] = await Promise.all([
      client.readContract({ address: FEATHER_USDT_VAULT, abi: ERC4626_ABI, functionName: "convertToAssets", args: [ONE_SHARE] }),
      client.readContract({ address: FEATHER_USDT_VAULT, abi: ERC4626_ABI, functionName: "convertToAssets", args: [ONE_SHARE], blockNumber: pastBlock }),
    ]);
    if (past === 0n || cur <= past) return 0;
    const weeklyYield = (Number(cur) - Number(past)) / Number(past);
    return weeklyYield * 52 * 100;
  } catch {
    return 0;
  }
}

export async function getFeatherAllowance(owner: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: USDT_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [owner, FEATHER_USDT_VAULT],
  });
}

export function encodeFeatherApprove(amount: bigint): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: USDT_ADDRESS as `0x${string}`,
    data: encodeFunctionData({ abi: erc20Abi, functionName: "approve", args: [FEATHER_USDT_VAULT, amount] }),
  };
}

export function encodeFeatherDeposit(
  amount: bigint,
  receiver: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: FEATHER_USDT_VAULT,
    data: encodeFunctionData({ abi: ERC4626_ABI, functionName: "deposit", args: [amount, receiver] }),
  };
}

// Use for partial withdrawals (exact USDT amount out).
export function encodeFeatherWithdraw(
  amount: bigint,
  receiver: `0x${string}`,
  owner: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: FEATHER_USDT_VAULT,
    data: encodeFunctionData({ abi: ERC4626_ABI, functionName: "withdraw", args: [amount, receiver, owner] }),
  };
}

// Use for full withdrawals (exact shares in — avoids rounding that can cause withdraw to revert).
export function encodeFeatherRedeem(
  shares: bigint,
  receiver: `0x${string}`,
  owner: `0x${string}`,
): { to: `0x${string}`; data: `0x${string}` } {
  return {
    to: FEATHER_USDT_VAULT,
    data: encodeFunctionData({ abi: ERC4626_ABI, functionName: "redeem", args: [shares, receiver, owner] }),
  };
}
