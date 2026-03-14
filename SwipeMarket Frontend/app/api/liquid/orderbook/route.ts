import { NextRequest, NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

function mockBook(midPrice: number, depth: number) {
  const spread = midPrice * 0.0001;
  return {
    bids: Array.from({ length: depth }, (_, i) => ({
      price: (midPrice - spread * (i + 1)).toFixed(4),
      size: (Math.random() * 2 + 0.1).toFixed(3),
      count: 1,
    })),
    asks: Array.from({ length: depth }, (_, i) => ({
      price: (midPrice + spread * (i + 1)).toFixed(4),
      size: (Math.random() * 2 + 0.1).toFixed(3),
      count: 1,
    })),
  };
}

const MID_PRICES: Record<string, number> = {
  "BTC-PERP": 94231, "ETH-PERP": 3412, "SOL-PERP": 187.4,
  "DOGE-PERP": 0.184, "AVAX-PERP": 38.7, "ARB-PERP": 1.12,
  "LINK-PERP": 18.4, "WIF-PERP": 2.34,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const depth = Math.min(parseInt(searchParams.get("depth") ?? "5", 10), 20);

  if (!symbol) {
    return NextResponse.json({ error: "symbol is required" }, { status: 400 });
  }

  const apiKey = process.env.LIQUID_API_KEY ?? "";
  const apiSecret = process.env.LIQUID_API_SECRET ?? "";

  if (!apiKey || !apiSecret) {
    return NextResponse.json(mockBook(MID_PRICES[symbol] ?? 100, depth));
  }

  try {
    const query = `depth=${depth}`;
    const path = `/v1/markets/${encodeURIComponent(symbol)}/orderbook`;
    const res = await fetch(`${LIQUID_BASE_URL}${path}?${query}`, {
      headers: getAuthHeaders("GET", path, query, "", apiKey, apiSecret),
    });
    if (!res.ok) throw new Error(`Orderbook ${res.status}`);
    return NextResponse.json(unwrap(await res.json()));
  } catch (error) {
    console.error("Liquid orderbook error:", error);
    return NextResponse.json(mockBook(MID_PRICES[symbol] ?? 100, depth));
  }
}
