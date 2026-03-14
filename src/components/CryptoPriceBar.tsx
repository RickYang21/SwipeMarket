"use client";

import { formatCryptoPrice } from "@/lib/liquid";

interface CryptoPriceBarProps {
  currentPrice: number;
  low24h: number;
  high24h: number;
}

export default function CryptoPriceBar({ currentPrice, low24h, high24h }: CryptoPriceBarProps) {
  const range = high24h - low24h;
  const position = range > 0 ? ((currentPrice - low24h) / range) * 100 : 50;
  const clamped = Math.max(2, Math.min(98, position));
  const isNearLow = position < 35;
  const isNearHigh = position > 75;

  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-medium mb-1">
        <span className="text-[#9CA3AF]">24h Range</span>
        <span className={isNearLow ? "text-emerald-400" : isNearHigh ? "text-red-400" : "text-amber-400"}>
          {isNearLow ? "Buy the dip" : isNearHigh ? "Extended" : "Mid-range"}
        </span>
      </div>
      <div className="relative w-full h-2 rounded-full overflow-hidden bg-[#2A2A2E]">
        {/* Gradient bar from green (low) to red (high) */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 via-amber-500/30 to-red-500/30 rounded-full" />
        {/* Current price marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] transition-all duration-500"
          style={{ left: `calc(${clamped}% - 6px)` }}
        />
      </div>
      <div className="flex justify-between text-[10px] mt-1">
        <span className="text-emerald-400">{formatCryptoPrice(low24h)}</span>
        <span className="text-red-400">{formatCryptoPrice(high24h)}</span>
      </div>
    </div>
  );
}
