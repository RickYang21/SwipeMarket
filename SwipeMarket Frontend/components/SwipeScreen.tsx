"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/AppContext";
import { Market, MarketAnalysis } from "@/types/types";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { fetchMarkets, fetchCryptoMarkets, fetchAnalysis, mergeMarkets } from "@/lib/api";
import SwipeCard from "./SwipeCard";
import Toast from "./Toast";

const PRESET_BETS = [5, 10, 25, 50, 100];

export default function SwipeScreen() {
    const { state, dispatch } = useApp();
    const [markets, setMarkets] = useState<Market[]>([]);
    const [analyses, setAnalyses] = useState<Map<string, MarketAnalysis>>(new Map());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showRetry, setShowRetry] = useState(false);
    const [toast, setToast] = useState<{
        message: string;
        type: "buy" | "skip" | "watchlist" | "error";
    } | null>(null);
    const [showBetSheet, setShowBetSheet] = useState(false);
    const [selectedBet, setSelectedBet] = useState<number | null>(null);

    const abortRef = useRef<AbortController | null>(null);
    const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
    const fetchingAnalysesRef = useRef<Set<string>>(new Set());

    // Fetch analysis for the current card and the next one (prefetch)
    const fetchAnalysisForIndex = useCallback(
        async (marketList: Market[], idx: number) => {
            const toFetch = marketList.slice(idx, idx + 2);
            for (const market of toFetch) {
                if (fetchingAnalysesRef.current.has(market.id)) continue;
                fetchingAnalysesRef.current.add(market.id);
                try {
                    const analysis = await fetchAnalysis(market);
                    setAnalyses((prev) => {
                        const next = new Map(prev);
                        next.set(market.id, analysis);
                        return next;
                    });
                } catch (e) {
                    console.error("Failed to fetch analysis:", e);
                    fetchingAnalysesRef.current.delete(market.id);
                }
            }
        },
        []
    );

    // Fetch markets from API
    const fetchAllMarkets = useCallback(async () => {
        if (state.selectedCategories.length === 0) {
            setLoading(false);
            return;
        }

        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setShowRetry(false);
        if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => setShowRetry(true), 15000);

        const wantsCrypto = state.selectedCategories.includes("crypto");
        const polymarketCats = state.selectedCategories.filter((c) => c !== "crypto");

        try {
            const promises: Promise<Market[]>[] = [];

            if (polymarketCats.length > 0) {
                promises.push(
                    fetchMarkets(polymarketCats, controller.signal).catch((e) => {
                        if (e.name === "AbortError") throw e;
                        return [];
                    })
                );
            } else {
                promises.push(Promise.resolve([]));
            }

            if (wantsCrypto) {
                promises.push(
                    fetchCryptoMarkets(controller.signal).catch((e) => {
                        if (e.name === "AbortError") throw e;
                        return [];
                    })
                );
            } else {
                promises.push(Promise.resolve([]));
            }

            const [polymarketData, cryptoData] = await Promise.all(promises);

            if (controller.signal.aborted) return;

            const merged = mergeMarkets(polymarketData, cryptoData);
            setMarkets(merged);
            setCurrentIndex(0);

            // Prefetch analysis for first 2 cards
            if (merged.length > 0) {
                fetchAnalysisForIndex(merged, 0);
            }
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
    }, [state.selectedCategories, fetchAnalysisForIndex]);

    useEffect(() => {
        setMarkets([]);
        setAnalyses(new Map());
        fetchingAnalysesRef.current.clear();
        setCurrentIndex(0);
        setLoading(true);
        fetchAllMarkets();
        return () => {
            if (abortRef.current) abortRef.current.abort();
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
        };
    }, [fetchAllMarkets]);

    // Prefetch analysis when index changes
    useEffect(() => {
        if (markets.length > 0 && currentIndex < markets.length) {
            fetchAnalysisForIndex(markets, currentIndex);
        }
    }, [currentIndex, markets, fetchAnalysisForIndex]);

    // Request more markets when running low
    useEffect(() => {
        if (markets.length > 0 && markets.length - currentIndex < 5 && !loading) {
            const fetchMore = async () => {
                const wantsCrypto = state.selectedCategories.includes("crypto");
                const polymarketCats = state.selectedCategories.filter((c) => c !== "crypto");
                try {
                    const promises: Promise<Market[]>[] = [];
                    if (polymarketCats.length > 0) promises.push(fetchMarkets(polymarketCats));
                    else promises.push(Promise.resolve([]));
                    if (wantsCrypto) promises.push(fetchCryptoMarkets());
                    else promises.push(Promise.resolve([]));

                    const [poly, crypto] = await Promise.all(promises);
                    const newMerged = mergeMarkets(poly, crypto);

                    setMarkets(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const uniqueNew = newMerged.filter(m => !existingIds.has(m.id));
                        return [...prev, ...uniqueNew];
                    });
                } catch (e) {
                    console.error("Failed to fetch more markets:", e);
                }
            };
            fetchMore();
        }
    }, [currentIndex, markets.length, loading, state.selectedCategories]);

    const handleSwipe = useCallback(
        (direction: "buy" | "skip" | "watchlist") => {
            if (currentIndex >= markets.length) return;

            const currentMarket = markets[currentIndex];
            const analysis = analyses.get(currentMarket.id);

            // Fallback analysis if not loaded yet
            const fallbackAnalysis: MarketAnalysis = {
                verdict: "LEAN BUY",
                confidence: 50,
                bullets: [
                    "Analysis was not available at time of swipe",
                    "Market shows potential based on current pricing",
                    "Insufficient data for full risk assessment",
                ],
                risk_level: "medium",
            };

            const record = {
                id: `s${Date.now()}`,
                market: currentMarket,
                analysis: analysis || fallbackAnalysis,
                action: direction,
                timestamp: Date.now(),
                yes_price_at_swipe: currentMarket.yes_price,
                bet_amount: state.betAmount,
            };

            dispatch({ type: "ADD_SWIPE", record });

            if (direction === "buy" && state.balance < state.betAmount) {
                setToast({ message: "Insufficient funds", type: "error" });
                return;
            }

            if (direction === "buy") {
                dispatch({ type: "DEDUCT_BALANCE", amount: state.betAmount });
                dispatch({
                    type: "ADD_TRANSACTION",
                    transaction: {
                        id: `t${Date.now()}`,
                        type: "bet",
                        amount: state.betAmount,
                        description: `Bet on: ${currentMarket.question.substring(0, 40)}...`,
                        timestamp: Date.now(),
                    },
                });
                setToast({ message: `Bought -$${state.betAmount}`, type: "buy" });
            } else if (direction === "skip") {
                setToast({ message: "Skipped", type: "skip" });
            } else {
                setToast({ message: "Added to Watchlist", type: "watchlist" });
            }

            setTimeout(() => {
                setCurrentIndex((prev) => prev + 1);
            }, 100);
        },
        [currentIndex, markets, analyses, dispatch, state.betAmount]
    );

    const activeCategories = state.selectedCategories.slice(0, 3);
    const moreCount = state.selectedCategories.length - 3;
    const allDone = currentIndex >= markets.length && !loading;
    const progress = markets.length > 0
        ? (currentIndex / markets.length) * 100
        : 0;

    // Map category keys to labels for display
    const getCategoryLabel = (key: string) => {
        return CATEGORY_CONFIG[key]?.label || key;
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Top Bar */}
            <div className="px-4 pt-14 pb-2 z-10 relative">
                {/* Subtle top gradient */}
                <div
                    className="absolute inset-x-0 top-0 h-24 pointer-events-none"
                    style={{
                        background: "linear-gradient(180deg, rgba(10,10,10,0.8) 0%, transparent 100%)",
                    }}
                />

                <div className="flex items-center justify-between mb-1 relative">
                    {/* Filter Icon */}
                    <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => dispatch({ type: "SET_SCREEN", screen: "filter" })}
                        className="w-8 h-8 rounded-lg card-elevated-sm flex items-center justify-center"
                    >
                        <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#9CA3AF"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="4" y1="6" x2="20" y2="6" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                            <line x1="11" y1="18" x2="13" y2="18" />
                        </svg>
                    </motion.button>

                    {/* Active Categories */}
                    <div className="flex items-center gap-1.5 flex-1 justify-center px-2">
                        {activeCategories.map((cat) => (
                            <span
                                key={cat}
                                className="text-[10px] font-medium text-secondary/70 card-elevated-sm px-2 py-0.5 rounded-md tracking-wide"
                            >
                                {getCategoryLabel(cat)}
                            </span>
                        ))}
                        {moreCount > 0 && (
                            <span className="text-[10px] text-secondary/50">
                                +{moreCount}
                            </span>
                        )}
                    </div>

                    {/* Wallet Balance */}
                    <div className="text-right">
                        <span className="text-[13px] font-bold text-primary/90 tabular-nums">
                            ${state.balance.toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Bet amount + progress */}
                <div className="flex items-center justify-between relative mt-2">
                    <button
                        onClick={() => {
                            setSelectedBet(state.betAmount);
                            setShowBetSheet(true);
                        }}
                        className="flex-1 py-1 text-center card-elevated-sm rounded-lg border border-white/[0.04] transition-colors hover:border-white/[0.1]"
                    >
                        <p className="text-[11px] font-semibold text-secondary/70 tracking-wide">
                            Betting <span className="text-primary">${state.betAmount}</span> per swipe
                        </p>
                    </button>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-[2px] bg-white/[0.04] rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                        style={{
                            background: "linear-gradient(90deg, rgba(16, 185, 129, 0.4), #10B981)",
                        }}
                    />
                </div>
            </div>

            {/* Card Stack */}
            <div className="flex-1 relative mx-1 mb-2">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="w-12 h-12 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
                        <p className="text-sm text-secondary/60">Finding markets...</p>
                        {showRetry && (
                            <button
                                onClick={() => {
                                    setMarkets([]);
                                    setLoading(true);
                                    fetchAllMarkets();
                                }}
                                className="mt-2 px-4 py-2 rounded-full bg-accent-green/20 text-accent-green text-sm font-medium"
                            >
                                Retry
                            </button>
                        )}
                    </div>
                ) : allDone ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-full text-center px-8"
                    >
                        <div className="w-16 h-16 rounded-full card-elevated-sm flex items-center justify-center mb-4">
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#10B981"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-primary mb-2 tracking-tight">
                            All caught up
                        </h3>
                        <p className="text-[13px] text-secondary/60 mb-6 leading-relaxed">
                            You&apos;ve reviewed all available markets in your selected
                            categories.
                        </p>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() =>
                                dispatch({ type: "SET_SCREEN", screen: "filter" })
                            }
                            className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-primary/80 btn-secondary"
                        >
                            Change Filters
                        </motion.button>
                    </motion.div>
                ) : (
                    <AnimatePresence>
                        {markets
                            .slice(currentIndex, currentIndex + 3)
                            .reverse()
                            .map((market, i, arr) => {
                                const actualIndex = arr.length - 1 - i;
                                return (
                                    <SwipeCard
                                        key={market.id}
                                        data={{
                                            market,
                                            analysis: analyses.get(market.id) || null,
                                        }}
                                        isTop={actualIndex === 0}
                                        index={actualIndex}
                                        onSwipe={handleSwipe}
                                    />
                                );
                            })}
                    </AnimatePresence>
                )}
            </div>

            {/* Toast */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onDone={() => setToast(null)}
                />
            )}

            {/* Bet Amount Bottom Sheet */}
            <AnimatePresence>
                {showBetSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 sheet-overlay z-40"
                            onClick={() => setShowBetSheet(false)}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/[0.06] p-6 z-50 noise-overlay"
                            style={{
                                background: "linear-gradient(180deg, #1E1E22 0%, #1C1C1E 100%)",
                                boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                            }}
                        >
                            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

                            <h3 className="text-[15px] font-bold text-primary mb-4 text-center tracking-tight">
                                Bet Amount per Swipe
                            </h3>

                            <div className="flex flex-wrap gap-3 mb-5 justify-center">
                                {PRESET_BETS.map((amt) => (
                                    <motion.button
                                        key={amt}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedBet(amt)}
                                        className={`w-[70px] py-3 rounded-xl text-[14px] font-bold transition-all duration-200 border ${selectedBet === amt
                                            ? "border-accent-green bg-accent-green/10 text-accent-green shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                            : "border-white/[0.06] card-elevated-sm text-secondary/60 hover:text-primary"
                                            }`}
                                    >
                                        ${amt}
                                    </motion.button>
                                ))}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    if (selectedBet) {
                                        dispatch({ type: "SET_BET_AMOUNT", amount: selectedBet });
                                        setShowBetSheet(false);
                                    }
                                }}
                                disabled={!selectedBet}
                                className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 tracking-wide ${selectedBet
                                    ? "btn-primary text-white"
                                    : "card-elevated-sm text-secondary/40 cursor-not-allowed"
                                    }`}
                            >
                                Confirm
                            </motion.button>
                            <div className="h-4" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
