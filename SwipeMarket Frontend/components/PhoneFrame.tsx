"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

interface PhoneFrameProps {
    children: React.ReactNode;
}

export default function PhoneFrame({ children }: PhoneFrameProps) {
    const { state, dispatch } = useApp();
    const showTabBar = state.currentScreen !== "filter";

    const tabs: { id: "explore" | "dashboard" | "wallet"; label: string }[] = [
        { id: "explore", label: "Explore" },
        { id: "dashboard", label: "Dashboard" },
        { id: "wallet", label: "Wallet" },
    ];

    return (
        <div
            className="relative w-[390px] h-[844px] overflow-hidden flex flex-col noise-overlay"
            style={{
                borderRadius: "54px",
                background: "linear-gradient(180deg, #0C0C0C 0%, #111111 30%, #141414 100%)",
                boxShadow: `
          0 0 0 1px rgba(255,255,255,0.06),
          0 0 0 2px #1A1A1E,
          0 0 80px rgba(0,0,0,0.8),
          inset 0 1px 0 rgba(255,255,255,0.04)
        `,
            }}
        >
            {/* Subtle top ambient light */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[120px] pointer-events-none z-0"
                style={{
                    background: "radial-gradient(ellipse, rgba(255,255,255,0.02) 0%, transparent 70%)",
                }}
            />

            {/* Status Bar */}
            <div className="relative flex items-center justify-between px-8 pt-3 pb-1 z-20">
                <span className="text-xs font-semibold text-primary/80">9:41</span>
                <div className="flex items-center gap-1.5">
                    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                        <rect x="0" y="6" width="3" height="6" rx="1" fill="#FAFAFA" fillOpacity="0.8" />
                        <rect x="4.5" y="4" width="3" height="8" rx="1" fill="#FAFAFA" fillOpacity="0.8" />
                        <rect x="9" y="1.5" width="3" height="10.5" rx="1" fill="#FAFAFA" fillOpacity="0.8" />
                        <rect x="13.5" y="0" width="3" height="12" rx="1" fill="#FAFAFA" fillOpacity="0.25" />
                    </svg>
                    <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
                        <path d="M7.5 3.5C9.3 3.5 10.9 4.2 12 5.3L13.4 3.9C11.9 2.4 9.8 1.5 7.5 1.5C5.2 1.5 3.1 2.4 1.6 3.9L3 5.3C4.1 4.2 5.7 3.5 7.5 3.5Z" fill="#FAFAFA" fillOpacity="0.8" />
                        <path d="M7.5 6.5C8.6 6.5 9.6 6.9 10.3 7.6L11.7 6.2C10.6 5.2 9.1 4.5 7.5 4.5C5.9 4.5 4.4 5.2 3.3 6.2L4.7 7.6C5.4 6.9 6.4 6.5 7.5 6.5Z" fill="#FAFAFA" fillOpacity="0.8" />
                        <circle cx="7.5" cy="9.5" r="1.5" fill="#FAFAFA" fillOpacity="0.8" />
                    </svg>
                    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
                        <rect x="0" y="1" width="21" height="10" rx="2" stroke="#FAFAFA" strokeOpacity="0.25" />
                        <rect x="1.5" y="2.5" width="14" height="7" rx="1" fill="#FAFAFA" fillOpacity="0.8" />
                        <rect x="22" y="4" width="2.5" height="4" rx="1" fill="#FAFAFA" fillOpacity="0.25" />
                    </svg>
                </div>
            </div>

            {/* Dynamic Island */}
            <div
                className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] rounded-[20px] z-30"
                style={{
                    background: "#000",
                    boxShadow: "0 0 0 1px rgba(255,255,255,0.05), inset 0 0 8px rgba(0,0,0,0.8)",
                }}
            />

            {/* Content Area */}
            <div className="phone-content flex-1 overflow-y-auto overflow-x-hidden relative z-10">
                {children}
            </div>

            {/* Bottom Tab Bar */}
            {showTabBar && (
                <div className="frosted-glass border-t border-white/[0.04] px-4 py-2 pb-6 z-20">
                    <div className="flex items-center justify-around">
                        {tabs.map((tab) => {
                            const isActive = state.currentScreen === tab.id;
                            return (
                                <motion.button
                                    key={tab.id}
                                    onClick={() => dispatch({ type: "SET_SCREEN", screen: tab.id })}
                                    whileTap={{ scale: 0.92 }}
                                    className={`flex flex-col items-center gap-1 py-1 px-4 rounded-lg transition-all duration-300 ${isActive ? "text-accent-green" : "text-secondary/60 hover:text-secondary"
                                        }`}
                                >
                                    {tab.id === "explore" && (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88" />
                                        </svg>
                                    )}
                                    {tab.id === "dashboard" && (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="7" height="7" rx="1.5" />
                                            <rect x="14" y="3" width="7" height="7" rx="1.5" />
                                            <rect x="3" y="14" width="7" height="7" rx="1.5" />
                                            <rect x="14" y="14" width="7" height="7" rx="1.5" />
                                        </svg>
                                    )}
                                    {tab.id === "wallet" && (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="2" y="6" width="20" height="14" rx="2.5" />
                                            <path d="M2 10h20" />
                                            <circle cx="17" cy="14" r="1.5" />
                                        </svg>
                                    )}
                                    <span className="text-[10px] font-medium tracking-wide">
                                        {tab.label}
                                    </span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="tab-indicator"
                                            className="w-4 h-[2px] rounded-full bg-accent-green mt-0.5"
                                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        />
                                    )}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
