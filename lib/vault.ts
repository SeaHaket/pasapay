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
  // currentLiquidityRate is per-second in RAY (1e27). Compound to get true APY.
  const SECONDS_PER_YEAR = 31_536_000;
  const ratePerSecond = Number(data.currentLiquidityRate) / 1e27;
  return ((1 + ratePerSecond) ** SECONDS_PER_YEAR - 1) * 100;
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
