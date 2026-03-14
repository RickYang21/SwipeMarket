import { Market, MarketAnalysis } from "@/types/types";

const analysisCache = new Map<string, MarketAnalysis>();

/**
 * Fetch prediction markets from the Polymarket-backed API.
 */
export async function fetchMarkets(
    categories: string[],
    signal?: AbortSignal
): Promise<Market[]> {
    const polymarketCats = categories.filter((c) => c !== "crypto");
    if (polymarketCats.length === 0) return [];

    const res = await fetch(
        `/api/markets?categories=${polymarketCats.join(",")}`,
        { signal }
    );
    if (!res.ok) throw new Error(`Markets API returned ${res.status}`);
    const data = await res.json();
    return data.markets || [];
}

/**
 * Fetch crypto markets from the Liquid-backed API.
 */
export async function fetchCryptoMarkets(
    signal?: AbortSignal
): Promise<Market[]> {
    const res = await fetch("/api/liquid", { signal });
    if (!res.ok) throw new Error(`Liquid API returned ${res.status}`);
    const data = await res.json();
    return data.markets || [];
}

/**
 * Fetch AI analysis for a market. Uses an in-memory cache to avoid
 * duplicate requests. Returns cached results immediately if available.
 */
export async function fetchAnalysis(
    market: Market
): Promise<MarketAnalysis> {
    const cached = analysisCache.get(market.id);
    if (cached) return cached;

    const isCrypto = market.source === "liquid";
    const endpoint = isCrypto
        ? `/api/liquid/${market.id}/analysis`
        : `/api/markets/${market.id}/analysis`;

    const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(market),
    });

    if (!res.ok) throw new Error(`Analysis API returned ${res.status}`);
    const data = await res.json();
    const analysis: MarketAnalysis = data.analysis;

    analysisCache.set(market.id, analysis);
    return analysis;
}

/**
 * Merge polymarket and crypto cards, inserting a crypto card every 3rd position.
 */
export function mergeMarkets(
    polymarketCards: Market[],
    cryptoCards: Market[]
): Market[] {
    if (polymarketCards.length === 0) return cryptoCards;
    if (cryptoCards.length === 0) return polymarketCards;

    const merged: Market[] = [];
    let pIdx = 0;
    let cIdx = 0;

    while (pIdx < polymarketCards.length || cIdx < cryptoCards.length) {
        if (pIdx < polymarketCards.length) merged.push(polymarketCards[pIdx++]);
        if (pIdx < polymarketCards.length) merged.push(polymarketCards[pIdx++]);
        if (cIdx < cryptoCards.length) merged.push(cryptoCards[cIdx++]);
    }

    return merged;
}
