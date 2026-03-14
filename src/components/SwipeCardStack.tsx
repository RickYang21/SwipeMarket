"use client";

import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import SwipeCard from "./SwipeCard";
import { Market, MarketAnalysis } from "@/lib/types";
import { isCryptoMarket } from "@/lib/liquid";
import { useApp } from "@/stores/app-store";

interface SwipeCardStackProps {
  markets: Market[];
  onRequestMore: () => void;
}

export default function SwipeCardStack({ markets, onRequestMore }: SwipeCardStackProps) {
  const { addSwipe, placeBet, wallet, betAmount, showToast, setActiveTab } = useApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [analyses, setAnalyses] = useState<Record<string, MarketAnalysis>>({});
  const [showHint, setShowHint] = useState(true);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);

  const visibleMarkets = markets.slice(currentIndex, currentIndex + 3);

  // Pre-fetch analyses for visible cards
  useEffect(() => {
    const toFetch = markets.slice(currentIndex, currentIndex + 3);
    toFetch.forEach((m) => {
      if (!analyses[m.id]) {
        // Route to correct analysis endpoint based on source
        const isCrypto = isCryptoMarket(m);
        const url = isCrypto
          ? `/api/liquid/${m.id}/analysis`
          : `/api/markets/${m.id}/analysis`;

        fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(m),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data.analysis) {
              setAnalyses((prev) => ({ ...prev, [m.id]: data.analysis }));
            }
          })
          .catch(() => {});
      }
    });
  }, [currentIndex, markets, analyses]);

  // Request more markets when running low
  useEffect(() => {
    if (markets.length - currentIndex < 5) {
      onRequestMore();
    }
  }, [currentIndex, markets.length, onRequestMore]);

  // Listen for button-triggered swipes
  const handleSwipe = useCallback((direction: "left" | "right" | "up") => {
    const market = markets[currentIndex];
    if (!market) return;

    const analysis = analyses[market.id] || {
      verdict: "SKIP" as const,
      confidence: 50,
      reasoning: "Analysis pending",
      bull_case: "",
      bear_case: "",
      edge: "",
      risk_level: "medium" as const,
    };

    if (showHint) setShowHint(false);

    const isCrypto = isCryptoMarket(market);

    if (direction === "right") {
      if (wallet.balance < betAmount) {
        showToast("Top up your wallet to keep betting!", "error");
        setActiveTab("wallet");
        return;
      }
      placeBet(market);
      addSwipe(market, analysis, "buy");
      if (isCrypto) {
        showToast(`Bought ${market.question.split(" — ")[0]} • -$${betAmount}`, "success");
      } else {
        showToast(`Bought • -$${betAmount}`, "success");
      }
    } else if (direction === "left") {
      addSwipe(market, analysis, "skip");
    } else {
      addSwipe(market, analysis, "watchlist");
      showToast("Watchlisted 🔖", "info");
    }

    setExitDirection(direction);
    setTimeout(() => {
      setExitDirection(null);
      setCurrentIndex((prev) => prev + 1);
    }, 200);
  }, [markets, currentIndex, analyses, showHint, wallet.balance, betAmount, placeBet, addSwipe, showToast, setActiveTab]);

  useEffect(() => {
    const handler = (e: Event) => {
      const dir = (e as CustomEvent).detail as "left" | "right" | "up";
      handleSwipe(dir);
    };
    window.addEventListener("swipe-action", handler);
    return () => window.removeEventListener("swipe-action", handler);
  }, [handleSwipe]);

  if (currentIndex >= markets.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
        <span className="text-5xl">🏁</span>
        <h3 className="text-lg font-bold text-white">You&apos;ve seen them all!</h3>
        <p className="text-sm text-[#9CA3AF]">Change your filters or refresh to find more markets</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <AnimatePresence>
        {visibleMarkets.map((market, i) => (
          <SwipeCard
            key={market.id}
            market={market}
            analysis={analyses[market.id] || null}
            onSwipe={handleSwipe}
            isTop={i === 0 && !exitDirection}
            index={i}
            showHint={showHint}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
