"use client";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export default function MarketStats({
  volume,
  liquidity,
  volume24h,
}: {
  volume: number;
  liquidity: number;
  volume24h: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="flex flex-col items-center flex-1">
        <span className="text-[10px] text-[#6B7280]">💰 Volume</span>
        <span className="text-xs font-semibold text-white">{formatNumber(volume)}</span>
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex flex-col items-center flex-1">
        <span className="text-[10px] text-[#6B7280]">💧 Liquidity</span>
        <span className="text-xs font-semibold text-white">{formatNumber(liquidity)}</span>
      </div>
      <div className="w-px h-6 bg-white/10" />
      <div className="flex flex-col items-center flex-1">
        <span className="text-[10px] text-[#6B7280]">📊 24h Vol</span>
        <span className="text-xs font-semibold text-white">{formatNumber(volume24h)}</span>
      </div>
    </div>
  );
}
