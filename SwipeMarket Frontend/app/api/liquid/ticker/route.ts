import { NextRequest, NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

const MOCK_TICKERS: Record<string, object> = {
  "BTC-PERP":  { symbol: "BTC-PERP",  mark_price: 94231, change_24h: 2.4,  volume_24h: 1_200_000_000, funding_rate: 0.0001  },
  "ETH-PERP":  { symbol: "ETH-PERP",  mark_price: 3412,  change_24h: -1.1, volume_24h: 840_000_000,   funding_rate: 0.00008 },
  "SOL-PERP":  { symbol: "SOL-PERP",  mark_price: 187.4, change_24h: 5.7,  volume_24h: 320_000_000,   funding_rate: 0.00015 },
  "DOGE-PERP": { symbol: "DOGE-PERP", mark_price: 0.184, change_24h: -3.2, volume_24h: 95_000_000,    funding_rate: -0.00005 },
  "AVAX-PERP": { symbol: "AVAX-PERP", mark_price: 38.7,  change_24h: 1.9,  volume_24h: 42_000_000,    funding_rate: 0.0001  },
  "ARB-PERP":  { symbol: "ARB-PERP",  mark_price: 1.12,  change_24h: 0.8,  volume_24h: 28_000_000,    funding_rate: 0.00003 },
  "LINK-PERP": { symbol: "LINK-PERP", mark_price: 18.4,  change_24h: 3.1,  volume_24h: 55_000_000,    funding_rate: 0.00012 },
  "WIF-PERP":  { symbol: "WIF-PERP",  mark_price: 2.34,  change_24h: -4.5, volume_24h: 31_000_000,    funding_rate: -0.0002 },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const apiKey = process.env.LIQUID_API_KEY ?? "";
  const apiSecret = process.env.LIQUID_API_SECRET ?? "";

  if (!apiKey || !apiSecret) {
    const mock = MOCK_TICKERS[symbol] ?? { symbol, mark_price: 0, change_24h: 0, volume_24h: 0, funding_rate: 0 };
    return NextResponse.json(mock);
  }

  try {
    const path = `/v1/markets/${encodeURIComponent(symbol)}/ticker`;
    const res = await fetch(`${LIQUID_BASE_URL}${path}`, {
      headers: getAuthHeaders("GET", path, "", "", apiKey, apiSecret),
    });
    if (!res.ok) throw new Error(`Ticker ${res.status}`);
    return NextResponse.json(unwrap(await res.json()));
  } catch (error) {
    console.error("Liquid ticker error:", error);
    const mock = MOCK_TICKERS[symbol] ?? { symbol, mark_price: 0, change_24h: 0, volume_24h: 0, funding_rate: 0 };
    return NextResponse.json(mock);
  }
}
