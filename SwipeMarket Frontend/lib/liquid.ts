import { Market } from "@/types/types";
import { CryptoMarket } from "@/types/types";

export type { CryptoMarket };

export function isCryptoMarket(market: Market): market is CryptoMarket {
    return (market as CryptoMarket).source === "liquid";
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
