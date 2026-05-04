import { NextResponse } from "next/server";

export async function GET() {
  try {
    // CoinGecko free API — no key required
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=php",
      { next: { revalidate: 60 } } // ISR-style cache 60s
    );
    if (!res.ok) throw new Error("CoinGecko error");
    const data = await res.json();
    const usdPhp: number = data?.tether?.php ?? 58;

    return NextResponse.json({ usdPhp }, { status: 200 });
  } catch {
    // Fallback rate if CoinGecko is down
    return NextResponse.json({ usdPhp: 58, fallback: true }, { status: 200 });
  }
}
