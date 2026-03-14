"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { motion } from "framer-motion";

const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG);

export default function FilterScreen() {
    const { state, dispatch } = useApp();
    const selected = state.selectedCategories;

    const toggleCategory = (cat: string) => {
        const newSelected = selected.includes(cat)
            ? selected.filter((c) => c !== cat)
            : [...selected, cat];
        dispatch({ type: "SET_CATEGORIES", categories: newSelected });
    };

    const handleStart = () => {
        if (selected.length > 0) {
            dispatch({ type: "SET_SCREEN", screen: "explore" });
        }
    };

    return (
        <div className="flex flex-col h-full px-5 pt-16 pb-8 relative">
            {/* Ambient background glow */}
            <div
                className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[300px] h-[200px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse, rgba(16, 185, 129, 0.04) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="text-center mb-8 relative z-10"
            >
                <h1 className="text-[24px] font-bold text-primary leading-tight tracking-tight shimmer-text">
                    What are you betting on?
                </h1>
                <p className="text-[13px] text-secondary/70 mt-2.5 font-light tracking-wide">
                    Select categories to discover markets
                </p>
            </motion.div>

            {/* Category Grid */}
            <div className="flex flex-wrap gap-2.5 justify-center flex-1 content-start relative z-10">
                {CATEGORY_KEYS.map((key, i) => {
                    const isSelected = selected.includes(key);
                    const config = CATEGORY_CONFIG[key];
                    return (
                        <motion.button
                            key={key}
                            initial={{ opacity: 0, scale: 0.85, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{
                                duration: 0.4,
                                delay: i * 0.04,
                                ease: [0.22, 1, 0.36, 1],
                            }}
                            whileTap={{ scale: 0.93 }}
                            whileHover={{ y: -1 }}
                            onClick={() => toggleCategory(key)}
                            className={`px-4 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 border ${isSelected
                                ? "pill-selected border-accent-green text-primary"
                                : "card-elevated-sm border-white/[0.04] text-secondary/80 hover:text-primary hover:border-white/[0.08]"
                                }`}
                        >
                            {config.label}
                        </motion.button>
                    );
                })}
            </div>

            {/* Start Button */}
            <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                whileTap={{ scale: 0.97 }}
                onClick={handleStart}
                disabled={selected.length === 0}
                className={`w-full py-4 rounded-2xl text-[15px] font-semibold transition-all duration-300 mt-6 relative z-10 ${selected.length > 0
                    ? "btn-primary text-white"
                    : "card-elevated-sm text-secondary/50 cursor-not-allowed"
                    }`}
            >
                {selected.length > 0
                    ? `Start Swiping (${selected.length})`
                    : "Start Swiping"}
            </motion.button>
        </div>
    );
}
