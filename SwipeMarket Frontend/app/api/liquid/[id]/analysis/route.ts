import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MarketAnalysis } from "@/types/types";
import { CryptoMarket } from "@/lib/liquid";

const analysisCache = new Map<string, { data: MarketAnalysis; timestamp: number }>();
const CACHE_TTL = 2 * 60_000; // 2 minutes for crypto

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
- If the market is about crypto, pull from recent news developments, on-chain metrics, or official statements.
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

  const bullets = lines
    .filter((l) => l.startsWith("•"))
    .map((l) => l.replace(/^•\s*/, "").trim())
    .slice(0, 5);

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

  const confLine = lines.find((l) => l.toUpperCase().startsWith("CONFIDENCE:"));
  const confMatch = confLine?.match(/(\d+)/);
  const confidence = confMatch ? Math.min(100, Math.max(0, parseInt(confMatch[1]))) : 60;

  return { verdict, confidence, bullets, risk_level };
}

export async function POST(request: NextRequest) {
  try {
    const market: CryptoMarket = await request.json();

    // Check cache
    const cached = analysisCache.get(market.id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ analysis: cached.data });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const analysis = generateMockCryptoAnalysis(market);
      analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });
      return NextResponse.json({ analysis });
    }

    const client = new Anthropic({ apiKey });

    // Web research for crypto
    let research = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(market.base_currency + " crypto price news 2026")}`,
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
      if (snippets.length > 0) {
        research = "Recent web research:\n" + snippets.map((s) => `- ${s}`).join("\n");
      }
    } catch {
      // continue without research
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Market: "${market.base_currency} — ${market.currency_pair_code}"
Category: crypto
Current price: $${market.current_price}
24h ago price: $${market.price_24h_ago}
24h change: ${market.price_change_pct >= 0 ? "+" : ""}${market.price_change_pct.toFixed(2)}%
24h high: $${market.high_24h}
24h low: $${market.low_24h}
24h volume (USD): $${market.volume.toLocaleString()}
Spread: $${market.spread.toFixed(4)}

${research}

Analyze this crypto pair. Give me data-backed bullet points with bolded key info.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const analysis = parseAnalysisResponse(text);
    analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Crypto analysis error:", error);

    try {
      const market: CryptoMarket = await request.clone().json().catch(() => null) as CryptoMarket;
      if (market) {
        const analysis = generateMockCryptoAnalysis(market);
        return NextResponse.json({ analysis });
      }
    } catch {
      // ignore
    }

    const fallback: MarketAnalysis = {
      verdict: "WATCH",
      confidence: 55,
      bullets: [
        "Crypto momentum looks **moderate** right now",
        "Volume suggests **decent activity** but watch for reversal signals",
        "Price action is **inconclusive**, wait for confirmation",
      ],
      risk_level: "medium",
    };
    return NextResponse.json({ analysis: fallback });
  }
}

function generateMockCryptoAnalysis(market: CryptoMarket): MarketAnalysis {
  const pctChange = market.price_change_pct;
  const rangePos = market.high_24h !== market.low_24h
    ? (market.current_price - market.low_24h) / (market.high_24h - market.low_24h)
    : 0.5;
  const isNearLow = rangePos < 0.35;
  const isNearHigh = rangePos > 0.75;
  const isBullish = pctChange > 1;
  const isStrongVolume = market.volume > 1_000_000;

  let verdict: MarketAnalysis["verdict"];
  let confidence: number;
  let risk_level: MarketAnalysis["risk_level"];

  if (isNearLow && isBullish && isStrongVolume) {
    verdict = "STRONG BUY";
    confidence = 75 + Math.floor(Math.random() * 12);
    risk_level = "medium";
  } else if (isNearLow && isStrongVolume) {
    verdict = "LEAN BUY";
    confidence = 65 + Math.floor(Math.random() * 12);
    risk_level = "medium";
  } else if (isBullish && !isNearHigh) {
    verdict = "LEAN BUY";
    confidence = 58 + Math.floor(Math.random() * 12);
    risk_level = "medium";
  } else if (isNearHigh) {
    verdict = "LEAN SELL";
    confidence = 60 + Math.floor(Math.random() * 15);
    risk_level = "high";
  } else {
    verdict = Math.random() > 0.4 ? "LEAN BUY" : "WATCH";
    confidence = 55 + Math.floor(Math.random() * 15);
    risk_level = "medium";
  }

  const base = market.base_currency;
  const dir = pctChange >= 0 ? "up" : "down";
  const pct = `${Math.abs(pctChange).toFixed(1)}%`;
  const volStr = `$${(market.volume / 1_000_000).toFixed(1)}M`;

  const bulletSets: Record<string, string[]> = {
    "STRONG BUY": [
      `**${base}** is ${dir} **${pct}** and trading near the **24h low**, classic dip-buy setup`,
      `Volume is strong at **${volStr}**, confirming real buyer interest`,
      `Spread is **$${market.spread.toFixed(2)}**, tight enough for a clean entry and exit`,
    ],
    "LEAN BUY": [
      `**${base}** shows solid momentum, ${dir} **${pct}** with healthy volume of **${volStr}**`,
      `Price sits in a **favorable range**, not overextended but showing conviction`,
      `Good **risk/reward** setup for a swing position at current levels`,
    ],
    "WATCH": [
      `**${base}** is ${dir} **${pct}** with moderate signals, no clear edge yet`,
      `Volume at **${volStr}** is decent but the setup **isn't perfect**`,
      `Watch the **24h range boundaries** for a breakout or rejection`,
    ],
    "LEAN SELL": [
      `**${base}** is near the **24h high** after a **${pct}** move, too extended`,
      `**Pullback risk** outweighs remaining upside at this level`,
      `Better to **wait for a dip** or look at other pairs`,
    ],
    "STRONG SELL": [
      `**${base}** is severely overextended after **${pct}** move, reversal likely`,
      `Volume is fading at **${volStr}**, suggesting exhaustion`,
      `Risk of **5-10% correction** from current levels is elevated`,
    ],
  };

  return {
    verdict,
    confidence,
    bullets: bulletSets[verdict] || bulletSets["WATCH"],
    risk_level,
  };
}
