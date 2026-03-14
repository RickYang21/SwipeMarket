/**
 * News Research Module
 * Fetches real-time news articles related to a market question
 * using Brave Search API, then provides structured research context
 * for the AI analysis engine.
 */

export interface NewsArticle {
  title: string;
  url: string;
  snippet: string;
  source: string;
  age: string; // e.g., "2 hours ago", "3 days ago"
}

export interface ResearchResult {
  articles: NewsArticle[];
  query: string;
  timestamp: number;
}

// Cache research results for 10 minutes
const researchCache = new Map<string, ResearchResult>();
const RESEARCH_CACHE_TTL = 10 * 60_000;

/**
 * Extract smart search keywords from a market question.
 * Strips filler words and focuses on the core subject.
 */
function extractSearchQuery(question: string, category: string): string {
  // Remove common prediction market filler phrases
  const fillers = [
    /^will\s+/i,
    /^is\s+/i,
    /^does\s+/i,
    /^can\s+/i,
    /\?$/,
    /\bby\s+(end\s+of\s+)?\d{4}\b/i,
    /\bbefore\s+(end\s+of\s+)?\d{4}\b/i,
    /\bafter\s+the\b/i,
    /\bthis\s+(week|month|year)\b/i,
    /\bresolve\s+to\b/i,
    /\bwin\s+on\s+\d{4}-\d{2}-\d{2}\b/i,
  ];

  let query = question;
  for (const filler of fillers) {
    query = query.replace(filler, "");
  }

  query = query.trim();

  // Add category context for better search results
  const categoryContext: Record<string, string> = {
    nba: "NBA basketball",
    nfl: "NFL football",
    mlb: "MLB baseball",
    hockey: "NHL hockey",
    soccer: "soccer football",
    ufc: "UFC MMA fighting",
    f1: "Formula 1 racing",
    tennis: "tennis",
    politics: "politics",
    world_events: "world news",
    entertainment: "entertainment",
    college_basketball: "NCAA basketball",
    college_football: "NCAA football",
  };

  const context = categoryContext[category] || "";
  return `${query} ${context} latest news 2026`.trim();
}

/**
 * Fetch news articles from Brave Search API.
 * Falls back to a web search if the news endpoint returns nothing.
 */
async function fetchBraveNews(query: string, apiKey: string): Promise<NewsArticle[]> {
  const articles: NewsArticle[] = [];

  try {
    // Try the news search endpoint first
    const newsUrl = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=8&freshness=pw`;
    const newsRes = await fetch(newsUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": apiKey,
      },
    });

    if (newsRes.ok) {
      const newsData = await newsRes.json();
      if (newsData.results && newsData.results.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const r of newsData.results.slice(0, 6)) {
          articles.push({
            title: r.title || "",
            url: r.url || "",
            snippet: r.description || "",
            source: r.meta_url?.hostname || new URL(r.url || "https://unknown").hostname,
            age: r.age || "recent",
          });
        }
      }
    }

    // If news search didn't return enough, supplement with web search
    if (articles.length < 3) {
      const webUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&freshness=pw`;
      const webRes = await fetch(webUrl, {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      });

      if (webRes.ok) {
        const webData = await webRes.json();
        const existingUrls = new Set(articles.map((a) => a.url));
        if (webData.web?.results) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const r of webData.web.results.slice(0, 6)) {
            if (!existingUrls.has(r.url)) {
              articles.push({
                title: r.title || "",
                url: r.url || "",
                snippet: r.description || "",
                source: r.meta_url?.hostname || new URL(r.url || "https://unknown").hostname,
                age: r.age || "recent",
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("Brave Search error:", error);
  }

  return articles.slice(0, 8);
}

/**
 * Main research function — fetches and caches news for a market question.
 */
export async function researchMarket(
  question: string,
  description: string,
  category: string
): Promise<ResearchResult> {
  // Check cache
  const cacheKey = question.toLowerCase().trim();
  const cached = researchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < RESEARCH_CACHE_TTL) {
    return cached;
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    // No API key — return empty research
    return { articles: [], query: "", timestamp: Date.now() };
  }

  const query = extractSearchQuery(question, category);
  const articles = await fetchBraveNews(query, apiKey);

  const result: ResearchResult = {
    articles,
    query,
    timestamp: Date.now(),
  };

  researchCache.set(cacheKey, result);
  return result;
}

/**
 * Format research into a text block for the AI prompt.
 */
export function formatResearchForPrompt(research: ResearchResult): string {
  if (research.articles.length === 0) {
    return "No recent news articles were found for this market.";
  }

  const lines = [`Found ${research.articles.length} recent news articles:\n`];

  for (let i = 0; i < research.articles.length; i++) {
    const a = research.articles[i];
    lines.push(`[${i + 1}] "${a.title}" (${a.source}, ${a.age})`);
    if (a.snippet) {
      lines.push(`    ${a.snippet}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
