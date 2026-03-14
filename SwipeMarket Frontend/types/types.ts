export interface Market {
  id: string;
  question: string;
  description: string;
  yes_price: number;
  no_price: number;
  volume: number;
  volume_24h: number;
  liquidity: number;
  end_date: string;
  event_date: string;
  image: string;
  category: string;
  outcomes: string[];
  tokens: {
    yes_token_id: string;
    no_token_id: string;
  };
  price_history?: number[];
  source?: "polymarket" | "liquid";
}

export interface CryptoMarket extends Market {
  source: "liquid";
  base_currency: string;
  current_price: number;
  price_24h_ago: number;
  price_change_pct: number;
  high_24h: number;
  low_24h: number;
  spread: number;
  currency_pair_code: string;
}

export interface MarketAnalysis {
  verdict: "STRONG BUY" | "LEAN BUY" | "WATCH" | "LEAN SELL" | "STRONG SELL";
  confidence: number;
  bullets: string[];
  risk_level: "low" | "medium" | "high";
}

export interface MarketWithAnalysis {
  market: Market;
  analysis: MarketAnalysis | null;
}

export interface SwipeRecord {
  id: string;
  market: Market;
  analysis: MarketAnalysis;
  action: "buy" | "skip" | "watchlist";
  timestamp: number;
  yes_price_at_swipe: number;
  bet_amount: number;
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet" | "winnings";
  amount: number;
  description: string;
  timestamp: number;
}

export type Screen = "filter" | "explore" | "dashboard" | "wallet";
