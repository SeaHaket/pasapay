// ─── Celo Mainnet token addresses ────────────────────────────────────────────
export const USDT_ADDRESS = "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e" as const;
export const USDC_ADDRESS = "0xcebA9300f2b948710d2653dD7B07f33A8B32118C" as const;
export const USDM_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a" as const;

// ─── feeCurrency adapter addresses (for CIP-64 fee abstraction) ──────────────
// USDC/USDT are 6-decimal tokens — pass their ADAPTER here, not the token address.
// USDm is 18-decimal, so token address == feeCurrency address.
export const USDT_FEE_CURRENCY = "0x0e2a3e05bc9a16f5292a6170456a710cb89c6f72" as const;
export const USDC_FEE_CURRENCY = "0x2F25deB3848C207fc8E0c34035B3Ba7fC157602B" as const;
export const USDM_FEE_CURRENCY = USDM_ADDRESS;

// ─── ODIS / SocialConnect ────────────────────────────────────────────────────
export const MINIPAY_ISSUER = "0x7888612486844Bb9BE598668081c59A9f7367FBc" as const;
export const FEDERATED_ATTESTATIONS_ADDRESS = "0x0aD5b1d0C25ecF6266Dd951403723B2687d6aff2" as const;
export const ODIS_PAYMENTS_ADDRESS = "0xAE6B29f31B96e61DdDc792f45fDa4e4F0356D0CB" as const;

// ─── Chain IDs ────────────────────────────────────────────────────────────────
export const CELO_CHAIN_ID = 42220;
export const BSC_CHAIN_ID = 56;

// ─── Celo RPC ─────────────────────────────────────────────────────────────────
export const CELO_RPC = "https://forno.celo.org";

// ─── MiniPay deeplinks ────────────────────────────────────────────────────────
export const MINIPAY_DEPOSIT_DEEPLINK = "https://link.minipay.xyz/add_cash";

// ─── PasaPay app fee (Fonbnk) ─────────────────────────────────────────────────
// Fee collection disabled — set NEXT_PUBLIC_PASAPAY_FEE_ADDRESS to re-enable.
export const PASAPAY_FEE_ADDRESS = process.env.NEXT_PUBLIC_PASAPAY_FEE_ADDRESS as `0x${string}` | undefined;
export const FONBNK_APP_FEE = "0.1"; // USD / per transaction (kept for when fees are re-enabled)

// ─── Stablecoin definitions ───────────────────────────────────────────────────
export const STABLECOINS = [
  {
    symbol: "USDT",
    name: "Tether USD",
    address: USDT_ADDRESS,
    decimals: 6,
    feeCurrency: USDT_FEE_CURRENCY,
    color: "#26A17B",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: USDC_ADDRESS,
    decimals: 6,
    feeCurrency: USDC_FEE_CURRENCY,
    color: "#2775CA",
  },
  {
    symbol: "USDm",
    name: "Mento Dollar",
    address: USDM_ADDRESS,
    decimals: 18,
    feeCurrency: USDM_FEE_CURRENCY,
    color: "#FCFF52",
  },
] as const;

export type StablecoinSymbol = "USDT" | "USDC" | "USDm";

// ─── LI.fi chain keys ────────────────────────────────────────────────────────
export const LIFI_CELO_CHAIN = "CEL";
export const LIFI_BSC_CHAIN = "BSC";
