"use client";

import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

type TabFilter = "all" | "buys" | "watchlist";

export default function DashboardScreen() {
    const { state, dispatch } = useApp();
    const [activeTab, setActiveTab] = useState<TabFilter>("all");

    const buys = state.swipeHistory.filter((s) => s.action === "buy");
    const skips = state.swipeHistory.filter((s) => s.action === "skip");
    const watchlist = state.swipeHistory.filter((s) => s.action === "watchlist");

    const avgConfidence = useMemo(() => {
        if (state.swipeHistory.length === 0) return 0;
        const total = state.swipeHistory.reduce(
            (sum, s) => sum + s.analysis.confidence,
            0
        );
        return Math.round(total / state.swipeHistory.length);
    }, [state.swipeHistory]);

    const totalPnL = useMemo(() => {
        return buys.reduce((acc, s) => {
            const drift = Math.sin(s.timestamp * 0.001) * 0.05;
            const currentPrice = Math.min(
                0.99,
                Math.max(0.01, s.yes_price_at_swipe + drift)
            );
            const pnl =
                ((currentPrice - s.yes_price_at_swipe) / s.yes_price_at_swipe) *
                s.bet_amount;
            return acc + pnl;
        }, 0);
    }, [buys]);

    const filteredHistory = useMemo(() => {
        switch (activeTab) {
            case "buys":
                return buys;
            case "watchlist":
                return watchlist;
            default:
                return state.swipeHistory;
        }
    }, [activeTab, buys, watchlist, state.swipeHistory]);

    const tabs: { id: TabFilter; label: string }[] = [
        { id: "all", label: "All" },
        { id: "buys", label: "Buys" },
        { id: "watchlist", label: "Watchlist" },
    ];

    const getActionBadge = (action: string) => {
        switch (action) {
            case "buy":
                return {
                    label: "Bought",
                    class: "bg-accent-green/10 text-accent-green border border-accent-green/20",
                };
            case "skip":
                return {
                    label: "Skipped",
                    class: "bg-accent-red/10 text-accent-red border border-accent-red/20",
                };
            case "watchlist":
                return {
                    label: "Watching",
                    class: "bg-accent-blue/10 text-accent-blue border border-accent-blue/20",
                };
            default:
                return { label: "", class: "" };
        }
    };

    const getStripeClass = (action: string) => {
        switch (action) {
            case "buy":
                return "stripe-buy";
            case "skip":
                return "stripe-skip";
            case "watchlist":
                return "stripe-watchlist";
            default:
                return "bg-secondary";
        }
    };

    const stats = [
        {
            label: "Reviewed",
            value: state.swipeHistory.length,
            color: "text-primary",
        },
        {
            label: "Confidence",
            value: `${avgConfidence}%`,
            color: "text-accent-gold",
        },
        {
            label: "Buys",
            value: buys.length,
            color: "text-accent-green",
        },
        {
            label: "Skips",
            value: skips.length,
            color: "text-accent-red/80",
        },
    ];

    return (
        <div className="flex flex-col h-full pt-14 relative">
            {/* Ambient glow */}
            <div
                className="absolute top-0 right-0 w-[200px] h-[200px] pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(245, 158, 11, 0.03) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            {/* Header */}
            <div className="px-5 mb-4 relative z-10">
                <h1 className="text-xl font-bold text-primary tracking-tight">
                    Dashboard
                </h1>
                <p className="text-[11px] text-secondary/50 mt-0.5 tracking-wide">
                    Your market activity
                </p>
            </div>

            {/* Hero Stats */}
            <div className="px-5 mb-4">
                <div className="grid grid-cols-4 gap-2">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="stat-card rounded-xl p-2.5 text-center"
                        >
                            <p className="text-[8px] text-secondary/50 uppercase tracking-[0.12em] mb-1">
                                {stat.label}
                            </p>
                            <p className={`text-lg font-bold tabular-nums ${stat.color}`}>
                                {stat.value}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Segment Control */}
            <div className="px-5 mb-3">
                <div className="flex card-elevated-sm rounded-xl p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 tracking-wide relative ${activeTab === tab.id
                                ? "segment-active"
                                : "text-secondary/50"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* P&L Banner for Buys tab */}
            {activeTab === "buys" && buys.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-5 mb-3"
                >
                    <div className="flex items-center justify-between card-elevated rounded-xl px-4 py-3">
                        <span className="text-[11px] text-secondary/60 tracking-wide">
                            Unrealized P&L
                        </span>
                        <span
                            className={`text-[13px] font-bold tabular-nums ${totalPnL >= 0 ? "text-accent-green" : "text-accent-red"
                                }`}
                        >
                            {totalPnL >= 0 ? "+" : ""}${totalPnL.toFixed(2)}
                        </span>
                    </div>
                </motion.div>
            )}

            {/* Swipe History */}
            <div className="flex-1 overflow-y-auto phone-content px-5 pb-4">
                {filteredHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center mt-4">
                        <div className="w-16 h-16 rounded-full card-elevated-sm flex items-center justify-center mb-4">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-primary mb-2 tracking-tight">
                            No swipes yet
                        </h3>
                        <p className="text-[13px] text-secondary/60 mb-6 leading-relaxed max-w-[240px]">
                            Head to Explore to discover markets and build your portfolio.
                        </p>
                        <button
                            onClick={() => dispatch({ type: "SET_SCREEN", screen: "swipe" })}
                            className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white btn-primary transition-all duration-300"
                        >
                            Start Swiping
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {filteredHistory.map((record, idx) => {
                            const badge = getActionBadge(record.action);
                            const drift = Math.sin(record.timestamp * 0.001) * 0.05;
                            const currentPrice = Math.min(
                                0.99,
                                Math.max(0.01, record.yes_price_at_swipe + drift)
                            );

                            return (
                                <motion.div
                                    key={record.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex card-elevated rounded-xl overflow-hidden"
                                >
                                    {/* Color stripe */}
                                    <div
                                        className={`w-[3px] min-h-full ${getStripeClass(
                                            record.action
                                        )}`}
                                    />

                                    <div className="flex-1 p-3">
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <p className="text-[12px] font-semibold text-primary/90 line-clamp-2 flex-1 leading-snug">
                                                {record.market.question}
                                            </p>
                                            <span
                                                className={`text-[9px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${badge.class}`}
                                            >
                                                {badge.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] text-secondary/50">
                                            <span className="tabular-nums">
                                                Entry: {(record.yes_price_at_swipe * 100).toFixed(0)}c
                                            </span>
                                            <span className="tabular-nums">
                                                Now: {(currentPrice * 100).toFixed(0)}c
                                            </span>
                                            {record.action === "buy" && (
                                                <span
                                                    className={`font-semibold tabular-nums ${currentPrice >= record.yes_price_at_swipe
                                                        ? "text-accent-green"
                                                        : "text-accent-red"
                                                        }`}
                                                >
                                                    {currentPrice >= record.yes_price_at_swipe
                                                        ? "+"
                                                        : ""}
                                                    {(
                                                        ((currentPrice - record.yes_price_at_swipe) /
                                                            record.yes_price_at_swipe) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
