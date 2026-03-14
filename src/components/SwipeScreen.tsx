"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/stores/app-store";
import { Market } from "@/lib/types";
import SwipeCardStack from "./SwipeCardStack";
import ActionButtons from "./ActionButtons";
import CategoryPills from "./CategoryPills";
import BetAmountPicker from "./BetAmountPicker";

function mergeMarkets(polymarketCards: Market[], cryptoCards: Market[]): Market[] {
  if (polymarketCards.length === 0) return cryptoCards;
  if (cryptoCards.length === 0) return polymarketCards;
  // Insert a crypto card every 3rd position
  const merged: Market[] = [];
  let pIdx = 0, cIdx = 0;
  while (pIdx < polymarketCards.length || cIdx < cryptoCards.length) {
    if (pIdx < polymarketCards.length) merged.push(polymarketCards[pIdx++]);
    if (pIdx < polymarketCards.length) merged.push(polymarketCards[pIdx++]);
    if (cIdx < cryptoCards.length) merged.push(cryptoCards[cIdx++]);
  }
  return merged;
}

export default function SwipeScreen() {
  const { selectedCategories, setExploreView, wallet, setActiveTab } = useApp();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchMarkets = useCallback(async () => {
    if (selectedCategories.length === 0) {
      setLoading(false);
      return;
    }

    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setShowRetry(false);

    // Show retry button after 15 seconds
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => setShowRetry(true), 15000);

    const polymarketCats = selectedCategories.filter((c) => c !== "crypto");
    const wantsCrypto = selectedCategories.includes("crypto");

    try {
      const promises: Promise<Market[]>[] = [];

      // Fetch Polymarket if non-crypto categories selected
      if (polymarketCats.length > 0) {
        promises.push(
          fetch(`/api/markets?categories=${polymarketCats.join(",")}`, {
            signal: controller.signal,
          })
            .then((r) => r.json())
            .then((data) => data.markets || [])
            .catch((e) => {
              if (e.name === "AbortError") throw e;
              return [];
            })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      // Fetch Liquid crypto if crypto selected
      if (wantsCrypto) {
        promises.push(
          fetch("/api/liquid", { signal: controller.signal })
            .then((r) => r.json())
            .then((data) => data.markets || [])
            .catch((e) => {
              if (e.name === "AbortError") throw e;
              return [];
            })
        );
      } else {
        promises.push(Promise.resolve([]));
      }

      const [polymarketData, cryptoData] = await Promise.all(promises);

      // Don't update state if this request was aborted
      if (controller.signal.aborted) return;

      // Merge and deduplicate
      const merged = mergeMarkets(polymarketData, cryptoData);

      setMarkets((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMarkets = merged.filter((m: Market) => !existingIds.has(m.id));
        return [...prev, ...newMarkets];
      });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      console.error("Failed to fetch markets:", e);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        setShowRetry(false);
      }
    }
  }, [selectedCategories]);

  useEffect(() => {
    setMarkets([]);
    setLoading(true);
    fetchMarkets();
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [fetchMarkets]);

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
            {showRetry && (
              <button
                onClick={() => {
                  setMarkets([]);
                  setLoading(true);
                  fetchMarkets();
                }}
                className="mt-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium"
              >
                Retry
              </button>
            )}
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
