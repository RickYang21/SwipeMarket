import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_KEYWORDS } from "@/lib/categories";
import { Market } from "@/types/types";

let cache: { data: Market[]; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 60 seconds

function generatePriceHistory(currentPrice: number, points: number = 24): number[] {
  // Walk backward from current price to create a realistic history
  const history: number[] = [currentPrice];
  let price = currentPrice;
  for (let i = 1; i < points; i++) {
    const drift = (Math.random() - 0.52) * 0.06; // slight mean reversion
    price = Math.max(0.02, Math.min(0.98, price - drift));
    history.unshift(price);
  }
  return history;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPolymarketData(raw: any, matchedCategory: string): Market {
  // Parse outcomePrices from JSON string if needed
  let outcomePrices: string[] = [];
  if (raw.outcomePrices) {
    try {
      outcomePrices = typeof raw.outcomePrices === "string"
        ? JSON.parse(raw.outcomePrices)
        : raw.outcomePrices;
    } catch { /* ignore */ }
  }

  // Parse clobTokenIds
  let tokenIds: string[] = [];
  if (raw.clobTokenIds) {
    try {
      tokenIds = typeof raw.clobTokenIds === "string"
        ? JSON.parse(raw.clobTokenIds)
        : raw.clobTokenIds;
    } catch { /* ignore */ }
  }

  const yesPrice = parseFloat(outcomePrices[0] || "0.5");
  const noPrice = parseFloat(outcomePrices[1] || "0.5");

  // Pick the best event date: gameStartTime > events[0].startTime > endDate
  const eventDate =
    raw.gameStartTime ||
    (raw.events && raw.events[0] && (raw.events[0].startTime || raw.events[0].eventDate)) ||
    raw.endDate ||
    raw.endDateIso ||
    new Date().toISOString();

  return {
    id: raw.id || raw.conditionId || String(Math.random()),
    question: raw.question || raw.title || "Unknown market",
    description: raw.description || "",
    yes_price: yesPrice,
    no_price: noPrice,
    volume: raw.volumeNum || parseFloat(raw.volume || "0"),
    volume_24h: raw.volume24hr || 0,
    liquidity: raw.liquidityNum || parseFloat(raw.liquidity || "0"),
    end_date: raw.endDate || raw.endDateIso || new Date(Date.now() + 86400000 * 7).toISOString(),
    event_date: eventDate,
    image: raw.image || raw.icon || "",
    category: matchedCategory,
    outcomes: raw.outcomes ? (typeof raw.outcomes === "string" ? JSON.parse(raw.outcomes) : raw.outcomes) : ["Yes", "No"],
    tokens: {
      yes_token_id: tokenIds[0] || "",
      no_token_id: tokenIds[1] || "",
    },
    price_history: generatePriceHistory(yesPrice),
  };
}

function matchCategory(text: string, categories: string[]): string | null {
  const lower = text.toLowerCase();
  for (const cat of categories) {
    const keywords = CATEGORY_KEYWORDS[cat];
    if (keywords && keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return cat;
    }
  }
  return null;
}

function swipeabilityScore(market: Market): number {
  // Markets closer to 50/50 with high volume score higher
  const oddsFactor = 1 - Math.abs(market.yes_price - 0.5) * 2; // 0 to 1, best at 50/50
  const volumeFactor = Math.min(market.volume / 1_000_000, 1); // cap at 1M
  return oddsFactor * 0.6 + volumeFactor * 0.4;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get("categories") || "";
    const requestedCategories = categoriesParam.split(",").filter(Boolean);

    // Check cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      const filtered = requestedCategories.length > 0
        ? cache.data.filter((m) => requestedCategories.includes(m.category))
        : cache.data;
      return NextResponse.json({ markets: filtered });
    }

    // Fetch from Polymarket
    const res = await fetch(
      "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=200&order=volume24hr&ascending=false",
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      throw new Error(`Polymarket API returned ${res.status}`);
    }

    const rawMarkets = await res.json();
    const allCategories = Object.keys(CATEGORY_KEYWORDS);

    // Map and categorize
    const markets: Market[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const raw of (Array.isArray(rawMarkets) ? rawMarkets : [])) {
      const text = `${raw.question || ""} ${raw.description || ""} ${raw.title || ""}`;
      const cat = matchCategory(text, allCategories);
      if (cat) {
        markets.push(mapPolymarketData(raw, cat));
      }
    }

    // Sort by swipeability
    markets.sort((a, b) => swipeabilityScore(b) - swipeabilityScore(a));

    // Cache
    cache = { data: markets, timestamp: Date.now() };

    // Filter by requested categories
    const filtered = requestedCategories.length > 0
      ? markets.filter((m) => requestedCategories.includes(m.category))
      : markets;

    return NextResponse.json({ markets: filtered });
  } catch (error) {
    console.error("Error fetching markets:", error);

    // Return mock markets as fallback
    const mockMarkets = generateMockMarkets();
    const categoriesParam = new URL(request.url).searchParams.get("categories") || "";
    const requestedCategories = categoriesParam.split(",").filter(Boolean);

    const filtered = requestedCategories.length > 0
      ? mockMarkets.filter((m) => requestedCategories.includes(m.category))
      : mockMarkets;

    return NextResponse.json({ markets: filtered });
  }
}

