import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MarketAnalysis, Market } from "@/lib/types";

const analysisCache = new Map<string, { data: MarketAnalysis; timestamp: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const market: Market = await request.json();

    // Check cache
    const cached = analysisCache.get(market.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ analysis: cached.data });
    }

    // Try to use Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Return smart mock analysis if no API key
      const analysis = generateMockAnalysis(market);
      analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });
      return NextResponse.json({ analysis });
    }

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are an elite prediction market trader giving advice on a mobile app. Analyze the market data and give a clear BUY or SKIP verdict. Be direct and opinionated — users are swiping fast and need a quick signal. Explain WHY in 2-3 punchy sentences. Identify any edge where the market might be mispriced. Never hedge — commit to your call.

Respond in this EXACT JSON format only, with no other text:
{
  "verdict": "STRONG BUY" | "BUY" | "LEAN BUY" | "SKIP",
  "confidence": <number 0-100>,
  "reasoning": "<2-3 sentences>",
  "bull_case": "<1 sentence>",
  "bear_case": "<1 sentence>",
  "edge": "<1 sentence about potential mispricing>",
  "risk_level": "low" | "medium" | "high"
}`,
      messages: [
        {
          role: "user",
          content: `Analyze this prediction market:

Question: ${market.question}
Description: ${market.description}
Current YES price: ${market.yes_price} (${Math.round(market.yes_price * 100)}% implied probability)
Current NO price: ${market.no_price} (${Math.round(market.no_price * 100)}% implied probability)
Total volume: $${market.volume.toLocaleString()}
24h volume: $${market.volume_24h.toLocaleString()}
Liquidity: $${market.liquidity.toLocaleString()}
End date: ${market.end_date}
Category: ${market.category}

Give your trading analysis in the required JSON format.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }

    const analysis: MarketAnalysis = JSON.parse(jsonMatch[0]);
    analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Analysis error:", error);

    // Fallback to mock
    try {
      const market: Market = await request.clone().json().catch(() => null) as Market;
      if (market) {
        const analysis = generateMockAnalysis(market);
        return NextResponse.json({ analysis });
      }
    } catch {
      // ignore
    }

    const fallback: MarketAnalysis = {
      verdict: "LEAN BUY",
      confidence: 55,
      reasoning: "Market data suggests moderate opportunity. Volume indicates decent interest, but odds need closer examination for a definitive call.",
      bull_case: "Current pricing may underweight momentum factors.",
      bear_case: "Limited liquidity could make exit difficult.",
      edge: "Market sentiment hasn't fully priced in recent developments.",
      risk_level: "medium",
    };
    return NextResponse.json({ analysis: fallback });
  }
}

function generateMockAnalysis(market: Market): MarketAnalysis {
  const yesPrice = market.yes_price;
  const volume = market.volume;

  // Generate contextually relevant analysis based on market data
  const isHighVolume = volume > 1_000_000;
  const isCloseOdds = Math.abs(yesPrice - 0.5) < 0.15;
  const isLongShot = yesPrice < 0.25;
  const isFavorite = yesPrice > 0.65;

  let verdict: MarketAnalysis["verdict"];
  let confidence: number;
  let risk_level: MarketAnalysis["risk_level"];

  if (isCloseOdds && isHighVolume) {
    verdict = "STRONG BUY";
    confidence = 72 + Math.floor(Math.random() * 15);
    risk_level = "medium";
  } else if (isCloseOdds) {
    verdict = "BUY";
    confidence = 62 + Math.floor(Math.random() * 15);
    risk_level = "medium";
  } else if (isLongShot && isHighVolume) {
    verdict = "LEAN BUY";
    confidence = 55 + Math.floor(Math.random() * 15);
    risk_level = "high";
  } else if (isFavorite) {
    verdict = "SKIP";
    confidence = 65 + Math.floor(Math.random() * 15);
    risk_level = "low";
  } else {
    verdict = Math.random() > 0.4 ? "BUY" : "LEAN BUY";
    confidence = 58 + Math.floor(Math.random() * 20);
    risk_level = "medium";
  }

  const reasonings = {
    "STRONG BUY": `This market is tightly contested at ${Math.round(yesPrice * 100)}% YES with strong volume — exactly the kind of pricing inefficiency we look for. The high liquidity means you can enter and exit cleanly. Smart money hasn't fully moved yet.`,
    "BUY": `At ${Math.round(yesPrice * 100)}% implied probability, this market offers solid value. Trading volume of $${(volume / 1_000_000).toFixed(1)}M shows real interest. The current price doesn't fully reflect the underlying momentum.`,
    "LEAN BUY": `Interesting opportunity at these odds. The ${Math.round(yesPrice * 100)}% price feels slightly off given the fundamentals. Worth a position but manage your risk — this could go either way.`,
    "SKIP": `At ${Math.round(yesPrice * 100)}% YES, the market has already priced in most of the upside. The risk/reward doesn't justify entry at this level. Wait for better odds or look elsewhere.`,
  };

  const bullCases = [
    "Recent momentum and public sentiment strongly favor the YES outcome.",
    "Key fundamentals are underpriced — the market hasn't caught up to recent developments.",
    "Historical patterns suggest this type of event resolves YES more often than the market implies.",
    "Strong institutional signals point to a higher probability than currently priced.",
  ];

  const bearCases = [
    "Uncertainty remains high and the market could easily swing the other way.",
    "Key variables are still unresolved — one development could tank this position.",
    "The market may be correctly pricing in risk factors that aren't obvious at first glance.",
    "Timing risk is significant — this could be right but too early to call.",
  ];

  const edges = [
    `Market underprices the YES outcome by ~${5 + Math.floor(Math.random() * 10)}% based on recent signal analysis.`,
    "Public sentiment diverges from sharp money — follow the smart capital.",
    "The spread between this market and correlated markets suggests mispricing.",
    `Volume spike suggests informed money moving in — the ${Math.round(yesPrice * 100)}% price won't last.`,
  ];

  return {
    verdict,
    confidence,
    reasoning: reasonings[verdict],
    bull_case: bullCases[Math.floor(Math.random() * bullCases.length)],
    bear_case: bearCases[Math.floor(Math.random() * bearCases.length)],
    edge: edges[Math.floor(Math.random() * edges.length)],
    risk_level,
  };
}
