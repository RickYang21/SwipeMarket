import { NextRequest, NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

const INTERVAL_MS: Record<string, number> = {
  "1m":  60_000,
  "5m":  5 * 60_000,
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h":  3_600_000,
  "4h":  4 * 3_600_000,
  "1d":  86_400_000,
};

const MOCK_BASE_PRICES: Record<string, number> = {
  "BTC-PERP": 70700, "ETH-PERP": 3412, "SOL-PERP": 187.4,
  "DOGE-PERP": 0.184, "AVAX-PERP": 38.7, "ARB-PERP": 1.12,
  "LINK-PERP": 18.4, "WIF-PERP": 2.34,
};

function generateMockCandles(basePrice: number, count: number, intervalMs: number) {
  const now = Date.now();
  const prices: number[] = [];
  const timestamps: string[] = [];
  let price = basePrice * (1 + (Math.random() - 0.5) * 0.04);
  const vol = basePrice * 0.004;

  for (let i = count - 1; i >= 0; i--) {
    price = Math.max(price * 0.85, price + (Math.random() - 0.5) * vol);
    prices.push(price);
    timestamps.push(new Date(now - i * intervalMs).toISOString());
  }
  prices[prices.length - 1] = basePrice;
  return { prices, timestamps };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol   = searchParams.get("symbol") ?? "BTC-PERP";
  const interval = searchParams.get("interval") ?? "1h";
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "24", 10), 200);

  const apiKey    = process.env.LIQUID_API_KEY ?? "";
  const apiSecret = process.env.LIQUID_API_SECRET ?? "";
  const intervalMs = INTERVAL_MS[interval] ?? INTERVAL_MS["1h"];

  if (!apiKey || !apiSecret) {
    const base = MOCK_BASE_PRICES[symbol] ?? 100;
    return NextResponse.json(generateMockCandles(base, limit, intervalMs));
  }

  try {
    const query = `interval=${interval}&limit=${limit}`;
    const path  = `/v1/markets/${encodeURIComponent(symbol)}/candles`;
    const res   = await fetch(`${LIQUID_BASE_URL}${path}?${query}`, {
      headers: getAuthHeaders("GET", path, query, "", apiKey, apiSecret),
    });
    if (!res.ok) throw new Error(`Candles ${res.status}`);

    const raw = unwrap(await res.json());
    const candles: Array<{ close?: number; c?: number; timestamp?: string; t?: string }> =
      Array.isArray(raw) ? raw : [];

    if (candles.length < 2) throw new Error("Too few candles");

    const prices     = candles.map(c => parseFloat(String(c.close ?? c.c ?? 0)));
    const timestamps = candles.map(c => c.timestamp ?? c.t ?? new Date().toISOString());

    return NextResponse.json({ prices, timestamps });
  } catch (error) {
    console.error("Liquid candles error:", error);
    const base = MOCK_BASE_PRICES[symbol] ?? 100;
    return NextResponse.json(generateMockCandles(base, limit, intervalMs));
  }
}
