"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
    motion,
    useMotionValue,
    useTransform,
} from "framer-motion";
import { MarketWithAnalysis, CryptoMarket } from "@/types/types";
import { isCryptoMarket } from "@/lib/liquid";
import PolymarketChart from "./PolymarketChart";

interface SwipeCardProps {
    data: MarketWithAnalysis;
    onSwipe: (direction: "buy" | "skip" | "watchlist") => void;
    isTop: boolean;
    index?: number;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatVolume(n: number): string {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/** Adapts decimal places to asset magnitude — safe for BTC → PEPE. */
function formatInspectPrice(price: number): string {
    if (price >= 10_000) return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (price >= 1_000) return `$${price.toFixed(2)}`;
    if (price >= 100) return `$${price.toFixed(2)}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
}

// ─── Timeframe config ────────────────────────────────────────────────────────

const TIMEFRAMES = ["5m", "1h", "24h"] as const;
type Timeframe = typeof TIMEFRAMES[number];

const TF_CONFIG: Record<Timeframe, { interval: string; limit: number; msPerPoint: number }> = {
    "5m": { interval: "5m", limit: 24, msPerPoint: 5 * 60_000 },
    "1h": { interval: "1h", limit: 24, msPerPoint: 60 * 60_000 },
    "24h": { interval: "1d", limit: 7, msPerPoint: 24 * 60 * 60_000 },
};

function formatInspectTime(idx: number, total: number, timeframe: Timeframe, timestamps: Date[]): string {
    const ts = timestamps[idx] ?? (() => {
        const msPerPoint = TF_CONFIG[timeframe].msPerPoint;
        return new Date(Date.now() - (total - 1 - idx) * msPerPoint);
    })();
    if (timeframe === "24h") {
        return ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    return ts.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── CryptoGraph ─────────────────────────────────────────────────────────────

interface CryptoGraphProps {
    symbol: string;
    currentPrice: number;
    changePct: number;
    low24h: number;
    high24h: number;
    initialData: number[];
    timeframe: Timeframe;
}

function CryptoGraph({
    symbol, currentPrice, changePct, low24h, high24h, initialData, timeframe,
}: CryptoGraphProps) {
    const [graphData, setGraphData] = useState<number[]>(initialData);
    const [timestamps, setTimestamps] = useState<Date[]>([]);
    const [loading, setLoading] = useState(false);

    // Inspect state
    const [inspecting, setInspecting] = useState(false);
    const [inspectIdx, setInspectIdx] = useState(initialData.length - 1);

    const svgRef = useRef<SVGSVGElement>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const inspectRef = useRef(false);    // sync'd ref so event callbacks stay fresh
    const graphDataRef = useRef(graphData); // sync'd ref to avoid stale closures

    useEffect(() => { inspectRef.current = inspecting; }, [inspecting]);
    useEffect(() => { graphDataRef.current = graphData; }, [graphData]);

    // ── Fetch candle data when timeframe changes ──────────────────────────────
    useEffect(() => {
        if (timeframe === "24h") {
            setGraphData(initialData);
            setTimestamps([]);
            return;
        }
        setLoading(true);
        const { interval, limit } = TF_CONFIG[timeframe];
        fetch(`/api/liquid/candles?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=${limit}`)
            .then(r => r.json())
            .then(d => {
                if (Array.isArray(d.prices) && d.prices.length > 1) {
                    setGraphData(d.prices);
                    setTimestamps((d.timestamps ?? []).map((t: string) => new Date(t)));
                }
            })
            .catch(() => { /* keep existing data */ })
            .finally(() => setLoading(false));
    }, [timeframe, symbol, initialData]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const cancelTimer = useCallback(() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    }, []);

    const idxFromClientX = useCallback((clientX: number): number => {
        if (!svgRef.current) return graphDataRef.current.length - 1;
        const rect = svgRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        return Math.round(ratio * (graphDataRef.current.length - 1));
    }, []);

    // ── Long-press gesture handlers ───────────────────────────────────────────
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
        cancelTimer();
        timerRef.current = setTimeout(() => {
            setInspecting(true);
            setInspectIdx(idxFromClientX(e.clientX));
            // Capture pointer so we keep events even if finger leaves SVG
            try { (e.target as Element).setPointerCapture(e.pointerId); } catch { /* ignore */ }
        }, 500);
    }, [cancelTimer, idxFromClientX]);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        const dx = Math.abs(e.clientX - startXRef.current);
        if (inspectRef.current) {
            // In inspect mode: track crosshair, block card drag
            e.stopPropagation();
            setInspectIdx(idxFromClientX(e.clientX));
        } else if (dx > 8) {
            // Horizontal movement detected — cancel long press, let swipe through
            cancelTimer();
        }
    }, [cancelTimer, idxFromClientX]);

    const handlePointerUp = useCallback(() => {
        cancelTimer();
        setInspecting(false);
    }, [cancelTimer]);

    const handlePointerLeave = useCallback(() => {
        cancelTimer();
        // Don't cancel if already in inspect mode — pointer is captured, pointerUp handles exit
        if (!inspectRef.current) setInspecting(false);
    }, [cancelTimer]);

    // ── SVG path computation ──────────────────────────────────────────────────
    const data = graphData;
    const isUp = data.length > 0 && data[data.length - 1] >= data[0];
    const lineColor = isUp ? "#10B981" : "#EF4444";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const gradId = `cg-${isUp ? "up" : "dn"}-${symbol.replace(/[^a-z]/gi, "")}`;

    const pt = (i: number) => ({
        x: (i / Math.max(data.length - 1, 1)) * 100,
        y: 100 - ((data[i] - min) / range) * 100,
    });

    const polyPoints = data.map((_, i) => { const p = pt(i); return `${p.x},${p.y}`; }).join(" ");
    const fillPath = `M 0,100 L ${data.map((_, i) => { const p = pt(i); return `${p.x},${p.y}`; }).join(" L ")} L 100,100 Z`;

    // Crosshair position
    const cx = (inspectIdx / Math.max(data.length - 1, 1)) * 100;
    const cy = pt(inspectIdx).y;

    // Tooltip: flip to left side if crosshair is past 65% of width
    const tooltipLeft = cx <= 65;
    const inspectPrice = data[inspectIdx] ?? currentPrice;
    const inspectTime = formatInspectTime(inspectIdx, data.length, timeframe, timestamps);

    // Range bar
    const rangeSpan = high24h - low24h || 1;
    const rangePos = Math.max(0, Math.min(100, ((currentPrice - low24h) / rangeSpan) * 100));

    return (
        <div className="mb-4">
            {/* Price display */}
            <div className="mb-1">
                <span className={`text-[26px] font-bold text-primary tracking-tight tabular-nums transition-opacity ${inspecting ? "opacity-40" : ""}`}>
                    {inspecting ? formatInspectPrice(inspectPrice) : formatInspectPrice(currentPrice)}
                </span>
                <span className={`ml-2 text-[13px] font-semibold tracking-wide ${changePct >= 0 ? "text-accent-green" : "text-accent-red"}`}>
                    {changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%
                </span>
            </div>

            {/* Graph */}
            <div className="relative mt-1 mb-2" style={{ touchAction: inspecting ? "none" : "auto" }}>
                {/* Loading spinner */}
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-3.5 h-3.5 border border-white/20 border-t-white/50 rounded-full animate-spin" />
                    </div>
                )}

                {/* Inspect tooltip */}
                {inspecting && (
                    <div
                        className="absolute -top-9 z-20 pointer-events-none"
                        style={{
                            left: tooltipLeft ? `${cx}%` : undefined,
                            right: tooltipLeft ? undefined : `${100 - cx}%`,
                            transform: tooltipLeft ? "translateX(-50%)" : "translateX(50%)",
                        }}
                    >
                        <div className="px-2.5 py-1.5 rounded-lg bg-[#2A2A2E] border border-white/10 shadow-lg whitespace-nowrap">
                            <p className="text-[9px] text-secondary/50 tabular-nums mb-0.5">{inspectTime}</p>
                            <p className="text-[12px] font-bold text-primary tabular-nums">{formatInspectPrice(inspectPrice)}</p>
                        </div>
                    </div>
                )}

                <svg
                    ref={svgRef}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className={`w-full overflow-visible select-none transition-opacity ${loading ? "opacity-30" : ""}`}
                    style={{ height: 64, cursor: inspecting ? "crosshair" : "default" }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                >
                    <defs>
                        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={fillPath} fill={`url(#${gradId})`} />
                    <polyline
                        points={polyPoints}
                        fill="none"
                        stroke={lineColor}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />

                    {/* Crosshair */}
                    {inspecting && (
                        <>
                            <line
                                x1={cx} y1={0} x2={cx} y2={100}
                                stroke="rgba(255,255,255,0.25)"
                                strokeWidth="1"
                                strokeDasharray="2,3"
                                vectorEffect="non-scaling-stroke"
                            />
                            <circle
                                cx={cx} cy={cy} r={3}
                                fill={lineColor}
                                stroke="#1C1C1E"
                                strokeWidth="1.5"
                                vectorEffect="non-scaling-stroke"
                            />
                        </>
                    )}
                </svg>

                {/* Hold-to-inspect hint */}
                {!inspecting && (
                    <p className="text-[8px] text-secondary/20 text-center mt-0.5 tracking-widest pointer-events-none select-none">
                        HOLD TO INSPECT
                    </p>
                )}
            </div>

            {/* 24h range */}
            <div className="flex justify-between text-[10px] text-secondary/60 mb-1 tracking-wide font-medium">
                <span>24h Low: {formatInspectPrice(low24h)}</span>
                <span>24h High: {formatInspectPrice(high24h)}</span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden relative">
                <div
                    className="absolute top-0 bottom-0 bg-white/20 rounded-full"
                    style={{ left: 0, right: `${Math.max(0, 100 - rangePos)}%` }}
                />
            </div>
        </div>
    );
}

// ─── Misc sub-components ─────────────────────────────────────────────────────

function getVerdictClass(verdict: string): string {
    switch (verdict) {
        case "STRONG BUY": return "verdict-strong-buy";
        case "LEAN BUY": return "verdict-lean-buy";
        default: return "verdict-skip";
    }
}

function getRiskColor(risk: string): string {
    switch (risk) {
        case "low": return "text-accent-green";
        case "medium": return "text-accent-gold";
        case "high": return "text-accent-red";
        default: return "text-secondary";
    }
}

function getRiskDots(risk: string) {
    const count = risk === "low" ? 1 : risk === "medium" ? 2 : 3;
    const color = risk === "low" ? "bg-accent-green" : risk === "medium" ? "bg-accent-gold" : "bg-accent-red";
    return (
        <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < count ? color : "bg-white/10"}`} />
            ))}
        </div>
    );
}

function RichText({ text, className }: { text: string; className?: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <span className={className}>
            {parts.map((part, i) => {
                if (part.startsWith("**") && part.endsWith("**")) {
                    return <span key={i} className="font-semibold text-[#FAFAFA]">{part.slice(2, -2)}</span>;
                }
                return <span key={i}>{part}</span>;
            })}
        </span>
    );
}

function BulletRow({ text }: { text: string }) {
    if (!text) return null;
    return (
        <div className="flex items-start gap-2">
            <span className="text-accent-gold/60 text-[8px] mt-[5px] shrink-0">&#9679;</span>
            <RichText text={text} className="text-[12px] text-secondary/70 leading-snug" />
        </div>
    );
}

function MiniSparkline({ data }: { data: number[] }) {
    if (!data || data.length < 2) return null;
    const isUp = data[data.length - 1] >= data[0];
    const color = isUp ? "#10B981" : "#EF4444";
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const gradId = `mini-${isUp ? "up" : "dn"}`;
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(" ");
    const fill = `M 0,100 L ${pts.split(" ").join(" L ")} L 100,100 Z`;
    return (
        <div className="w-full mb-2.5" style={{ height: 40 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.15" />
                        <stop offset="100%" stopColor={color} stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={fill} fill={`url(#${gradId})`} />
                <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
        </div>
    );
}

// ─── SwipeCard ───────────────────────────────────────────────────────────────

export default function SwipeCard({ data, onSwipe, isTop, index = 0 }: SwipeCardProps) {
    const { market, analysis } = data;
    const [exiting, setExiting] = useState(false);
    const [timeframe, setTimeframe] = useState<Timeframe>("24h");

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
        const t = 100, vt = 500;
        if (info.offset.y < -t || info.velocity.y < -vt) { setExiting(true); onSwipe("watchlist"); return; }
        if (info.offset.x > t || info.velocity.x > vt) { setExiting(true); onSwipe("buy"); return; }
        if (info.offset.x < -t || info.velocity.x < -vt) { setExiting(true); onSwipe("skip"); return; }
    };

    const isCrypto = isCryptoMarket(market);
    const cryptoMarket = isCrypto ? (market as CryptoMarket) : null;

    const daysLeft = isCrypto
        ? null
        : Math.max(0, Math.ceil((new Date(market.end_date).getTime() - Date.now()) / 86_400_000));

    if (!isTop) {
        return (
            <motion.div
                className="absolute inset-0 mx-3 mt-2 rounded-2xl"
                initial={{ scale: 1 - index * 0.04, y: index * 12, opacity: Math.max(0, 1 - index * 0.4) }}
                animate={{ scale: 1 - index * 0.04, y: index * 12, opacity: Math.max(0, 1 - index * 0.4) }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    background: "linear-gradient(145deg, rgba(255,255,255,0.02) 0%, #1C1C1E 100%)",
                    border: "1px solid rgba(255,255,255,0.03)",
                    zIndex: -index,
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
                    style={{ background: "linear-gradient(90deg, transparent 10%, rgba(255,255,255,0.08) 50%, transparent 90%)" }}
                />

                {/* Swipe stamps */}
                <motion.div className="stamp stamp-buy" style={{ opacity: buyOpacity }}>BUY</motion.div>
                <motion.div className="stamp stamp-skip" style={{ opacity: skipOpacity }}>SKIP</motion.div>
                <motion.div className="stamp stamp-watchlist" style={{ opacity: watchlistOpacity }}>WATCHLIST</motion.div>

                <div className="phone-content overflow-y-auto flex-1 flex flex-col relative w-full h-full">
                    {/* Hero image */}
                    {market.image ? (
                        <div className="relative w-full h-36 shrink-0 mt-[-1px] rounded-t-2xl overflow-hidden">
                            <img
                                src={market.image}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                    e.currentTarget.parentElement?.classList.add("bg-gradient-to-b", "from-white/[0.05]", "to-transparent");
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-[#1C1C1E]/60 to-[#1C1C1E]" />
                        </div>
                    ) : (
                        <div className="relative w-full h-12 shrink-0 bg-gradient-to-b from-white/[0.05] to-transparent rounded-t-2xl" />
                    )}

                    {/* Floating badges */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                        <span className="px-2.5 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/90 tracking-wide">
                            {market.category}
                        </span>
                        {daysLeft !== null && (
                            <span className="px-2.5 py-0.5 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-medium text-white/90 tracking-wide">
                                {market.end_date === "Ongoing" ? "Ongoing" : `${daysLeft}d left`}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 px-4 pb-4 -mt-6 z-10 relative flex flex-col justify-end">

                        {/* Timeframe selector — only for crypto, sits above the title */}
                        {isCrypto && (
                            <div className="flex gap-1 mb-2">
                                {TIMEFRAMES.map(tf => (
                                    <button
                                        key={tf}
                                        onPointerDown={(e) => { e.stopPropagation(); setTimeframe(tf); }}
                                        className={`px-2.5 py-1 rounded-lg text-[9px] font-semibold tracking-wide transition-all duration-150 ${timeframe === tf
                                            ? "bg-white/10 text-primary border border-white/15"
                                            : "text-secondary/35 border border-transparent"
                                            }`}
                                    >
                                        {tf}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Question / Asset title */}
                        <h2 className="text-[17px] font-bold text-primary leading-snug mb-3 line-clamp-3 tracking-tight drop-shadow-md">
                            {market.question}
                        </h2>

                        {/* Crypto section — universal CryptoGraph */}
                        {isCrypto && cryptoMarket ? (
                            <CryptoGraph
                                symbol={cryptoMarket.currency_pair_code}
                                currentPrice={cryptoMarket.current_price}
                                changePct={cryptoMarket.price_change_pct}
                                low24h={cryptoMarket.low_24h}
                                high24h={cryptoMarket.high_24h}
                                initialData={cryptoMarket.price_history ?? []}
                                timeframe={timeframe}
                            />
                        ) : (
                            /* Prediction market odds bar */
                            <div className="mb-4">
                                <div className="flex justify-between text-[11px] mb-1.5">
                                    <span className="text-accent-green font-semibold tracking-wide">
                                        YES {Math.max(1, Math.round(market.yes_price * 100))}%
                                    </span>
                                    <span className="text-accent-red/80 font-semibold tracking-wide">
                                        NO {Math.max(1, Math.round(market.no_price * 100))}%
                                    </span>
                                </div>
                                <div className="px-1">
                                    <PolymarketChart
                                        data={market.price_history || [market.yes_price]}
                                        yesColor="#10B981"
                                        noColor="#EF4444"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-3">
                            {[
                                { label: "Volume", value: formatVolume(market.volume) },
                                { label: "Liquidity", value: formatVolume(market.liquidity) },
                                { label: "24h Vol", value: formatVolume(market.volume_24h) },
                            ].map(stat => (
                                <div key={stat.label} className="stat-card rounded-xl p-2 text-center">
                                    <p className="text-[9px] text-secondary/60 uppercase tracking-[0.1em] mb-0.5">{stat.label}</p>
                                    <p className="text-[12px] font-semibold text-primary/90">{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* AI Analysis Box */}
                        {analysis ? (
                            <div className="ai-analysis-box rounded-2xl p-3 shrink-0">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-accent-gold pulse-slow" />
                                        <span className="text-accent-gold text-[10px] font-bold tracking-[0.15em] uppercase">AI Analysis</span>
                                    </div>
                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${getVerdictClass(analysis.verdict)}`}>
                                        {analysis.verdict}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${analysis.confidence}%` }}
                                            transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                                            style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.5) 0%, #F59E0B 100%)" }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-accent-gold/90 tabular-nums">{analysis.confidence}%</span>
                                </div>

                                {market.price_history && market.price_history.length >= 2 && !isCrypto && (
                                    <div className="mb-2"><MiniSparkline data={market.price_history} /></div>
                                )}

                                <div className="space-y-1 mb-2">
                                    {analysis.bullets.slice(0, 5).map((bullet, i) => (
                                        <BulletRow key={i} text={bullet} />
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.04]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-secondary/50 uppercase tracking-[0.1em]">Risk</span>
                                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${getRiskColor(analysis.risk_level)}`}>
                                            {analysis.risk_level}
                                        </span>
                                    </div>
                                    {getRiskDots(analysis.risk_level)}
                                </div>
                            </div>
                        ) : (
                            /* Loading skeleton */
                            <div className="ai-analysis-box rounded-2xl p-3 shrink-0 overflow-hidden relative mt-2">
                                <div className="absolute inset-0 z-0">
                                    <div className="w-full h-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent shimmer-effect" />
                                </div>
                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-accent-gold/40 animate-pulse" />
                                            <span className="text-accent-gold/40 text-[10px] font-bold tracking-[0.15em] uppercase">Analyzing...</span>
                                        </div>
                                        <div className="w-16 h-4 bg-white/[0.03] rounded-lg" />
                                    </div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="flex-1 h-1 bg-white/[0.03] rounded-full" />
                                        <div className="w-8 h-2 bg-white/[0.03] rounded" />
                                    </div>
                                    <div className="space-y-1.5 mb-2">
                                        {[1, 0.83, 0.67].map((w, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <div className="w-6 h-2 bg-white/[0.03] rounded mt-0.5 shrink-0" />
                                                <div className="h-2 bg-white/[0.03] rounded" style={{ width: `${w * 100}%` }} />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 pt-1.5 border-t border-white/[0.03]">
                                        <div className="w-12 h-2.5 bg-white/[0.03] rounded" />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div >
    );
}
