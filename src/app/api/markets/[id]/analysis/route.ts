import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MarketAnalysis, Market } from "@/lib/types";
import { researchMarket, formatResearchForPrompt } from "@/lib/news-research";

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
      const analysis = generateMockAnalysis(market);
      analysisCache.set(market.id, { data: analysis, timestamp: Date.now() });
      return NextResponse.json({ analysis });
    }

    // Step 1: Research — fetch real news about this market
    const research = await researchMarket(
      market.question,
      market.description,
      market.category
    );

    const researchText = formatResearchForPrompt(research);
    const hasResearch = research.articles.length > 0;

    // Step 2: Build the AI prompt with research context
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are SwipeMarket's AI Research Analyst — the smartest prediction market brain on the planet. You do what no other app does: you independently research each market by reading real news, then form your OWN probability estimate BEFORE looking at what the market thinks.

Your job:
1. Read the news articles provided and extract every relevant fact
2. Form YOUR OWN probability estimate for the YES outcome (0-100%) — this must be YOUR independent assessment based on the evidence, NOT influenced by the market price
3. Compare your estimate to the market price to find the edge
4. Give a clear, opinionated verdict

CRITICAL FORMATTING RULES for "reasoning":
- Use bullet points starting with "• " (bullet character + space)
- Each bullet should be ONE short, punchy fact or insight
- Wrap THE most important keyword or fact in each bullet with **double asterisks** for emphasis
- Use 2-4 bullets, keep each bullet to ~15 words max
- Never write a wall of text. Users are swiping fast.

Example reasoning format:
"• **Injured starting QB** ruled out per ESPN, massive impact on spread\n• Team is **2-7 on the road** this season, worst in the conference\n• Market at 65% feels high — our model says **~48%** is fair value"

Rules:
- Be specific — cite actual facts from the articles (e.g., "per ESPN, the starting QB is out with a knee injury")
- Never be generic. Users came here for YOUR research edge, not "market sentiment" platitudes
- If the news contradicts the market price, call it out aggressively
- If you find no useful news, say so honestly and analyze based on what you know

Respond in EXACTLY this JSON format, nothing else:
{
  "verdict": "STRONG BUY" | "BUY" | "LEAN BUY" | "SKIP",
  "confidence": <number 0-100>,
  "ai_probability": <number 0-100, YOUR independent YES probability>,
  "reasoning": "<2-4 bullet points with • prefix and **bold** key facts, separated by \\n>",
  "bull_case": "<1 sentence>",
  "bear_case": "<1 sentence>", 
  "edge": "<1 sentence comparing your probability to the market's>",
  "risk_level": "low" | "medium" | "high",
  "sources_used": [<indices of articles you actually cited, e.g. [1, 3, 5]>]
}`;

    const userMessage = `Analyze this prediction market using the research below.

═══ MARKET DATA ═══
Question: ${market.question}
Description: ${market.description}
Category: ${market.category}
End date: ${market.end_date}

Current YES price: $${market.yes_price.toFixed(2)} (${Math.round(market.yes_price * 100)}% implied probability)
Current NO price: $${market.no_price.toFixed(2)} (${Math.round(market.no_price * 100)}% implied probability)
Total volume: $${market.volume.toLocaleString()}
24h volume: $${market.volume_24h.toLocaleString()}
Liquidity: $${market.liquidity.toLocaleString()}

═══ NEWS RESEARCH ═══
${researchText}

═══ INSTRUCTIONS ═══
${hasResearch
  ? "Use the research above to form YOUR OWN probability estimate. Cite specific facts from the articles in your reasoning. Then compare your estimate to the market price to find any edge."
  : "No news research was available. Analyze based on the market data, your knowledge, and the question itself. Be honest that research was limited."
}

Give your analysis in the required JSON format.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Map sources_used indices back to actual article references
    const sources: { title: string; url: string }[] = [];
    if (parsed.sources_used && research.articles.length > 0) {
      for (const idx of parsed.sources_used) {
        const article = research.articles[idx - 1]; // 1-indexed
        if (article) {
          sources.push({ title: article.title, url: article.url });
        }
      }
    }

    const analysis: MarketAnalysis = {
      verdict: parsed.verdict,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      bull_case: parsed.bull_case,
      bear_case: parsed.bear_case,
      edge: parsed.edge,
      risk_level: parsed.risk_level,
      ai_probability: parsed.ai_probability,
      sources,
    };

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

  const isHighVolume = volume > 1_000_000;
  const isCloseOdds = Math.abs(yesPrice - 0.5) < 0.15;
  const isLongShot = yesPrice < 0.25;
  const isFavorite = yesPrice > 0.65;

  let verdict: MarketAnalysis["verdict"];
  let confidence: number;
  let risk_level: MarketAnalysis["risk_level"];
  let ai_probability: number;

  if (isCloseOdds && isHighVolume) {
    verdict = "STRONG BUY";
    confidence = 72 + Math.floor(Math.random() * 15);
    risk_level = "medium";
    ai_probability = Math.round(yesPrice * 100) + Math.floor(Math.random() * 10) - 5;
  } else if (isCloseOdds) {
    verdict = "BUY";
    confidence = 62 + Math.floor(Math.random() * 15);
    risk_level = "medium";
    ai_probability = Math.round(yesPrice * 100) + Math.floor(Math.random() * 15) - 7;
  } else if (isLongShot && isHighVolume) {
    verdict = "LEAN BUY";
    confidence = 55 + Math.floor(Math.random() * 15);
    risk_level = "high";
    ai_probability = Math.round(yesPrice * 100) + Math.floor(Math.random() * 12);
  } else if (isFavorite) {
    verdict = "SKIP";
    confidence = 65 + Math.floor(Math.random() * 15);
    risk_level = "low";
    ai_probability = Math.round(yesPrice * 100) - Math.floor(Math.random() * 10);
  } else {
    verdict = Math.random() > 0.4 ? "BUY" : "LEAN BUY";
    confidence = 58 + Math.floor(Math.random() * 20);
    risk_level = "medium";
    ai_probability = Math.round(yesPrice * 100) + Math.floor(Math.random() * 16) - 8;
  }

  // Clamp probability
  ai_probability = Math.max(1, Math.min(99, ai_probability));

  const reasonings = {
    "STRONG BUY": `• Tight contest at **${Math.round(yesPrice * 100)}% YES** with strong liquid volume\n• This is exactly the kind of **pricing inefficiency** we look for\n• Smart money hasn't fully moved in yet, leaving a **clean entry/exit** window`,
    "BUY": `• Market offers **solid value** at ${Math.round(yesPrice * 100)}% implied probability\n• High trading volume of **$${(volume / 1_000_000).toFixed(1)}M** shows real interest\n• Current price doesn't fully reflect the **underlying momentum**`,
    "LEAN BUY": `• The ${Math.round(yesPrice * 100)}% price feels **slightly off** given fundamentals\n• Offers an **interesting opportunity** but requires risk management\n• Market could easily swing, so size your position **conservatively**`,
    "SKIP": `• At ${Math.round(yesPrice * 100)}% YES, the market has **already priced in** the upside\n• The risk/reward ratio **doesn't justify entry** at this high level\n• Better to **wait for better odds** or look for value elsewhere`,
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
    ai_probability,
    sources: [],
  };
}
