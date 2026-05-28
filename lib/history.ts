export type HistoryEntry = {
  id: string;
  timestamp: number;
  hash: string;
  chain: "celo" | "arbitrum" | "solana";
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

export type QuickContact = {
  recipientAddress: string;
  recipientDisplay: string;
  countryId: string;
  currencyCode: string;
  currencySymbol: string;
  route: string;
  count: number;
};

export function getQuickContacts(limit = 5): QuickContact[] {
  const history = loadHistory();
  const map = new Map<string, QuickContact>();
  for (const tx of history) {
    // Fonbnk has no on-chain recipient — group by country instead
    const key = tx.route === "fonbnk"
      ? `fonbnk-${tx.countryId}`
      : tx.recipientAddress || null;
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      map.set(key, {
        recipientAddress: tx.recipientAddress,
        recipientDisplay: tx.recipientDisplay,
        countryId: tx.countryId,
        currencyCode: tx.currencyCode,
        currencySymbol: tx.currencySymbol,
        route: tx.route,
        count: 1,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}
