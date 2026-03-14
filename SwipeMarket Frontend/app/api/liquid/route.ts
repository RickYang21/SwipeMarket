import { NextResponse } from "next/server";
import { CryptoMarket, getCryptoIcon } from "@/lib/liquid";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

let cache: { data: CryptoMarket[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

const TARGET_SYMBOLS = [
  "BTC-PERP", "ETH-PERP", "SOL-PERP", "DOGE-PERP",
  "AVAX-PERP", "ARB-PERP", "LINK-PERP", "WIF-PERP",
  "XRP-PERP", "ADA-PERP", "DOT-PERP", "MATIC-PERP",
];

function getBase(symbol: string): string {
  return symbol.replace("-PERP", "");
}

function generatePriceHistory(markPrice: number, changePct: number, points = 24): number[] {
  const price24hAgo = markPrice / (1 + changePct / 100);
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    const base = price24hAgo + (markPrice - price24hAgo) * t;
    return base * (1 + (Math.random() - 0.5) * 0.005);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformTicker(symbol: string, ticker: any, maxLeverage: number): CryptoMarket {
  const markPrice = parseFloat(String(ticker.mark_price ?? 0));
  const changePct = parseFloat(String(ticker.change_24h ?? 0));
  const vol24h = parseFloat(String(ticker.volume_24h ?? 0));
  const base = getBase(symbol);
  const price24hAgo = markPrice / (1 + changePct / 100) || markPrice;

  const priceStr =
    markPrice >= 1000
      ? `$${markPrice.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
      : markPrice >= 1
        ? `$${markPrice.toFixed(2)}`
        : `$${markPrice.toFixed(4)}`;

  const dirText = changePct >= 0 ? "up" : "down";
  const yesPrice = Math.max(0.01, Math.min(0.99, 0.5 + (changePct / 100) * 0.4));

  return {
    id: `liquid_${symbol.toLowerCase()}`,
    question: `${base}/USD — ${priceStr}`,
    description: `${base} perpetual futures at ${priceStr}, ${dirText} ${Math.abs(changePct).toFixed(1)}% in 24h. Volume: $${(vol24h / 1_000_000).toFixed(0)}M. Max leverage: ${maxLeverage}x.`,
    yes_price: yesPrice,
    no_price: parseFloat((1 - yesPrice).toFixed(4)),
    volume: vol24h,
    volume_24h: vol24h,
    liquidity: vol24h / 1000,
    end_date: "Ongoing",
    event_date: new Date().toISOString(),
    image: getCryptoIcon(base),
    category: "crypto",
    outcomes: ["Buy", "Skip"],
    source: "liquid",
    tokens: { yes_token_id: `${symbol}_buy`, no_token_id: `${symbol}_skip` },
    base_currency: base,
    current_price: markPrice,
    price_24h_ago: price24hAgo,
    price_change_pct: changePct,
    high_24h: markPrice * 1.02,
    low_24h: price24hAgo * 0.98,
    spread: markPrice * 0.0001,
    currency_pair_code: symbol,
    price_history: generatePriceHistory(markPrice, changePct),
  };
}

const MOCK_MARKETS: CryptoMarket[] = [
  { symbol: "BTC-PERP", mark_price: 94231, change_24h: 2.4, volume_24h: 1_200_000_000, max_leverage: 50 },
  { symbol: "ETH-PERP", mark_price: 3412, change_24h: -1.1, volume_24h: 840_000_000, max_leverage: 50 },
  { symbol: "SOL-PERP", mark_price: 187.4, change_24h: 5.7, volume_24h: 320_000_000, max_leverage: 20 },
  { symbol: "DOGE-PERP", mark_price: 0.184, change_24h: -3.2, volume_24h: 95_000_000, max_leverage: 10 },
  { symbol: "AVAX-PERP", mark_price: 38.7, change_24h: 1.9, volume_24h: 42_000_000, max_leverage: 20 },
  { symbol: "ARB-PERP", mark_price: 1.12, change_24h: 0.8, volume_24h: 28_000_000, max_leverage: 10 },
  { symbol: "LINK-PERP", mark_price: 18.4, change_24h: 3.1, volume_24h: 55_000_000, max_leverage: 20 },
  { symbol: "WIF-PERP", mark_price: 2.34, change_24h: -4.5, volume_24h: 31_000_000, max_leverage: 5 },
// eslint-disable-next-line @typescript-eslint/no-explicit-any
].map((m: any) => transformTicker(m.symbol, m, m.max_leverage));

export async function GET() {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return NextResponse.json({ markets: cache.data });
  }

  const apiKey = process.env.LIQUID_API_KEY ?? "";
  const apiSecret = process.env.LIQUID_API_SECRET ?? "";

  if (!apiKey || !apiSecret) {
    console.warn("LIQUID_API_KEY/SECRET not set — returning mock data");
    cache = { data: MOCK_MARKETS, timestamp: Date.now() };
    return NextResponse.json({ markets: MOCK_MARKETS });
  }

  try {
    // 1. Get available markets list
    const marketsPath = "/v1/markets";
    const marketsRes = await fetch(`${LIQUID_BASE_URL}${marketsPath}`, {
      headers: getAuthHeaders("GET", marketsPath, "", "", apiKey, apiSecret),
    });
    if (!marketsRes.ok) throw new Error(`Markets list ${marketsRes.status}`);
    const allMarkets: Array<{ symbol: string; max_leverage: number }> = unwrap(await marketsRes.json());

    // Filter to target symbols; fall back to first 12 if none match
    const targetSet = new Set(TARGET_SYMBOLS);
    const toFetch = (allMarkets.filter(m => targetSet.has(m.symbol)).length > 0
      ? allMarkets.filter(m => targetSet.has(m.symbol))
      : allMarkets.slice(0, 12));

    // 2. Fetch tickers concurrently
    const results = await Promise.allSettled(
      toFetch.map(async (m) => {
        const tickerPath = `/v1/markets/${m.symbol}/ticker`;
        const res = await fetch(`${LIQUID_BASE_URL}${tickerPath}`, {
          headers: getAuthHeaders("GET", tickerPath, "", "", apiKey, apiSecret),
        });
        if (!res.ok) throw new Error(`Ticker ${m.symbol} ${res.status}`);
        return transformTicker(m.symbol, unwrap(await res.json()), m.max_leverage);
      })
    );

    const markets = results
      .filter((r): r is PromiseFulfilledResult<CryptoMarket> => r.status === "fulfilled")
      .map(r => r.value);

    if (markets.length === 0) throw new Error("No markets resolved");

    cache = { data: markets, timestamp: Date.now() };
    return NextResponse.json({ markets });
  } catch (error) {
    console.error("Liquid markets error:", error);
    cache = { data: MOCK_MARKETS, timestamp: Date.now() };
    return NextResponse.json({ markets: MOCK_MARKETS });
  }
}
