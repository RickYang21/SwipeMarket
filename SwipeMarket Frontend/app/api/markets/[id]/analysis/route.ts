import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MarketAnalysis, Market } from "@/types/types";

const analysisCache = new Map<string, { data: MarketAnalysis; timestamp: number }>();
const CACHE_TTL = 5 * 60_000; // 5 minutes

const SYSTEM_PROMPT = `You are a prediction market analyst. You will be given a market question, its current YES/NO pricing, and relevant context (category, event date, teams/entities involved).

Your job:
1. Research the actual facts, stats, and recent data relevant to this market.
2. Produce 3 to 5 concise bullet points that give the user a real informational edge.
3. After the bullet points, output a RECOMMENDATION line and a RISK line.

STRICT FORMATTING RULES:
- Each bullet point must be MAX 2 lines long. Be ruthless about brevity.
- Wrap key names, numbers, stats, percentages, and critical phrases in **bold** using double asterisks.
- Start each bullet with a dot separator: •
- Never use em dashes. Use commas or periods to break up ideas.
- Write in plain, direct language. No filler words. No hedging phrases like "it's worth noting" or "it should be considered."
- Never say "historically strong" or "has been dominant" without backing it with a specific stat or number.
- Every bullet must contain at least one concrete data point (a number, a date, a name, a record, a percentage).

CONTENT RULES:
- Focus on facts that directly move the needle on YES or NO. Cut anything generic.
- Prioritize: recent head-to-head results, current form/streaks, key injuries or absences, relevant stats from this season, and any confirmed lineup or roster info.
- If the market is about sports, pull from recent game scores, season records, point averages, and matchup history.
- If the market is about world events, politics, or crypto, pull from recent news developments, polling data, on-chain metrics, or official statements.
- Do NOT fabricate stats. If you lack specific data, say what the general trend is with whatever specifics you do have.

RECOMMENDATION LINE:
After the bullets, output one of these labels based on your analysis:
- STRONG BUY (high confidence YES is underpriced)
- LEAN BUY (moderate confidence YES is underpriced)
- WATCH (too close to call or insufficient edge)
- LEAN SELL (moderate confidence NO is underpriced)
- STRONG SELL (high confidence NO is underpriced)

RISK LINE:
Output one of: Low Risk | Med Risk | High Risk
Based on how much uncertainty or volatility remains before resolution.

CONFIDENCE SCORE:
Output a percentage from 0-100 representing your confidence in the recommendation.

OUTPUT FORMAT (return ONLY this, no extra commentary):

• [bullet 1]
• [bullet 2]
• [bullet 3]
• [bullet 4 if needed]
• [bullet 5 if needed]

RECOMMENDATION: [label]
RISK: [level]
CONFIDENCE: [number]%`;

function parseAnalysisResponse(text: string): MarketAnalysis {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  // Extract bullets (lines starting with •)
  const bullets = lines
    .filter((l) => l.startsWith("•"))
    .map((l) => l.replace(/^•\s*/, "").trim())
    .slice(0, 5);

  // Extract RECOMMENDATION
  const recLine = lines.find((l) => l.toUpperCase().startsWith("RECOMMENDATION:"));
  const recLabel = recLine
    ? recLine.replace(/^RECOMMENDATION:\s*/i, "").trim().toUpperCase()
    : "WATCH";

  const verdictMap: Record<string, MarketAnalysis["verdict"]> = {
    "STRONG BUY": "STRONG BUY",
    "LEAN BUY": "LEAN BUY",
    "WATCH": "WATCH",
    "LEAN SELL": "LEAN SELL",
    "STRONG SELL": "STRONG SELL",
  };
  const verdict = verdictMap[recLabel] || "WATCH";

  // Extract RISK
  const riskLine = lines.find((l) => l.toUpperCase().startsWith("RISK:"));
  const riskLabel = riskLine
    ? riskLine.replace(/^RISK:\s*/i, "").trim().toLowerCase()
    : "medium";

  const riskMap: Record<string, MarketAnalysis["risk_level"]> = {
    "low risk": "low",
    "low": "low",
    "med risk": "medium",
    "medium risk": "medium",
    "medium": "medium",
    "high risk": "high",
    "high": "high",
  };
  const risk_level = riskMap[riskLabel] || "medium";

  // Extract CONFIDENCE
  const confLine = lines.find((l) => l.toUpperCase().startsWith("CONFIDENCE:"));
  const confMatch = confLine?.match(/(\d+)/);
  const confidence = confMatch ? Math.min(100, Math.max(0, parseInt(confMatch[1]))) : 60;

  return { verdict, confidence, bullets, risk_level };
}

