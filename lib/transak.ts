// Transak Widget helpers
// Docs: https://docs.transak.com/docs/query-parameters

export type TransakParams = {
  walletAddress: string;
  cryptoCurrencyCode?: string;
  defaultCryptoAmount?: number;
  fiatCurrency?: string;
  countryCode?: string;
};

/** Build a Transak widget URL for offramp (crypto → fiat) */
export function buildTransakUrl(params: TransakParams): string {
  const apiKey = process.env.NEXT_PUBLIC_TRANSAK_API_KEY ?? "YOUR_TRANSAK_STAGING_KEY";
  const env = process.env.NEXT_PUBLIC_TRANSAK_ENV ?? "PRODUCTION";

  const baseUrl =
    env === "PRODUCTION"
      ? "https://global.transak.com"
      : "https://global-stg.transak.com";

  const query = new URLSearchParams({
    apiKey,
    environment: env,
    walletAddress: params.walletAddress,
    network: "celo",
    cryptoCurrencyCode: params.cryptoCurrencyCode ?? "USDT",
    defaultCryptoAmount: String(params.defaultCryptoAmount ?? ""),
    fiatCurrency: params.fiatCurrency ?? "PHP",
    countryCode: params.countryCode ?? "PH",
    productsAvailed: "SELL", // offramp only
    themeColor: "00C853",
    hideMenu: "true",
    isFeeCalculationShown: "true",
  });

  return `${baseUrl}?${query.toString()}`;
}

/** Open Transak in a new tab / iframe depending on context */
export function openTransak(params: TransakParams): void {
  const url = buildTransakUrl(params);
  window.open(url, "_blank", "noopener,noreferrer");
}
