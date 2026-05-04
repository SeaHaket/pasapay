export function openFonbnk(walletAddress: string) {
  // Fonbnk provides a web-based offramp widget. 
  // We construct the URL and redirect the user.
  const baseUrl = "https://pay.fonbnk.com/";
  const params = new URLSearchParams({
    walletAddress: walletAddress,
    network: "celo",
  });
  
  window.location.href = `${baseUrl}?${params.toString()}`;
}
