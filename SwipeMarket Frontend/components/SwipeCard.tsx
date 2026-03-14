"use client";

import React, { useState } from "react";
import {
    motion,
    useMotionValue,
    useTransform,
} from "framer-motion";
import { MarketWithAnalysis } from "@/types/types";
import { isCryptoMarket } from "@/lib/liquid";

interface SwipeCardProps {
    data: MarketWithAnalysis;
    onSwipe: (direction: "buy" | "skip" | "watchlist") => void;
    isTop: boolean;
    index?: number;
}

function formatVolume(n: number): string {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function Sparkline({ data, color }: { data: number[], color: string }) {
    if (!data || data.length < 2) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(" ");

    const pathData = `M 0,100 L ${data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - ((val - min) / range) * 100;
        return `${x},${y}`;
    }).join(" L ")} L 100,100 Z`;

    const gradientId = `gradient-${color.replace('#', '')}`;

    return (
        <div className="w-full h-12 mt-3 mb-3 relative">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path
                    d={pathData}
                    fill={`url(#${gradientId})`}
                />
                <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}

function getVerdictClass(verdict: string): string {
    switch (verdict) {
        case "STRONG BUY":
            return "verdict-strong-buy";
        case "LEAN BUY":
            return "verdict-lean-buy";
        case "WATCH":
            return "verdict-skip";
        case "LEAN SELL":
            return "verdict-skip";
        case "STRONG SELL":
            return "verdict-skip";
        default:
            return "verdict-lean-buy";
    }
}

function getRiskColor(risk: string): string {
    switch (risk) {
        case "low":
            return "text-accent-green";
        case "medium":
            return "text-accent-gold";
        case "high":
            return "text-accent-red";
        default:
            return "text-secondary";
    }
}

function getRiskDots(risk: string) {
    const count = risk === "low" ? 1 : risk === "medium" ? 2 : 3;
    const color = risk === "low" ? "bg-accent-green" : risk === "medium" ? "bg-accent-gold" : "bg-accent-red";
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
                <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${i < count ? color : "bg-white/10"
                        }`}
                />
            ))}
        </div>
    );
}

/**
 * Parses markdown-style **bold** into actual <strong> elements.
 * Strips stray asterisks and returns React nodes.
 */
function RichText({ text, className }: { text: string; className?: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    const inner = part.slice(2, -2);
                    return (
                        <span key={i} className="font-semibold text-[#FAFAFA]">
                            {inner}
                        </span>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}

/**
 * A single bullet row with a subtle dot accent and rich text body.
 */
function BulletRow({ text }: { text: string }) {
    if (!text) return null;

    // Truncate to ~140 chars, but clean up any broken bold markers
    let truncated = text.length > 140 ? text.slice(0, 137) : text;
    if (text.length > 140) {
        // Strip any unclosed ** at the end
        const openCount = (truncated.match(/\*\*/g) || []).length;
        if (openCount % 2 !== 0) {
            // Odd number of ** means one is unclosed — remove the last one
            const lastIdx = truncated.lastIndexOf("**");
            truncated = truncated.slice(0, lastIdx).trimEnd();
        }
        truncated += "...";
    }

    return (
        <div className="flex items-start gap-2">
            <span className="text-accent-gold/60 text-[8px] mt-[5px] shrink-0">&#9679;</span>
            <RichText
                text={truncated}
                className="text-[12px] text-secondary/70 leading-snug"
            />
        </div>
    );
}

/**
 * Compact momentum sparkline (40px max height) using raw SVG.
 */
function MiniSparkline({ data }: { data: number[] }) {
    if (!data || data.length < 2) return null;

    const isUp = data[data.length - 1] >= data[0];
    const lineColor = isUp ? "#10B981" : "#EF4444";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data
        .map((val, i) => {
            const px = (i / (data.length - 1)) * 100;
            const py = 100 - ((val - min) / range) * 100;
            return `${px},${py}`;
        })
        .join(" ");

    const fillPath = `M 0,100 L ${data
        .map((val, i) => {
            const px = (i / (data.length - 1)) * 100;
            const py = 100 - ((val - min) / range) * 100;
            return `${px},${py}`;
        })
        .join(" L ")} L 100,100 Z`;

    const gradId = `mini-grad-${isUp ? "up" : "dn"}`;

    return (
        <div className="w-full mb-2.5" style={{ height: 40 }}>
            <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
            >
                <defs>
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={lineColor} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={fillPath} fill={`url(#${gradId})`} />
                <polyline
                    points={points}
                    fill="none"
                    stroke={lineColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            </svg>
        </div>
    );
}

export default function SwipeCard({ data, onSwipe, isTop, index = 0 }: SwipeCardProps) {
    const { market, analysis } = data;
    const [exiting, setExiting] = useState(false);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotate = useTransform(x, [-200, 200], [-12, 12]);
    const buyOpacity = useTransform(x, [0, 100], [0, 1]);
    const skipOpacity = useTransform(x, [-100, 0], [1, 0]);
    const watchlistOpacity = useTransform(y, [-100, 0], [1, 0]);

    const [currentGlow, setCurrentGlow] = useState("");
    x.on("change", (val) => {
        if (val > 50) setCurrentGlow("glow-green");
        else if (val < -50) setCurrentGlow("glow-red");
        else setCurrentGlow("");
    });
    y.on("change", (val) => {
        if (val < -50 && Math.abs(x.get()) < 50) setCurrentGlow("glow-blue");
    });

    const handleDragEnd = (
        _: MouseEvent | TouchEvent | PointerEvent,
        info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }
    ) => {
        const threshold = 100;
        const velocityThreshold = 500;

        if (info.offset.y < -threshold || info.velocity.y < -velocityThreshold) {
            setExiting(true);
            onSwipe("watchlist");
            return;
        }
        if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
            setExiting(true);
            onSwipe("buy");
            return;
        }
        if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
            setExiting(true);
            onSwipe("skip");
            return;
        }
    };

    const isCrypto = isCryptoMarket(market);
    const cryptoMarket = isCrypto ? market : null;

    const daysLeft = isCrypto
        ? null
        : Math.max(
            0,
            Math.ceil(
                (new Date(market.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            )
        );

    if (!isTop) {
        return (
            <motion.div
                className="absolute inset-0 mx-3 mt-2 rounded-2xl"
                initial={{
                    scale: 1 - (index * 0.04),
                    y: index * 12,
                    opacity: Math.max(0, 1 - (index * 0.4))
                }}
                animate={{
                    scale: 1 - (index * 0.04),
                    y: index * 12,
                    opacity: Math.max(0, 1 - (index * 0.4))
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.02) 0%, #1C1C1E 100%)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    zIndex: -index
                }}
            />
        );
    }

    return (
        <motion.div
            className={`absolute inset-0 mx-3 mt-2 cursor-grab active:cursor-grabbing touch-none ${currentGlow}`}
            style={{ x, y, rotate }}
            drag={!exiting}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.9}
            onDragEnd={handleDragEnd}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            exit={{
                x: x.get() > 50 ? 400 : x.get() < -50 ? -400 : 0,
                y: y.get() < -50 ? -600 : 0,
                opacity: 0,
                transition: { duration: 0.3 },
            }}
        >
            <div className="h-full card-elevated rounded-2xl overflow-hidden flex flex-col relative noise-overlay">
                {/* Top accent line */}
                <div
                    className="absolute top-0 left-0 right-0 h-[1px]"
                    style={{
                        background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)",
                    }}
                />

                {/* BUY Stamp */}
                <motion.div className="stamp stamp-buy" style={{ opacity: buyOpacity }}>
                    BUY
                </motion.div>

                {/* SKIP Stamp */}
                <motion.div className="stamp stamp-skip" style={{ opacity: skipOpacity }}>
                    SKIP
                </motion.div>

                {/* WATCHLIST Stamp */}
                <motion.div
                    className="stamp stamp-watchlist"
                    style={{ opacity: watchlistOpacity }}
                >
                    WATCHLIST
                </motion.div>

                <div className="phone-content overflow-y-auto flex-1 p-4 pt-3">
                    {/* Top badges */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="px-3 py-1 rounded-lg card-elevated-sm text-[11px] font-medium text-secondary/80 tracking-wide">
                            {market.category}
                        </span>
                        {daysLeft !== null && (
                            <span className="px-3 py-1 rounded-lg card-elevated-sm text-[11px] font-medium text-secondary/80 tracking-wide">
                                {market.end_date === "Ongoing" ? "Ongoing" : `${daysLeft}d left`}
                            </span>
                        )}
                    </div>

                    {/* Question / Asset Name */}
                    <h2 className="text-[18px] font-bold text-primary leading-snug mb-4 line-clamp-3 tracking-tight">
                        {market.question}
                    </h2>

                    {/* Odds or Price Bar */}
                    {isCrypto && cryptoMarket ? (
                        <div className="mb-5">
                            <div className="flex justify-between items-end mb-1">
                                <div>
                                    <span className="text-[28px] font-bold text-primary tracking-tight tabular-nums relative top-1">
                                        ${cryptoMarket.current_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                    </span>
                                    <span className={`ml-2 text-[13px] font-semibold tracking-wide ${cryptoMarket.price_change_pct >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                                        {cryptoMarket.price_change_pct >= 0 ? "+" : ""}{cryptoMarket.price_change_pct.toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            {cryptoMarket.price_history && cryptoMarket.price_history.length > 0 && (
                                <Sparkline
                                    data={cryptoMarket.price_history}
                                    color={cryptoMarket.price_change_pct >= 0 ? "#10B981" : "#EF4444"}
                                />
                            )}

                            <div className="flex justify-between text-[10px] text-secondary/60 mb-1 tracking-wide font-medium">
                                <span>24h Low: ${cryptoMarket.low_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                <span>24h High: ${cryptoMarket.high_24h.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden relative">
                                {(() => {
                                    const range = cryptoMarket.high_24h - cryptoMarket.low_24h || 1;
                                    const pos = ((cryptoMarket.current_price - cryptoMarket.low_24h) / range) * 100;
                                    return (
                                        <div
                                            className="absolute top-0 bottom-0 bg-white/20 rounded-full"
                                            style={{ left: 0, right: `${Math.max(0, 100 - pos)}%` }}
                                        />
                                    );
                                })()}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-5">
                            <div className="flex justify-between text-[11px] mb-2">
                                <span className="text-accent-green font-semibold tracking-wide">
                                    YES {(market.yes_price * 100).toFixed(0)}c
                                </span>
                                <span className="text-accent-red/80 font-semibold tracking-wide">
                                    NO {(market.no_price * 100).toFixed(0)}c
                                </span>
                            </div>
                            <div className="odds-bar">
                                <div
                                    className="odds-bar-yes"
                                    style={{ width: `${market.yes_price * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mb-4">
                        {[
                            { label: "Volume", value: formatVolume(market.volume) },
                            { label: "Liquidity", value: formatVolume(market.liquidity) },
                            { label: "24h Vol", value: formatVolume(market.volume_24h) },
                        ].map((stat) => (
                            <div key={stat.label} className="stat-card rounded-xl p-2.5 text-center">
                                <p className="text-[9px] text-secondary/60 uppercase tracking-[0.1em] mb-0.5">
                                    {stat.label}
                                </p>
                                <p className="text-[13px] font-semibold text-primary/90">
                                    {stat.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* AI Analysis Box */}
                    {analysis ? (
                        <div className="ai-analysis-box rounded-2xl p-3.5">
                            {/* Header: label + verdict */}
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent-gold pulse-slow" />
                                    <span className="text-accent-gold text-[10px] font-bold tracking-[0.15em] uppercase">
                                        AI Analysis
                                    </span>
                                </div>
                                <span
                                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${getVerdictClass(
                                        analysis.verdict
                                    )}`}
                                >
                                    {analysis.verdict}
                                </span>
                            </div>

                            {/* Confidence bar */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${analysis.confidence}%` }}
                                        transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                        style={{
                                            background: `linear-gradient(90deg, rgba(245, 158, 11, 0.5) 0%, #F59E0B 100%)`,
                                        }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold text-accent-gold/90 tabular-nums">
                                    {analysis.confidence}%
                                </span>
                            </div>

                            {/* Mini Momentum Sparkline */}
                            {market.price_history && market.price_history.length >= 2 && !isCrypto && (
                                <MiniSparkline data={market.price_history} />
                            )}

                            {/* Bullet point insights */}
                            <div className="space-y-1.5 mb-2.5">
                                {analysis.bullets.slice(0, 5).map((bullet, i) => (
                                    <BulletRow key={i} text={bullet} />
                                ))}
                            </div>

                            {/* Risk Level */}
                            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                                <div className="flex items-center gap-2">
                                    <span className="text-[9px] text-secondary/50 uppercase tracking-[0.1em]">
                                        Risk
                                    </span>
                                    <span
                                        className={`text-[10px] font-semibold uppercase tracking-wide ${getRiskColor(
                                            analysis.risk_level
                                        )}`}
                                    >
                                        {analysis.risk_level}
                                    </span>
                                </div>
                                {getRiskDots(analysis.risk_level)}
                            </div>
                        </div>
                    ) : (
                        /* Loading skeleton for analysis */
                        <div className="ai-analysis-box rounded-2xl p-3.5 overflow-hidden relative">
                            {/* Shimmer overlay */}
                            <div className="absolute inset-0 z-0">
                                <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent shimmer-effect" />
                            </div>

                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-gold/40 animate-pulse" />
                                        <span className="text-accent-gold/40 text-[10px] font-bold tracking-[0.15em] uppercase">
                                            Analyzing...
                                        </span>
                                    </div>
                                    <div className="w-16 h-5 bg-white/[0.03] rounded-lg" />
                                </div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex-1 h-1 bg-white/[0.03] rounded-full" />
                                    <div className="w-8 h-3 bg-white/[0.03] rounded" />
                                </div>
                                <div className="space-y-2 mb-2.5">
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-3 bg-white/[0.03] rounded mt-0.5 shrink-0" />
                                        <div className="h-3 bg-white/[0.03] rounded w-full" />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-3 bg-white/[0.03] rounded mt-0.5 shrink-0" />
                                        <div className="h-3 bg-white/[0.03] rounded w-5/6" />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <div className="w-7 h-3 bg-white/[0.03] rounded mt-0.5 shrink-0" />
                                        <div className="h-3 bg-white/[0.03] rounded w-4/6" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-2 border-t border-white/[0.03]">
                                    <div className="w-12 h-2.5 bg-white/[0.03] rounded" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
