import { NextResponse } from "next/server";
import { CryptoMarket, getCryptoIcon } from "@/lib/liquid";

let cache: { data: CryptoMarket[]; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformProduct(raw: any): CryptoMarket | null {
  const currentPrice = parseFloat(raw.last_traded_price || "0");
  const price24hAgo = parseFloat(raw.last_price_24h || "0");
  const high = parseFloat(raw.high_market_ask || "0");
  const low = parseFloat(raw.low_market_bid || "0");
  const ask = parseFloat(raw.market_ask || "0");
  const bid = parseFloat(raw.market_bid || "0");
  const vol24h = parseFloat(raw.volume_24h || "0");
  const spread = ask - bid;

  if (currentPrice <= 0 || high <= low) return null;

  const priceChangePct = price24hAgo > 0
    ? ((currentPrice - price24hAgo) / price24hAgo) * 100
    : 0;

  // Normalized position in 24h range (0 = at low, 1 = at high)
  const rangePosition = (currentPrice - low) / (high - low);
  const yesPrice = Math.max(0.01, Math.min(0.99, rangePosition));

  const base = raw.base_currency || "";
  const quoted = raw.quoted_currency || "USD";
  const dirText = priceChangePct >= 0 ? "up" : "down";
  const pctStr = `${Math.abs(priceChangePct).toFixed(1)}%`;
  const priceStr = currentPrice >= 1
    ? `$${currentPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
    : `$${currentPrice.toFixed(6)}`;

  return {
    id: `liquid_${raw.id}`,
    question: `${base}/${quoted} — ${priceStr}`,
    description: `${base} is trading at ${priceStr}, ${dirText} ${pctStr} in the last 24 hours. 24h range: $${low.toLocaleString()} – $${high.toLocaleString()}. Volume: ${vol24h.toFixed(2)} ${base}.`,
    yes_price: yesPrice,
    no_price: 1 - yesPrice,
    volume: vol24h * currentPrice,
    volume_24h: vol24h * currentPrice,
    liquidity: spread > 0 ? 1 / spread * 1000 : 0,
    end_date: "Ongoing",
    image: getCryptoIcon(base),
    category: "crypto",
    outcomes: ["Buy", "Skip"],
    source: "liquid",
    tokens: { yes_token_id: `${raw.id}_buy`, no_token_id: `${raw.id}_skip` },
    base_currency: base,
    current_price: currentPrice,
    price_24h_ago: price24hAgo,
    price_change_pct: priceChangePct,
    high_24h: high,
    low_24h: low,
    spread,
    currency_pair_code: raw.currency_pair_code || `${base}${quoted}`,
  };
}

function generateMockCrypto(): CryptoMarket[] {
  const mocks = [
    { id: "1", base: "BTC", price: 68431.35, prev: 67537.45, high: 69805.42, low: 67153.44, ask: 68431.35, bid: 68410.09, vol: 37.83 },
    { id: "2", base: "ETH", price: 3845.20, prev: 3790.10, high: 3920.00, low: 3750.50, ask: 3846.00, bid: 3844.40, vol: 412.5 },
    { id: "3", base: "SOL", price: 172.45, prev: 168.20, high: 178.90, low: 165.30, ask: 172.55, bid: 172.35, vol: 8500 },
    { id: "4", base: "XRP", price: 0.6234, prev: 0.6180, high: 0.6410, low: 0.6050, ask: 0.6238, bid: 0.6230, vol: 2500000 },
    { id: "5", base: "DOGE", price: 0.1523, prev: 0.1489, high: 0.1590, low: 0.1450, ask: 0.1525, bid: 0.1521, vol: 15000000 },
    { id: "6", base: "ADA", price: 0.4512, prev: 0.4380, high: 0.4650, low: 0.4290, ask: 0.4515, bid: 0.4509, vol: 5000000 },
    { id: "7", base: "AVAX", price: 38.72, prev: 37.10, high: 40.15, low: 36.80, ask: 38.80, bid: 38.64, vol: 45000 },
    { id: "8", base: "DOT", price: 7.45, prev: 7.28, high: 7.72, low: 7.15, ask: 7.47, bid: 7.43, vol: 120000 },
    { id: "9", base: "LINK", price: 15.82, prev: 15.45, high: 16.30, low: 15.10, ask: 15.85, bid: 15.79, vol: 85000 },
    { id: "10", base: "MATIC", price: 0.7823, prev: 0.7650, high: 0.8010, low: 0.7520, ask: 0.7830, bid: 0.7816, vol: 3000000 },
  ];

  return mocks.map((m) => {
    const spread = m.ask - m.bid;
    const priceChangePct = ((m.price - m.prev) / m.prev) * 100;
    const rangePos = (m.price - m.low) / (m.high - m.low);
    const yesPrice = Math.max(0.01, Math.min(0.99, rangePos));
    const priceStr = m.price >= 1
      ? `$${m.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
      : `$${m.price.toFixed(4)}`;
    const dirText = priceChangePct >= 0 ? "up" : "down";
    const pctStr = `${Math.abs(priceChangePct).toFixed(1)}%`;

    return {
      id: `liquid_${m.id}`,
      question: `${m.base}/USD — ${priceStr}`,
      description: `${m.base} is trading at ${priceStr}, ${dirText} ${pctStr} in the last 24 hours. 24h range: $${m.low.toLocaleString()} – $${m.high.toLocaleString()}.`,
      yes_price: yesPrice,
      no_price: 1 - yesPrice,
      volume: m.vol * m.price,
      volume_24h: m.vol * m.price,
      liquidity: spread > 0 ? 1 / spread * 1000 : 0,
      end_date: "Ongoing",
      image: getCryptoIcon(m.base),
      category: "crypto",
      outcomes: ["Buy", "Skip"],
      source: "liquid" as const,
      tokens: { yes_token_id: `${m.id}_buy`, no_token_id: `${m.id}_skip` },
      base_currency: m.base,
      current_price: m.price,
      price_24h_ago: m.prev,
      price_change_pct: priceChangePct,
      high_24h: m.high,
      low_24h: m.low,
      spread,
      currency_pair_code: `${m.base}USD`,
    };
  });
}

export async function GET() {
  try {
    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json({ markets: cache.data });
    }

    const res = await fetch("https://api.liquid.com/products", {
      headers: {
        "X-Quoine-API-Version": "2",
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Liquid API returned ${res.status}`);
    }

    const products = await res.json();

    if (!Array.isArray(products)) {
      throw new Error("Unexpected Liquid API response format");
    }

    // Filter USD-quoted, non-disabled products
    const usdProducts = products.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (p: any) => p.quoted_currency === "USD" && !p.disabled
    );

    // Sort by volume descending
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usdProducts.sort((a: any, b: any) =>
      parseFloat(b.volume_24h || "0") - parseFloat(a.volume_24h || "0")
    );

    // Take top 20 and transform
    const markets: CryptoMarket[] = [];
    for (const product of usdProducts.slice(0, 20)) {
      const transformed = transformProduct(product);
      if (transformed) markets.push(transformed);
    }

    // Cache results
    cache = { data: markets, timestamp: Date.now() };

    return NextResponse.json({ markets });
  } catch (error) {
    console.error("Error fetching Liquid products:", error);

    // Return mock crypto markets as fallback
    const mocks = generateMockCrypto();
    cache = { data: mocks, timestamp: Date.now() };
    return NextResponse.json({ markets: mocks });
  }
}
