export function openFonbnk(walletAddress: string, currencyCode?: string) {
  const baseUrl = "https://pay.fonbnk.com/offramp";
  const params: Record<string, string> = { walletAddress, network: "celo" };
  if (currencyCode) params.currency = currencyCode;
  window.location.href = `${baseUrl}?${new URLSearchParams(params).toString()}`;
}
