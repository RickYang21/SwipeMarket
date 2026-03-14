import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MarketAnalysis } from "@/lib/types";
import { CryptoMarket } from "@/lib/liquid";

const analysisCache = new Map<string, { data: MarketAnalysis; timestamp: number }>();
const CACHE_TTL = 2 * 60_000; // 2 minutes for crypto

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
      system: `You are an elite crypto analyst on a mobile trading app. You combine price action data with real-world research to give clear, actionable signals.

Your analysis must be scannable — users swipe through fast.

FORMATTING RULES:
- Use bullet points (start each line with •) for reasoning, bull_case, and bear_case
- Bold **key terms** that help users scan (coin names, percentages, price levels, key facts)
- Keep each bullet to ONE short sentence
- Be specific — cite real numbers and events, not generic statements

Respond ONLY in this exact JSON format:
{
  "verdict": "STRONG BUY" | "BUY" | "LEAN BUY" | "SKIP",
  "confidence": <number 0-100>,
  "reasoning": "<3-4 bullet points starting with •, separated by \\n, with **bold** key terms>",
  "bull_case": "<1-2 bullet points starting with •>",
  "bear_case": "<1-2 bullet points starting with •>",
  "edge": "<1 sentence about where the opportunity is, **bold** the key insight>",
  "risk_level": "low" | "medium" | "high"
}`,
      messages: [
        {
          role: "user",
          content: `Analyze this crypto pair:

Pair: ${market.currency_pair_code}
Base currency: ${market.base_currency}
Current price: $${market.current_price}
24h ago price: $${market.price_24h_ago}
24h change: ${market.price_change_pct >= 0 ? "+" : ""}${market.price_change_pct.toFixed(2)}%
24h high: $${market.high_24h}
24h low: $${market.low_24h}
24h volume (USD): $${market.volume.toLocaleString()}
Spread: $${market.spread.toFixed(4)}

${research}

Give your trading analysis in the required JSON format. Reference specific facts from the research where relevant.`,
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
      verdict: "LEAN BUY",
      confidence: 55,
      reasoning: "• Crypto momentum looks **moderate** right now\n• Volume suggests **decent activity** but watch for reversal signals\n• Price action is **inconclusive** — wait for confirmation",
      bull_case: "• Current momentum could **continue** if volume holds",
      bear_case: "• Crypto can **reverse quickly** — extended moves often pull back",
      edge: "Price-action suggests the market hasn't fully priced in **recent momentum**",
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
    verdict = "BUY";
    confidence = 65 + Math.floor(Math.random() * 12);
    risk_level = "medium";
  } else if (isBullish && !isNearHigh) {
    verdict = "LEAN BUY";
    confidence = 58 + Math.floor(Math.random() * 12);
    risk_level = "medium";
  } else if (isNearHigh) {
    verdict = "SKIP";
    confidence = 60 + Math.floor(Math.random() * 15);
    risk_level = "high";
  } else {
    verdict = Math.random() > 0.4 ? "BUY" : "LEAN BUY";
    confidence = 55 + Math.floor(Math.random() * 15);
    risk_level = "medium";
  }

  const base = market.base_currency;
  const dir = pctChange >= 0 ? "up" : "down";
  const pct = `${Math.abs(pctChange).toFixed(1)}%`;

  const reasonings: Record<string, string> = {
    "STRONG BUY": `• **${base}** is ${dir} **${pct}** and trading near the **24h low** — classic dip-buy\n• Volume is strong at **$${(market.volume / 1_000_000).toFixed(1)}M**, confirming real buyer interest\n• Spread is **tight enough** for a clean entry and exit`,
    "BUY": `• **${base}** shows solid momentum, ${dir} **${pct}** with healthy volume\n• Price sits in a **favorable range** — not overextended but showing conviction\n• Good **risk/reward** setup for a swing position`,
    "LEAN BUY": `• **${base}** is ${dir} **${pct}** with moderate signals\n• Opportunity exists but the setup **isn't perfect** — size accordingly\n• Watch the **24h range boundaries** for confirmation`,
    "SKIP": `• **${base}** is near the **24h high** after a **${pct}** move — too extended\n• **Pullback risk** outweighs remaining upside at this level\n• Better to **wait for a dip** or look at other pairs`,
  };

  return {
    verdict,
    confidence,
    reasoning: reasonings[verdict],
    bull_case: pctChange >= 0
      ? `• Bullish momentum of **+${pct}** could continue with volume support`
      : `• **Oversold** bounce potential — ${base} has room to recover from **${pct}** dip`,
    bear_case: isNearHigh
      ? `• Extended near **24h high** — profit-taking could trigger a sharp pullback`
      : `• Crypto volatility means any position can **reverse 5-10%** without warning`,
    edge: isNearLow
      ? `Price near **24h low** creates favorable risk/reward — limited downside with **significant upside**`
      : `Spread of **$${market.spread.toFixed(2)}** suggests decent liquidity for clean execution`,
    risk_level,
  };
}
