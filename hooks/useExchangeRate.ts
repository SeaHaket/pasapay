import { useState, useEffect, useCallback } from "react";

export function useExchangeRate(targetCurrency: string = "PHP") {
  const [rate, setRate] = useState<number | null>(null);

  const fetchRate = useCallback(async () => {
    try {
      // Use CoinGecko for live fiat rates against USD
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=${targetCurrency.toLowerCase()}`);
      const data = await res.json();
      if (data["usd-coin"] && data["usd-coin"][targetCurrency.toLowerCase()]) {
        setRate(data["usd-coin"][targetCurrency.toLowerCase()]);
      } else {
        // Fallback: If coingecko fails or misses a currency, use open.er-api.com as a robust secondary generic API
        const fallbackRes = await fetch("https://open.er-api.com/v6/latest/USD");
        const fallbackData = await fallbackRes.json();
        if (fallbackData.rates && fallbackData.rates[targetCurrency.toUpperCase()]) {
          setRate(fallbackData.rates[targetCurrency.toUpperCase()]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch exchange rate", err);
    }
  }, [targetCurrency]);

  useEffect(() => {
    fetchRate();
  }, [fetchRate]);

  function toLocalFiat(usdAmount: number, symbol: string): string {
    if (!rate) return `${symbol}0.00`;
    return `${symbol}${(usdAmount * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return { rate, toLocalFiat };
}
