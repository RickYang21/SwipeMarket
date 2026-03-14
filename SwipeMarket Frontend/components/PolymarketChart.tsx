"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PolymarketChartProps {
    data: number[]; // Array of probabilities (0-1) for YES. NO is dynamically 1 - YES.
    yesColor?: string;
    noColor?: string;
}

export default function PolymarketChart({
    data,
    yesColor = "#10B981", // Green by default
    noColor = "#EF4444"   // Red by default
}: PolymarketChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);
    const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const startPosRef = useRef<{ x: number, y: number } | null>(null);

    // Cleanup timeout
    useEffect(() => {
        return () => {
            if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        };
    }, []);

    if (!data || data.length < 2) return null;

    // Chart dimensions are arbitrary mapped out to 0-100% space
    const getPathData = (lineData: number[], min: number, max: number) => {
        const range = max - min || 1;
        const points = lineData.map((val, i) => {
            const x = (i / (lineData.length - 1)) * 100;
            const y = 100 - ((val - min) / range) * 100;
            return `${x},${y}`;
        }).join(" ");

        const fillPath = `M 0,100 L ${lineData.map((val, i) => {
            const x = (i / (lineData.length - 1)) * 100;
            const y = 100 - ((val - min) / range) * 100;
            return `${x},${y}`;
        }).join(" L ")} L 100,100 Z`;

        return { points, fillPath };
    };

    const yesData = data;
    const noData = data.map(val => 1 - val);

    const yesPath = getPathData(yesData, 0, 1);
    const noPath = getPathData(noData, 0, 1);

    const handlePointerDown = (e: React.PointerEvent) => {
        startPosRef.current = { x: e.clientX, y: e.clientY };

        longPressTimeoutRef.current = setTimeout(() => {
            setIsScrubbing(true);
            updateScrubIndex(e.clientX);
            // Immediately stop propagation and capture pointer when long press is initiated
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            if (containerRef.current && !e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.setPointerCapture(e.pointerId);
            }
        }, 500);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isScrubbing) {
            // Check if they moved significantly before 500ms -> cancel long press
            if (startPosRef.current) {
                const dx = Math.abs(e.clientX - startPosRef.current.x);
                const dy = Math.abs(e.clientY - startPosRef.current.y);
                if (dx > 10 || dy > 10) {
                    if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
                }
            }
            return;
        }

        // AGGRESSIVE PROPAGATION STOP
        // If scrubbing, absolutely stop propagation so the SwipeCard doesn't swipe
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();

        // Prevent default browser touch actions (scrolling/pull-to-refresh)
        if (e.cancelable) {
            e.preventDefault();
        }

        // Ensure we capture pointer to track outside bounds
        if (containerRef.current && !e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        updateScrubIndex(e.clientX);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        if (isScrubbing) {
            e.stopPropagation();
            setIsScrubbing(false);
            setScrubIndex(null);
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        }
    };

    const handlePointerCancel = () => {
        if (longPressTimeoutRef.current) clearTimeout(longPressTimeoutRef.current);
        if (isScrubbing) {
            setIsScrubbing(false);
            setScrubIndex(null);
        }
    };

    const updateScrubIndex = (clientX: number) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        // Normalized x position (0 to 1)
        let normalizedX = (clientX - rect.left) / rect.width;
        normalizedX = Math.max(0, Math.min(1, normalizedX));

        // Find nearest index
        const index = Math.round(normalizedX * (data.length - 1));
        setScrubIndex(index);
    };

    const yesGradId = "poly-grad-yes";
    const noGradId = "poly-grad-no";

    // Tooltip position calculations based on the SVG coordinate system (0-100)
    let tooltipX = 0;
    let yesY = 0;
    let noY = 0;
    let currentYesVal = 0;
    let currentNoVal = 0;

    if (scrubIndex !== null && scrubIndex >= 0 && scrubIndex < data.length) {
        tooltipX = (scrubIndex / (data.length - 1)) * 100;
        currentYesVal = yesData[scrubIndex];
        currentNoVal = noData[scrubIndex];
        yesY = 100 - (currentYesVal * 100);
        noY = 100 - (currentNoVal * 100);
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-16 mt-2 mb-3 relative touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onPointerLeave={handlePointerCancel}
            // Add aggressive native stop propagation on touch to force Framer Motion to ignore
            onTouchStart={(e) => {
                if (isScrubbing) {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                }
            }}
            onTouchMove={(e) => {
                if (isScrubbing) {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                }
            }}
            onTouchEnd={(e) => {
                if (isScrubbing) {
                    e.stopPropagation();
                    e.nativeEvent.stopImmediatePropagation();
                }
            }}
        >
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id={yesGradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={yesColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={yesColor} stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id={noGradId} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={noColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={noColor} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* YES Area & Line */}
                <path d={yesPath.fillPath} fill={`url(#${yesGradId})`} />
                <polyline
                    points={yesPath.points}
                    fill="none"
                    stroke={yesColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={isScrubbing ? 0.6 : 1}
                />

                {/* NO Area & Line */}
                <path d={noPath.fillPath} fill={`url(#${noGradId})`} />
                <polyline
                    points={noPath.points}
                    fill="none"
                    stroke={noColor}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity={isScrubbing ? 0.6 : 1}
                />

                {/* Scrubbing Visuals */}
                <AnimatePresence>
                    {isScrubbing && scrubIndex !== null && (
                        <motion.g
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* Vertical Dashed Line */}
                            <line
                                x1={`${tooltipX}%`}
                                y1="-10%"
                                x2={`${tooltipX}%`}
                                y2="110%"
                                stroke="#4B5563"
                                strokeWidth="1"
                                strokeDasharray="3,3"
                                vectorEffect="non-scaling-stroke"
                            />

                            {/* Data points snapping to lines */}
                            <circle
                                cx={`${tooltipX}%`}
                                cy={`${yesY}%`}
                                r="3"
                                fill={yesColor}
                                className="drop-shadow-sm"
                                vectorEffect="non-scaling-stroke"
                            />
                            <circle
                                cx={`${tooltipX}%`}
                                cy={`${noY}%`}
                                r="3"
                                fill={noColor}
                                className="drop-shadow-sm"
                                vectorEffect="non-scaling-stroke"
                            />
                        </motion.g>
                    )}
                </AnimatePresence>
            </svg>

            {/* Floating DOM Tooltip (Rendered outside SVG for sharper text rendering) */}
            <AnimatePresence>
                {isScrubbing && scrubIndex !== null && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute pointer-events-none z-20"
                        style={{
                            left: `${Math.min(Math.max(tooltipX, 10), 90)}%`, // Keep tooltip within bounds
                            top: '-24px', // Float above the chart
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <div className="bg-[#1C1C1E]/90 backdrop-blur-md border border-white/10 rounded-lg px-2 py-1 shadow-lg flex items-center gap-2">
                            <span className="text-[10px] font-bold text-white tracking-wide whitespace-nowrap" style={{ color: yesColor }}>
                                YES {Math.round(currentYesVal * 100)}%
                            </span>
                            <div className="w-[1px] h-3 bg-white/10" />
                            <span className="text-[10px] font-bold text-white tracking-wide whitespace-nowrap" style={{ color: noColor }}>
                                NO {Math.round(currentNoVal * 100)}%
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
