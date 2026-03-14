import { NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

const MOCK_POSITIONS = [
  {
    symbol: "BTC-PERP",
    side: "buy",
    size: 0.001,
    entry_price: 93500,
    mark_price: 94231,
    leverage: 2,
    unrealized_pnl: 0.73,
    liquidation_price: 47000,
    margin_used: 46.75,
  },
];

export async function GET() {
  const apiKey = process.env.LIQUID_API_KEY;
  const apiSecret = process.env.LIQUID_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ positions: MOCK_POSITIONS });
  }

  try {
    const path = "/v1/account/positions";
    const headers = getAuthHeaders("GET", path, "", "", apiKey, apiSecret);
    const res = await fetch(`${LIQUID_BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`Positions ${res.status}`);
    const data = unwrap(await res.json());
    return NextResponse.json({ positions: Array.isArray(data) ? data : [] });
  } catch (error) {
    console.error("Liquid positions error:", error);
    return NextResponse.json({ positions: MOCK_POSITIONS });
  }
}
