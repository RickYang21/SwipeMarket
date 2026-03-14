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

export interface MarketAnalysis {
  verdict: "STRONG BUY" | "BUY" | "LEAN BUY" | "SKIP";
  confidence: number;
  reasoning: string;
  bull_case: string;
  bear_case: string;
  edge: string;
  risk_level: "low" | "medium" | "high";
}

export interface SwipeRecord {
  id: string;
  market: Market;
  analysis: MarketAnalysis;
  action: "buy" | "skip" | "watchlist";
  bet_amount: number;
  timestamp: Date;
  price_at_swipe: {
    yes: number;
    no: number;
  };
}

export interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bet" | "winnings";
  amount: number;
  description: string;
  timestamp: Date;
  status: "completed" | "pending";
}

export interface Wallet {
  balance: number;
  transactions: Transaction[];
}

export type TabType = "explore" | "dashboard" | "wallet";
export type ExploreView = "filter" | "swipe";
export type Category = keyof typeof import("./categories").CATEGORY_KEYWORDS;
