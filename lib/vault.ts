import { createPublicClient, http, erc20Abi, encodeFunctionData } from "viem";
import { celo } from "viem/chains";
import {
  CELO_RPC,
  USDT_ADDRESS,
  USDT_FEE_CURRENCY,
} from "@/lib/constants";

// ─── Aave v3 Celo Mainnet ────────────────────────────────────────────────────
export const AAVE_POOL = "0x3E59A31363E2ad014dcbc521c4a0d5757d9f3402" as const;
export const AUSDT_ADDRESS = "0xDeE98402A302e4D707fB9bf2bac66fAEEc31e8Df" as const;

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

export type VaultTokenSymbol = "USDT";

export const VAULT_TOKENS = [
  {
    symbol: "USDT" as VaultTokenSymbol,
    address: USDT_ADDRESS as `0x${string}`,
    aTokenAddress: AUSDT_ADDRESS as `0x${string}`,
    decimals: 6,
    feeCurrency: USDT_FEE_CURRENCY as `0x${string}`,
    color: "#26A17B",
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

export async function getFeatherBalance(userAddress: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: FEATHER_USDT_VAULT,
    abi: ERC4626_ABI,
    functionName: "maxWithdraw",
    args: [userAddress],
  });
}

export async function getFeatherShares(userAddress: `0x${string}`): Promise<bigint> {
  const client = getClient();
  return client.readContract({
    address: FEATHER_USDT_VAULT,
    abi: ERC4626_ABI,
    functionName: "balanceOf",
    args: [userAddress],
  });
}

export async function getFeatherAPY(): Promise<number> {
  const client = getClient();
  try {
    const currentBlock = await client.getBlockNumber();
    const pastBlock = currentBlock > 604_800n ? currentBlock - 604_800n : 1n;
    const ONE_SHARE = 10n ** 18n;
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

// ─── Merkl Rewards & APY ─────────────────────────────────────────────────────
export const MERKL_DISTRIBUTOR = "0x9C257bDC314dc516e673728D70F45444F6e22412" as const;

export interface MerklReward {
  token: `0x${string}`;
  accumulated: bigint;
  claimable: bigint;
  proof: `0x${string}`[];
  symbol: string;
  decimals: number;
}

export async function getLiveAPYs(): Promise<{ aave: number; morpho: number }> {
  let aaveApy = 4.50;
  let morphoApy = 4.73;

  try {
    const calculatedApy = await getSupplyAPY(USDT_ADDRESS);
    if (calculatedApy > 0) {
      aaveApy = calculatedApy;
    }
  } catch {
    // non-blocking
  }

  try {
    const res = await fetch("https://api.merkl.xyz/v4/opportunities?chainId=42220");
    const data = await res.json();
    const featherOpportunity = data.find(
      (o: any) => o.identifier.toLowerCase() === FEATHER_USDT_VAULT.toLowerCase()
    );
    if (featherOpportunity && featherOpportunity.apr > 0) {
      morphoApy = featherOpportunity.apr * 0.965;
    }
  } catch {
    // non-blocking
  }

  return {
    aave: Number(aaveApy.toFixed(2)),
    morpho: Number(morphoApy.toFixed(2)),
  };
}

export async function getMerklRewards(userAddress: `0x${string}`): Promise<MerklReward[]> {
  try {
    const res = await fetch(`https://api.merkl.xyz/v3/userRewards?user=${userAddress}&chainId=42220`);
    const data = await res.json();
    
    const rewards: MerklReward[] = [];
    for (const tokenAddress of Object.keys(data)) {
      const info = data[tokenAddress];
      const accumulated = BigInt(info.accumulated || "0");
      const claimable = BigInt(info.claimable || "0");
      if (claimable > 0n) {
        const symbol = tokenAddress.toLowerCase() === "0x471ece3750da237f93b8e339c536989b8978a438" ? "CELO" : "USDF";
        rewards.push({
          token: tokenAddress as `0x${string}`,
          accumulated,
          claimable,
          proof: info.proof || [],
          symbol,
          decimals: 18,
        });
      }
    }
    return rewards;
  } catch {
    return [];
  }
}

export function encodeMerklClaim(
  user: `0x${string}`,
  tokens: `0x${string}`[],
  amounts: bigint[],
  proofs: `0x${string}`[][]
): { to: `0x${string}`; data: `0x${string}` } {
  const distributorAbi = [
    {
      name: "claim",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "users", type: "address[]" },
        { name: "tokens", type: "address[]" },
        { name: "amounts", type: "uint256[]" },
        { name: "proofs", type: "bytes32[][]" },
      ],
      outputs: [],
    },
  ] as const;

  return {
    to: MERKL_DISTRIBUTOR,
    data: encodeFunctionData({
      abi: distributorAbi,
      functionName: "claim",
      args: [[user], tokens, amounts, proofs],
    }),
  };
}
