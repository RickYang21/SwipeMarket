"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/stores/app-store";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { isCryptoMarket } from "@/lib/liquid";
import { TrendingUp } from "lucide-react";
import AIRecommendation from "./AIRecommendation";

type Segment = "all" | "buys" | "watchlist";

function timeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function Dashboard() {
  const { swipeHistory, setActiveTab } = useApp();
  const [segment, setSegment] = useState<Segment>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const buys = swipeHistory.filter((s) => s.action === "buy");
    const skips = swipeHistory.filter((s) => s.action === "skip");
    const watchlist = swipeHistory.filter((s) => s.action === "watchlist");
    const avgConfidence = buys.length > 0
      ? Math.round(buys.reduce((acc, s) => acc + s.analysis.confidence, 0) / buys.length)
      : 0;

    // Top category
    const catCounts: Record<string, number> = {};
    swipeHistory.forEach((s) => {
      catCounts[s.market.category] = (catCounts[s.market.category] || 0) + 1;
    });
    const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    // P&L for buys
    const totalRisked = buys.reduce((acc, s) => acc + s.bet_amount, 0);
    const unrealizedPnl = buys.reduce((acc, s) => {
      if (isCryptoMarket(s.market)) {
        // Crypto P&L: price change since swipe
        const priceAtSwipe = s.market.current_price;
        const pnl = ((s.market.current_price - priceAtSwipe) / priceAtSwipe) * s.bet_amount;
        return acc + pnl;
      }
      const currentYes = s.market.yes_price;
      const pnl =
        ((currentYes - s.price_at_swipe.yes) / s.price_at_swipe.yes) * s.bet_amount;
      return acc + pnl;
    }, 0);

    // Breakdown counts
    const cryptoCount = swipeHistory.filter((s) => isCryptoMarket(s.market)).length;
    const predictionCount = swipeHistory.length - cryptoCount;

    return { buys, skips, watchlist, avgConfidence, topCat, totalRisked, unrealizedPnl, cryptoCount, predictionCount };
  }, [swipeHistory]);

  const filtered = useMemo(() => {
    if (segment === "buys") return swipeHistory.filter((s) => s.action === "buy");
    if (segment === "watchlist") return swipeHistory.filter((s) => s.action === "watchlist");
    return swipeHistory;
  }, [swipeHistory, segment]);

  if (swipeHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center pt-20">
        <span className="text-5xl">🃏</span>
        <h3 className="text-lg font-bold text-white">No swipes yet</h3>
        <p className="text-sm text-[#9CA3AF]">
          Head to Explore and start swiping to build your portfolio
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setActiveTab("explore");
          }}
          className="mt-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm"
        >
          Start Swiping
        </motion.button>
      </div>
    );
  }

  const total = swipeHistory.length;
  const buyPct = total > 0 ? (stats.buys.length / total) * 100 : 0;
  const skipPct = total > 0 ? (stats.skips.length / total) * 100 : 0;
  const watchPct = total > 0 ? (stats.watchlist.length / total) * 100 : 0;

  return (
    <div className="h-full overflow-y-auto pt-16 pb-24 px-4 space-y-4">
      {/* Portfolio header */}
      <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-2xl p-5 space-y-3 relative overflow-hidden shadow-lg">
        <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp size={64} /></div>
        <div>
          <p className="text-zinc-400 text-sm mb-1">Total Risked</p>
          <div className="text-3xl font-mono font-bold">${stats.totalRisked.toFixed(2)}</div>
          {stats.cryptoCount > 0 && stats.predictionCount > 0 && (
            <p className="text-[10px] text-[#6B7280] mt-1">
              {stats.predictionCount} Prediction Markets &bull; {stats.cryptoCount} Crypto
            </p>
          )}
        </div>

        {/* Stat pills */}
        <div className="flex gap-2 justify-center">
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-xs font-semibold">
            🟢 {stats.buys.length} Buys
          </span>
          <span className="px-3 py-1 rounded-full bg-red-500/15 text-red-400 text-xs font-semibold">
            🔴 {stats.skips.length} Skips
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold">
            🔖 {stats.watchlist.length} Watching
          </span>
        </div>

        {/* Ring chart + stats */}
        <div className="flex items-center justify-between">
          {/* Donut ring */}
          <svg width="56" height="56" viewBox="0 0 56 56" className="flex-shrink-0">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1C1C1E" strokeWidth="6" />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#34D399"
              strokeWidth="6"
              strokeDasharray={`${(buyPct / 100) * 138.2} 138.2`}
              strokeDashoffset="0"
              transform="rotate(-90 28 28)"
              strokeLinecap="round"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#EF4444"
              strokeWidth="6"
              strokeDasharray={`${(skipPct / 100) * 138.2} 138.2`}
              strokeDashoffset={`-${(buyPct / 100) * 138.2}`}
              transform="rotate(-90 28 28)"
              strokeLinecap="round"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="6"
              strokeDasharray={`${(watchPct / 100) * 138.2} 138.2`}
              strokeDashoffset={`-${((buyPct + skipPct) / 100) * 138.2}`}
              transform="rotate(-90 28 28)"
              strokeLinecap="round"
            />
          </svg>

          <div className="flex-1 ml-4 space-y-1 text-xs text-[#9CA3AF]">
            {stats.avgConfidence > 0 && (
              <p>Avg AI confidence on buys: <span className="text-amber-400">{stats.avgConfidence}%</span></p>
            )}
            {stats.topCat && (
              <p>
                Top category: {CATEGORY_CONFIG[stats.topCat]?.emoji}{" "}
                {CATEGORY_CONFIG[stats.topCat]?.label}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* P&L for buys */}
      {stats.buys.length > 0 && segment === "buys" && (
        <div className="flex justify-between text-xs px-1">
          <span className="text-[#9CA3AF]">
            Total risked: <span className="text-white">${stats.totalRisked.toFixed(2)}</span>
          </span>
          <span className={stats.unrealizedPnl >= 0 ? "text-emerald-400" : "text-red-400"}>
            P&L: {stats.unrealizedPnl >= 0 ? "+" : ""}${stats.unrealizedPnl.toFixed(2)}
          </span>
        </div>
      )}

      {/* Segment control */}
      <div className="flex gap-1 bg-[#1C1C1E] rounded-xl p-1">
        {(["all", "buys", "watchlist"] as Segment[]).map((seg) => (
          <button
            key={seg}
            onClick={() => setSegment(seg)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              segment === seg
                ? "bg-white/10 text-white"
                : "text-[#9CA3AF]"
            }`}
          >
            {seg === "all" ? "All" : seg === "buys" ? "Buys" : "Watchlist"}
          </button>
        ))}
      </div>

      {/* Updated timestamp */}
      <p className="text-[10px] text-[#6B7280] text-center">Updated just now</p>

      {/* History list */}
      <div className="space-y-2">
        {filtered.map((record, i) => {
          const isExpanded = expandedId === record.id;
          const catConfig = CATEGORY_CONFIG[record.market.category];
          const isCrypto = isCryptoMarket(record.market);

          const actionColor =
            record.action === "buy"
              ? isCrypto ? "bg-amber-500" : "bg-emerald-500"
              : record.action === "watchlist"
              ? "bg-blue-500"
              : "bg-red-500";
          const actionLabel =
            record.action === "buy"
              ? "Bought ✓"
              : record.action === "watchlist"
              ? "Watching 🔖"
              : "Skipped ✗";
          const actionTextColor =
            record.action === "buy"
              ? isCrypto
                ? "text-amber-400 bg-amber-500/15"
                : "text-emerald-400 bg-emerald-500/15"
              : record.action === "watchlist"
              ? "text-blue-400 bg-blue-500/15"
              : "text-[#9CA3AF] bg-white/5";

          return (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
              className="bg-[#1C1C1E] rounded-xl overflow-hidden cursor-pointer active:bg-[#222] transition-colors"
            >
              <div className="flex">
                {/* Action stripe */}
                <div className={`w-1 flex-shrink-0 ${actionColor}`} />

                <div className="flex-1 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">
                        {record.market.question}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        {isCrypto && isCryptoMarket(record.market) ? (
                          <span className="text-[10px] text-[#9CA3AF]">
                            {record.market.price_change_pct >= 0 ? "↑" : "↓"}{" "}
                            {Math.abs(record.market.price_change_pct).toFixed(1)}% 24h
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#9CA3AF]">
                            YES {Math.round(record.price_at_swipe.yes * 100)}% / NO{" "}
                            {Math.round(record.price_at_swipe.no * 100)}%
                          </span>
                        )}
                        <AIRecommendation analysis={record.analysis} compact />
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${actionTextColor}`}>
                        {actionLabel}
                      </span>
                      {record.action === "buy" && (
                        <span className="text-[10px] text-red-400">-${record.bet_amount}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-[#6B7280]">
                    <span className={isCrypto ? "text-amber-500/80" : ""}>
                      {catConfig?.emoji} {catConfig?.label}
                    </span>
                    {isCrypto && <span className="text-[8px] text-amber-500/40">via Liquid</span>}
                    <span>•</span>
                    <span>{timeAgo(record.timestamp)}</span>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-2 border-t border-white/5"
                      >
                        <p className="text-xs text-[#D1D5DB]">{record.analysis.reasoning}</p>
                        <div className="space-y-1">
                          <p className="text-[11px] text-emerald-400">
                            📈 Bull: {record.analysis.bull_case}
                          </p>
                          <p className="text-[11px] text-red-400">
                            📉 Bear: {record.analysis.bear_case}
                          </p>
                          <p className="text-[11px] text-amber-400 italic">
                            Edge: {record.analysis.edge}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
