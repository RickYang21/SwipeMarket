import { NextResponse } from "next/server";
import { LIQUID_BASE_URL, getAuthHeaders, unwrap } from "@/lib/liquidAuth";

const MOCK_ACCOUNT = {
  equity: 10000,
  available_balance: 8500,
  margin_used: 1500,
  account_value: 10000,
};

export async function GET() {
  const apiKey = process.env.LIQUID_API_KEY;
  const apiSecret = process.env.LIQUID_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(MOCK_ACCOUNT);
  }

  try {
    const path = "/v1/account";
    const headers = getAuthHeaders("GET", path, "", "", apiKey, apiSecret);
    const res = await fetch(`${LIQUID_BASE_URL}${path}`, { headers });
    if (!res.ok) throw new Error(`Account ${res.status}`);
    return NextResponse.json(unwrap(await res.json()));
  } catch (error) {
    console.error("Liquid account error:", error);
    return NextResponse.json(MOCK_ACCOUNT);
  }
}
