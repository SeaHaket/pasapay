import { createPublicClient, http, formatUnits } from "viem";
import { celo } from "viem/chains";
import { STABLECOINS, MINIPAY_DEPOSIT_DEEPLINK } from "./constants";

export type StablecoinBalance = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  feeCurrency?: `0x${string}`;
  color: string;
  raw: bigint;
  human: number;
  formatted: string;
  priceUsd: number;
};

// Minimal ERC20 ABI for balance checks
const balanceOfAbi = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
    stateMutability: "view",
  },
] as const;

const publicClient = createPublicClient({ 
  chain: celo, 
  transport: http(process.env.NEXT_PUBLIC_CELO_RPC ?? "https://forno.celo.org") 
});

let cachedCeloPrice = 0.70;
let lastPriceFetch = 0;

/** Fetch CELO USD price from CoinGecko with 1 minute caching */
export async function getCeloPrice(): Promise<number> {
  const now = Date.now();
  if (now - lastPriceFetch < 60_000) {
    return cachedCeloPrice;
  }
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=celo&vs_currencies=usd");
    const data = await res.json();
    if (data.celo && typeof data.celo.usd === "number") {
      cachedCeloPrice = data.celo.usd;
      lastPriceFetch = now;
    }
  } catch (err) {
    console.error("Failed to fetch CELO price from CoinGecko, using fallback:", err);
  }
  return cachedCeloPrice;
}

/** Fetch all token balances (USDT, USDC, USDm, and CELO) for a given address */
export async function getAllBalances(user: `0x${string}`): Promise<StablecoinBalance[]> {
  const stablecoinBalances = await Promise.all(
    STABLECOINS.map(async (token) => {
      try {
        const raw = await publicClient.readContract({
          address: token.address,
          abi: balanceOfAbi,
          functionName: "balanceOf",
          args: [user],
        });
        const human = Number(formatUnits(raw, token.decimals));
        return {
          ...token,
          raw,
          human,
          formatted: human.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
          priceUsd: 1.0,
        };
      } catch (err) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, err);
        return {
          ...token,
          raw: 0n,
          human: 0,
          formatted: "0.00",
          priceUsd: 1.0,
        };
      }
    })
  );

  // Fetch native CELO balance
  try {
    const celoRaw = await publicClient.getBalance({ address: user });
    const celoHuman = Number(formatUnits(celoRaw, 18));
    const celoPrice = await getCeloPrice();
    const celoToken: StablecoinBalance = {
      symbol: "CELO",
      name: "Celo",
      address: "0x471ECE3750DA237F93B8E299FE40B99E7C1A4b6D", // Canonical CELO token contract address on Celo
      decimals: 18,
      feeCurrency: undefined,
      color: "#FBCC5C",
      raw: celoRaw,
      human: celoHuman,
      formatted: celoHuman.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
      priceUsd: celoPrice,
    };
    return [...stablecoinBalances, celoToken];
  } catch (err) {
    console.error("Failed to fetch native CELO balance:", err);
    return stablecoinBalances;
  }
}

/** Return the stablecoin with the highest balance (MiniPay listing requirement) */
export async function getPreferredStablecoin(user: `0x${string}`): Promise<StablecoinBalance | null> {
  const balances = await getAllBalances(user);
  const stablecoinsOnly = balances.filter((b) => b.symbol !== "CELO");
  const withFunds = stablecoinsOnly.filter((b) => b.raw > 0n);
  if (withFunds.length === 0) return stablecoinsOnly.find((b) => b.symbol === "USDT") || null;
  withFunds.sort((a, b) => b.human - a.human);
  return withFunds[0];
}

/** Total USD value across all tokens in the balance list */
export function totalUsdBalance(balances: StablecoinBalance[]): number {
  return balances.reduce((sum, b) => sum + b.human * b.priceUsd, 0);
}

/** Redirect to MiniPay deposit deeplink when balance is zero */
export function redirectToDeposit(): void {
  window.location.href = MINIPAY_DEPOSIT_DEEPLINK;
}
