import { NextRequest, NextResponse } from "next/server";

// Fetch current YES prices for a list of Polymarket market IDs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get("ids") || "";
  const ids = idsParam.split(",").filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ prices: {} });
  }

  try {
    const res = await fetch(
      `https://gamma-api.polymarket.com/markets?ids=${encodeURIComponent(idsParam)}&limit=${ids.length}`,
      { headers: { Accept: "application/json" } }
    );

    if (!res.ok) {
      return NextResponse.json({ prices: {} }, { status: 502 });
    }

    const raw = await res.json();
    const prices: Record<string, number> = {};

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const market of (Array.isArray(raw) ? raw : [])) {
      const id = market.id || market.conditionId;
      if (!id) continue;

      let outcomePrices: string[] = [];
      if (market.outcomePrices) {
        try {
          outcomePrices = typeof market.outcomePrices === "string"
            ? JSON.parse(market.outcomePrices)
            : market.outcomePrices;
        } catch { /* ignore */ }
      }

      const yesPrice = parseFloat(outcomePrices[0] || "0");
      if (yesPrice > 0) {
        prices[id] = yesPrice;
      }
    }

    return NextResponse.json({ prices });
  } catch {
    return NextResponse.json({ prices: {} }, { status: 502 });
  }
}
