"use client";

export default function OddsBar({ yesPrice, noPrice }: { yesPrice: number; noPrice: number }) {
  const yesPct = Math.round(yesPrice * 100);
  const noPct = Math.round(noPrice * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className="text-emerald-400">YES {yesPct}%</span>
        <span className="text-red-400">NO {noPct}%</span>
      </div>
      <div className="relative w-full h-2 rounded-full overflow-hidden bg-red-500/30">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
        {/* Pulse */}
        <div
          className="absolute top-0 h-full rounded-full bg-emerald-400/20 animate-pulse"
          style={{ width: `${yesPct}%` }}
        />
      </div>
    </div>
  );
}