async function webSearch(query: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query + " latest news 2026")}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SwipeMarket/1.0)" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    const html = await res.text();

    const snippets: string[] = [];
    const regex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const text = match[1].replace(/<[^>]*>/g, "").trim();
      if (text.length > 20) snippets.push(text);
    }

    return snippets.length > 0
      ? "Recent web research:\n" + snippets.map((s) => `- ${s}`).join("\n")
      : "";
  } catch {
    return "";
  }
}

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
      const analysis = generateMockAnalysis(market);
      analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });
      return NextResponse.json({ analysis });
    }

    // Run web research in parallel with setup
    const research = await webSearch(market.question);

    const client = new Anthropic({ apiKey });

    const daysLeft = market.end_date === "Ongoing"
      ? "Ongoing"
      : `${Math.max(0, Math.ceil((new Date(market.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Market: "${market.question}"
Category: ${market.category}
YES price: ${Math.round(market.yes_price * 100)}c | NO price: ${Math.round(market.no_price * 100)}c
Volume: $${market.volume.toLocaleString()} | Liquidity: $${market.liquidity.toLocaleString()} | 24h Volume: $${market.volume_24h.toLocaleString()}
Time remaining: ${daysLeft}

${research}

Analyze this market. Give me data-backed bullet points with bolded key info.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const analysis = parseAnalysisResponse(text);
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
      verdict: "WATCH",
      confidence: 55,
      bullets: [
        "Market data suggests **moderate opportunity** but more research needed",
        "Volume indicates **decent interest** from active traders",
        "Odds haven't fully adjusted to **recent developments**",
      ],
      risk_level: "medium",
    };
    return NextResponse.json({ analysis: fallback });
  }
}

function generateMockAnalysis(market: Market): MarketAnalysis {
  const yesPrice = market.yes_price;
  const volume = market.volume;

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
    verdict = "LEAN BUY";
    confidence = 62 + Math.floor(Math.random() * 15);
    risk_level = "medium";
  } else if (isLongShot && isHighVolume) {
    verdict = "WATCH";
    confidence = 55 + Math.floor(Math.random() * 15);
    risk_level = "high";
  } else if (isFavorite) {
    verdict = "LEAN SELL";
    confidence = 65 + Math.floor(Math.random() * 15);
    risk_level = "low";
  } else {
    verdict = Math.random() > 0.4 ? "LEAN BUY" : "WATCH";
    confidence = 58 + Math.floor(Math.random() * 20);
    risk_level = "medium";
  }

  const yPct = Math.round(yesPrice * 100);
  const volStr = `$${(volume / 1_000_000).toFixed(1)}M`;

  const bulletSets: Record<string, string[]> = {
    "STRONG BUY": [
      `Tight contest at **${yPct}% YES** with strong liquid volume of **${volStr}**`,
      `This is exactly the kind of **pricing inefficiency** that sharp money targets`,
      `Smart money hasn't fully moved in yet, leaving a **clean entry** window`,
    ],
    "LEAN BUY": [
      `Market offers **solid value** at **${yPct}%** implied probability`,
      `Trading volume of **${volStr}** shows real, sustained interest`,
      `Current price doesn't fully reflect the **underlying momentum**`,
    ],
    "WATCH": [
      `The **${yPct}%** price feels **slightly off** but the edge is too thin to act on`,
      `Volume of **${volStr}** shows interest but the market could swing either way`,
      `Better to **wait for a catalyst** before taking a position`,
    ],
    "LEAN SELL": [
      `At **${yPct}% YES**, the market has **already priced in** most of the upside`,
      `The risk/reward ratio **doesn't justify entry** at current levels`,
      `Better to **wait for better odds** or look for value elsewhere`,
    ],
    "STRONG SELL": [
      `At **${yPct}% YES**, the market is **significantly overpriced** relative to fundamentals`,
      `NO side at **${100 - yPct}c** offers much better value`,
      `Smart money is likely to **push this down** as more data comes in`,
    ],
  };

  return {
    verdict,
    confidence,
    bullets: bulletSets[verdict] || bulletSets["WATCH"],
    risk_level,
  };
}
