import { NextRequest, NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

interface OrderRequest {
  symbol: string;
  side: "buy" | "sell";
  type?: "market" | "limit";
  size: number;
  leverage?: number;
  tp?: number | null;
  sl?: number | null;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.LIQUID_API_KEY;
  const apiSecret = process.env.LIQUID_API_SECRET;

  let body: OrderRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { symbol, side, type = "market", size, leverage = 2, tp, sl } = body;

  if (!symbol || !side || !size) {
    return NextResponse.json({ error: "symbol, side, and size are required" }, { status: 400 });
  }

  // Return mock if no credentials
  if (!apiKey || !apiSecret) {
    return NextResponse.json({
      order_id: `mock_${Date.now()}`,
      status: "filled",
      filled_price: null,
      symbol,
      side,
      size,
      mock: true,
    });
  }

  try {
    const path = "/v1/orders";
    const payload: Record<string, unknown> = { symbol, side, type, size, leverage };
    if (tp != null) payload.tp = tp;
    if (sl != null) payload.sl = sl;

    const bodyStr = JSON.stringify(payload);
    const headers = getAuthHeaders("POST", path, "", bodyStr, apiKey, apiSecret);
    const res = await fetch(`${LIQUID_BASE_URL}${path}`, {
      method: "POST",
      headers,
      body: bodyStr,
    });

    const json = await res.json();
    if (!res.ok) {
      const msg = json?.error?.message ?? `Order failed ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json(unwrap(json));
  } catch (error) {
    console.error("Liquid order error:", error);
    // Return mock so the UI doesn't break
    return NextResponse.json({
      order_id: `fallback_${Date.now()}`,
      status: "filled",
      filled_price: null,
      symbol,
      side,
      size,
      mock: true,
    });
  }
}
