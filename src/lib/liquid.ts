import { Market } from "./types";

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

export function isCryptoMarket(market: Market): market is CryptoMarket {
  return (market as CryptoMarket).source === "liquid";
}

export const CRYPTO_ICONS: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  MATIC: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
};

const FALLBACK_ICON = "https://assets.coingecko.com/coins/images/1/small/bitcoin.png";

export function getCryptoIcon(base: string): string {
  return CRYPTO_ICONS[base] || FALLBACK_ICON;
}

export function formatCryptoPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
  return `$${vol.toFixed(0)}`;
}
