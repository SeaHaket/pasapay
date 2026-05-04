import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { celo } from "viem/chains";
import { STABLECOINS, MINIPAY_DEPOSIT_DEEPLINK } from "./constants";

export type StablecoinBalance = {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  feeCurrency: `0x${string}`;
  color: string;
  raw: bigint;
  human: number;
  formatted: string;
};

const publicClient = createPublicClient({ chain: celo, transport: http(process.env.NEXT_PUBLIC_CELO_RPC ?? "https://forno.celo.org") });

/** Fetch all three stablecoin balances for a given address */
export async function getAllBalances(user: `0x${string}`): Promise<StablecoinBalance[]> {
  const results = await Promise.all(
    STABLECOINS.map(async (token) => {
      const raw = await publicClient.readContract({
        address: token.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [user],
      });
      const human = Number(formatUnits(raw, token.decimals));
      return {
        ...token,
        raw,
        human,
        formatted: human.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }),
      };
    })
  );
  return results;
}

/** Return the stablecoin with the highest balance (MiniPay listing requirement) */
export async function getPreferredStablecoin(user: `0x${string}`): Promise<StablecoinBalance | null> {
  const balances = await getAllBalances(user);
  const withFunds = balances.filter((b) => b.raw > 0n);
  if (withFunds.length === 0) return null;
  withFunds.sort((a, b) => b.human - a.human);
  return withFunds[0];
}

/** Total USD value across all stablecoins (all pegged 1:1 to USD) */
export function totalUsdBalance(balances: StablecoinBalance[]): number {
  return balances.reduce((sum, b) => sum + b.human, 0);
}

/** Redirect to MiniPay deposit deeplink when balance is zero */
export function redirectToDeposit(): void {
  window.location.href = MINIPAY_DEPOSIT_DEEPLINK;
}
