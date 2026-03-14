"use client";

import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Market, MarketAnalysis } from "@/lib/types";
import { CATEGORY_CONFIG } from "@/lib/categories";
import OddsBar from "./OddsBar";
import MarketStats from "./MarketStats";
import AIRecommendation from "./AIRecommendation";

interface SwipeCardProps {
  market: Market;
  analysis: MarketAnalysis | null;
  onSwipe: (direction: "left" | "right" | "up") => void;
  isTop: boolean;
  index: number;
  showHint: boolean;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "Ended";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return "< 1h left";
}

export default function SwipeCard({ market, analysis, onSwipe, isTop, index, showHint }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12]);
  const buyOpacity = useTransform(x, [0, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, 0], [1, 0]);
  const watchOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const xOff = info.offset.x;
    const yOff = info.offset.y;

    if (yOff < -100) {
      onSwipe("up");
    } else if (xOff > 120) {
      onSwipe("right");
    } else if (xOff < -120) {
      onSwipe("left");
    }
  };

  const scale = 1 - index * 0.05;
  const yOffset = index * 10;
  const opacity = 1 - index * 0.15;
  const catConfig = CATEGORY_CONFIG[market.category];

  return (
    <motion.div
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale,
        translateY: yOffset,
        opacity,
        zIndex: 10 - index,
      }}
      drag={isTop}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragEnd={isTop ? handleDragEnd : undefined}
      exit={{
        x: 500,
        opacity: 0,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      }}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
    >
      <div className="w-full h-full bg-[#1C1C1E] rounded-2xl overflow-hidden border border-white/5 flex flex-col">
        {/* Market image + header */}
        <div className="relative h-[120px] flex-shrink-0 overflow-hidden">
          {market.image ? (
            <img
              src={market.image}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#1A1A2E] to-[#0A0A1A]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E]/50 to-transparent" />

          {/* Category pill */}
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white">
            {catConfig?.emoji} {catConfig?.label}
          </div>

          {/* Time pill */}
          <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-[#9CA3AF]">
            {timeUntil(market.end_date)}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
          {/* Question */}
          <h3
            className="text-[17px] font-bold text-white leading-tight line-clamp-3 -mt-1"
            style={{ fontFamily: '"SF Pro Display", "Geist", system-ui' }}
          >
            {market.question}
          </h3>

          {/* Odds bar */}
          <OddsBar yesPrice={market.yes_price} noPrice={market.no_price} />

          {/* Stats */}
          <MarketStats volume={market.volume} liquidity={market.liquidity} volume24h={market.volume_24h} />

          {/* AI Recommendation */}
          {analysis ? (
            <AIRecommendation analysis={analysis} />
          ) : (
            <div className="bg-[#1A1A2E] rounded-xl p-3 space-y-2">
              <div className="h-6 w-24 bg-white/5 rounded-full animate-pulse" />
              <div className="h-1.5 w-full bg-white/5 rounded-full animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          )}
        </div>

        {/* Swipe hint */}
        {showHint && isTop && (
          <div className="flex-shrink-0 text-center py-2 text-[10px] text-[#6B7280]">
            ← SKIP &bull; WATCH ↑ &bull; BUY →
          </div>
        )}

        {/* Swipe overlays */}
        {isTop && (
          <>
            {/* BUY stamp */}
            <motion.div
              style={{ opacity: buyOpacity }}
              className="absolute top-16 left-6 border-4 border-emerald-500 rounded-lg px-4 py-2 -rotate-12 pointer-events-none"
            >
              <span className="text-emerald-500 font-black text-2xl">BUY ✓</span>
            </motion.div>

            {/* SKIP stamp */}
            <motion.div
              style={{ opacity: skipOpacity }}
              className="absolute top-16 right-6 border-4 border-red-500 rounded-lg px-4 py-2 rotate-12 pointer-events-none"
            >
              <span className="text-red-500 font-black text-2xl">SKIP ✗</span>
            </motion.div>

            {/* WATCHLIST stamp */}
            <motion.div
              style={{ opacity: watchOpacity }}
              className="absolute top-16 left-1/2 -translate-x-1/2 border-4 border-blue-500 rounded-lg px-4 py-2 pointer-events-none"
            >
              <span className="text-blue-500 font-black text-xl">WATCHLIST 🔖</span>
            </motion.div>

            {/* Edge glows */}
            <motion.div
              style={{ opacity: buyOpacity }}
              className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-emerald-500/20 to-transparent pointer-events-none rounded-r-2xl"
            />
            <motion.div
              style={{ opacity: skipOpacity }}
              className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-red-500/20 to-transparent pointer-events-none rounded-l-2xl"
            />
            <motion.div
              style={{ opacity: watchOpacity }}
              className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-blue-500/20 to-transparent pointer-events-none rounded-t-2xl"
            />
          </>
        )}
      </div>
    </motion.div>
  );
}
