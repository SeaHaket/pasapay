export const CELOSCAN_BASE = "https://celoscan.io";
export const ARBISCAN_BASE = "https://arbiscan.io";

export function celoscanTx(hash: string): string {
  return `${CELOSCAN_BASE}/tx/${hash}`;
}

export function arbiscanTx(hash: string): string {
  return `${ARBISCAN_BASE}/tx/${hash}`;
}

export function celoscanAddress(address: string): string {
  return `${CELOSCAN_BASE}/address/${address}`;
}

/** Truncate a 0x address for secondary display (MiniPay rule: never show as primary ID) */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
