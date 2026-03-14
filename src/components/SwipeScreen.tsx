"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/stores/app-store";
import { Market } from "@/lib/types";
import SwipeCardStack from "./SwipeCardStack";
import ActionButtons from "./ActionButtons";
import CategoryPills from "./CategoryPills";
import BetAmountPicker from "./BetAmountPicker";

export default function SwipeScreen() {
  const { selectedCategories, setExploreView, wallet, setActiveTab } = useApp();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    if (selectedCategories.length === 0) return;
    try {
      const res = await fetch(
        `/api/markets?categories=${selectedCategories.join(",")}`
      );
      const data = await res.json();
      if (data.markets) {
        setMarkets((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMarkets = data.markets.filter((m: Market) => !existingIds.has(m.id));
          return [...prev, ...newMarkets];
        });
      }
    } catch (e) {
      console.error("Failed to fetch markets:", e);
    } finally {
      setLoading(false);
    }
  }, [selectedCategories]);

  useEffect(() => {
    setMarkets([]);
    setLoading(true);
    fetchMarkets();
  }, [selectedCategories, fetchMarkets]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full pt-14"
    >
      {/* Top bar */}
      <div className="flex-shrink-0 px-4 pb-2 space-y-2 z-20">
        <div className="flex items-center justify-between">
          {/* Filter button */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExploreView("filter")}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center"
          >
            <span className="text-sm">🎛️</span>
          </motion.button>

          {/* Category pills */}
          <div className="flex-1 mx-3 overflow-hidden">
            <CategoryPills />
          </div>

          {/* Wallet badge */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setActiveTab("wallet")}
            className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30"
          >
            <span className="text-[11px] text-emerald-400 font-semibold">
              ${wallet.balance.toFixed(0)}
            </span>
          </motion.button>
        </div>

        {/* Bet amount */}
        <div className="text-center">
          <BetAmountPicker />
        </div>
      </div>

      {/* Card stack */}
      <div className="flex-1 relative px-4 pb-2 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-[#9CA3AF]">Finding markets...</p>
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
            <span className="text-4xl">🔍</span>
            <p className="text-white font-semibold">No markets found</p>
            <p className="text-sm text-[#9CA3AF]">Try adding more categories</p>
            <button
              onClick={() => setExploreView("filter")}
              className="mt-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium"
            >
              Change Filters
            </button>
          </div>
        ) : (
          <SwipeCardStack markets={markets} onRequestMore={fetchMarkets} />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex-shrink-0 pb-20">
        <ActionButtons
          onSkip={() => {
            // Dispatch a custom event that SwipeCardStack listens to
            window.dispatchEvent(new CustomEvent("swipe-action", { detail: "left" }));
          }}
          onWatchlist={() => {
            window.dispatchEvent(new CustomEvent("swipe-action", { detail: "up" }));
          }}
          onBuy={() => {
            window.dispatchEvent(new CustomEvent("swipe-action", { detail: "right" }));
          }}
        />
      </div>
    </motion.div>
  );
}