function generateMockMarkets(): Market[] {
  const mocks: Omit<Market, "id">[] = [
    {
      question: "Will the Lakers win the 2025-26 NBA Championship?",
      description: "This market resolves to 'Yes' if the Los Angeles Lakers win the 2025-26 NBA Finals.",
      yes_price: 0.12, no_price: 0.88, volume: 2_450_000, volume_24h: 89_000,
      liquidity: 340_000, end_date: new Date(Date.now() + 86400000 * 90).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 90).toISOString(),
      image: "", category: "nba", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_1_yes", no_token_id: "mock_1_no" },
    },
    {
      question: "Will LeBron James win the 2025-26 NBA MVP award?",
      description: "Market resolves Yes if LeBron James is named the 2025-26 NBA Regular Season MVP.",
      yes_price: 0.08, no_price: 0.92, volume: 1_200_000, volume_24h: 45_000,
      liquidity: 180_000, end_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      image: "", category: "nba", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_2_yes", no_token_id: "mock_2_no" },
    },
    {
      question: "Will the Celtics make the NBA Finals?",
      description: "Resolves Yes if Boston Celtics reach the 2025-26 NBA Finals.",
      yes_price: 0.45, no_price: 0.55, volume: 3_100_000, volume_24h: 120_000,
      liquidity: 520_000, end_date: new Date(Date.now() + 86400000 * 75).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 75).toISOString(),
      image: "", category: "nba", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_3_yes", no_token_id: "mock_3_no" },
    },
    {
      question: "Will the Kansas City Chiefs win Super Bowl LXI?",
      description: "Resolves Yes if the Kansas City Chiefs win Super Bowl LXI.",
      yes_price: 0.22, no_price: 0.78, volume: 5_600_000, volume_24h: 230_000,
      liquidity: 890_000, end_date: new Date(Date.now() + 86400000 * 200).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 200).toISOString(),
      image: "", category: "nfl", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_4_yes", no_token_id: "mock_4_no" },
    },
    {
      question: "Will there be a UFC heavyweight title fight in Q3 2026?",
      description: "Market resolves Yes if any UFC heavyweight championship bout takes place in July-September 2026.",
      yes_price: 0.65, no_price: 0.35, volume: 890_000, volume_24h: 34_000,
      liquidity: 120_000, end_date: new Date(Date.now() + 86400000 * 150).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 150).toISOString(),
      image: "", category: "ufc", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_5_yes", no_token_id: "mock_5_no" },
    },
    {
      question: "Will Jon Jones fight before the end of 2026?",
      description: "Resolves Yes if Jon Jones competes in any sanctioned MMA bout before December 31, 2026.",
      yes_price: 0.35, no_price: 0.65, volume: 1_500_000, volume_24h: 67_000,
      liquidity: 210_000, end_date: new Date(Date.now() + 86400000 * 240).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 240).toISOString(),
      image: "", category: "ufc", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_6_yes", no_token_id: "mock_6_no" },
    },
    {
      question: "Will Trump win the popular vote in the 2028 Presidential primary?",
      description: "Market resolves Yes if Donald Trump wins the most votes in the 2028 Republican presidential primary.",
      yes_price: 0.55, no_price: 0.45, volume: 8_900_000, volume_24h: 450_000,
      liquidity: 1_200_000, end_date: new Date(Date.now() + 86400000 * 400).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 400).toISOString(),
      image: "", category: "politics", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_7_yes", no_token_id: "mock_7_no" },
    },
    {
      question: "Will the Democrats win the 2026 Senate majority?",
      description: "Resolves Yes if Democrats hold the majority in the US Senate after the 2026 midterm elections.",
      yes_price: 0.42, no_price: 0.58, volume: 6_200_000, volume_24h: 310_000,
      liquidity: 950_000, end_date: new Date(Date.now() + 86400000 * 300).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 300).toISOString(),
      image: "", category: "politics", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_8_yes", no_token_id: "mock_8_no" },
    },
    {
      question: "Will a ceasefire in Ukraine be signed by end of 2026?",
      description: "Resolves Yes if a formal ceasefire agreement between Russia and Ukraine is signed before January 1, 2027.",
      yes_price: 0.28, no_price: 0.72, volume: 4_500_000, volume_24h: 190_000,
      liquidity: 670_000, end_date: new Date(Date.now() + 86400000 * 290).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 290).toISOString(),
      image: "", category: "world_events", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_9_yes", no_token_id: "mock_9_no" },
    },
    {
      question: "Will a movie released in 2026 gross over $2 billion worldwide?",
      description: "Resolves Yes if any movie first released in 2026 crosses $2B in worldwide gross box office receipts.",
      yes_price: 0.38, no_price: 0.62, volume: 980_000, volume_24h: 42_000,
      liquidity: 150_000, end_date: new Date(Date.now() + 86400000 * 270).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 270).toISOString(),
      image: "", category: "entertainment", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_10_yes", no_token_id: "mock_10_no" },
    },
    {
      question: "Will Manchester City win the 2025-26 Premier League?",
      description: "Resolves Yes if Manchester City finishes first in the 2025-26 English Premier League season.",
      yes_price: 0.33, no_price: 0.67, volume: 2_800_000, volume_24h: 95_000,
      liquidity: 430_000, end_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 60).toISOString(),
      image: "", category: "soccer", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_11_yes", no_token_id: "mock_11_no" },
    },
    {
      question: "Will Max Verstappen win the 2026 F1 World Championship?",
      description: "Resolves Yes if Max Verstappen wins the 2026 Formula 1 World Drivers' Championship.",
      yes_price: 0.48, no_price: 0.52, volume: 1_900_000, volume_24h: 78_000,
      liquidity: 290_000, end_date: new Date(Date.now() + 86400000 * 200).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 200).toISOString(),
      image: "", category: "f1", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_12_yes", no_token_id: "mock_12_no" },
    },
    {
      question: "Will the Stanley Cup Finals go to 7 games?",
      description: "Resolves Yes if the 2025-26 NHL Stanley Cup Finals series goes to a Game 7.",
      yes_price: 0.30, no_price: 0.70, volume: 750_000, volume_24h: 28_000,
      liquidity: 95_000, end_date: new Date(Date.now() + 86400000 * 80).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 80).toISOString(),
      image: "", category: "hockey", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_13_yes", no_token_id: "mock_13_no" },
    },
    {
      question: "Will the Yankees make the 2026 World Series?",
      description: "Resolves Yes if the New York Yankees reach the 2026 MLB World Series.",
      yes_price: 0.25, no_price: 0.75, volume: 1_100_000, volume_24h: 52_000,
      liquidity: 170_000, end_date: new Date(Date.now() + 86400000 * 150).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 150).toISOString(),
      image: "", category: "mlb", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_14_yes", no_token_id: "mock_14_no" },
    },
    {
      question: "Will Carlos Alcaraz win Wimbledon 2026?",
      description: "Resolves Yes if Carlos Alcaraz wins the men's singles title at the 2026 Wimbledon Championships.",
      yes_price: 0.40, no_price: 0.60, volume: 650_000, volume_24h: 31_000,
      liquidity: 88_000, end_date: new Date(Date.now() + 86400000 * 100).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 100).toISOString(),
      image: "", category: "tennis", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_15_yes", no_token_id: "mock_15_no" },
    },
    {
      question: "Will a 16 seed beat a 1 seed in March Madness 2027?",
      description: "Resolves Yes if any 16-seeded team defeats a 1-seeded team in the 2027 NCAA Men's Basketball Tournament.",
      yes_price: 0.15, no_price: 0.85, volume: 2_200_000, volume_24h: 110_000,
      liquidity: 320_000, end_date: new Date(Date.now() + 86400000 * 365).toISOString(),
      event_date: new Date(Date.now() + 86400000 * 365).toISOString(),
      image: "", category: "college_basketball", outcomes: ["Yes", "No"],
      tokens: { yes_token_id: "mock_16_yes", no_token_id: "mock_16_no" },
    },
  ];

  return mocks.map((m, i) => ({
    ...m,
    id: `mock_${i + 1}`,
    price_history: generatePriceHistory(m.yes_price),
  }));
}
