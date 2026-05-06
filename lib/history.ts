export type HistoryEntry = {
  id: string;
  timestamp: number;
  hash: string;
  chain: "celo" | "arbitrum";
  amount: string;
  tokenSymbol: string;
  route: string;
  recipientDisplay: string;
  recipientAddress: string;
  countryId: string;
  currencyCode: string;
  currencySymbol: string;
  fiatEstimate: string;
};

const STORAGE_KEY = "pp_history";
const MAX_ENTRIES = 50;

export function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTransaction(entry: Omit<HistoryEntry, "id">): HistoryEntry {
  const id = `${entry.timestamp}-${entry.hash.slice(2, 8)}`;
  const full: HistoryEntry = { id, ...entry };
  const all = loadHistory();
  all.unshift(full);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, MAX_ENTRIES)));
  return full;
}
