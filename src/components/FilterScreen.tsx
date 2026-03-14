"use client";

import { useApp } from "@/stores/app-store";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";

const FILTER_KEYS = Object.keys(CATEGORY_CONFIG).filter((k) => k !== "crypto");

export default function FilterScreen() {
  const { selectedCategories, toggleCategory, setExploreView } = useApp();

  const isCryptoSelected = selectedCategories.includes("crypto");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col h-full pt-16 px-5 pb-6"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <h1
          className="text-[22px] font-bold text-white"
          style={{ fontFamily: '"SF Pro Display", "Geist", system-ui' }}
        >
          What are you betting on?
        </h1>
        <p className="text-[#9CA3AF] text-sm mt-1">Pick your markets, start swiping</p>
      </div>

      {/* Filter grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-wrap gap-3 justify-center">
          {/* Crypto chip - special styling */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => toggleCategory("crypto")}
            className={`relative flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
              isCryptoSelected
                ? "bg-amber-500/15 border-amber-500/60 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                : "bg-[#1C1C1E] border-[#2A2A2E] text-[#9CA3AF] hover:border-[#3A3A3E]"
            } border`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">💰</span>
              <span>Crypto</span>
              {isCryptoSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-1.5 h-1.5 rounded-full bg-amber-400"
                />
              )}
            </div>
            <span className={`text-[10px] ${isCryptoSelected ? "text-amber-500/60" : "text-[#6B7280]"}`}>
              Powered by Liquid
            </span>
          </motion.button>

          {/* Regular category chips */}
          {FILTER_KEYS.map((key) => {
            const config = CATEGORY_CONFIG[key];
            const isSelected = selectedCategories.includes(key);
            return (
              <motion.button
                key={key}
                whileTap={{ scale: 0.92 }}
                onClick={() => toggleCategory(key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-emerald-500/15 border-emerald-500/60 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                    : "bg-[#1C1C1E] border-[#2A2A2E] text-[#9CA3AF] hover:border-[#3A3A3E]"
                } border`}
              >
                <span className="text-base">{config.emoji}</span>
                <span>{config.label}</span>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Start Swiping button */}
      <div className="mt-4">
        <AnimatePresence>
          <motion.button
            whileTap={selectedCategories.length > 0 ? { scale: 0.97 } : {}}
            onClick={() => {
              if (selectedCategories.length > 0) setExploreView("swipe");
            }}
            disabled={selectedCategories.length === 0}
            className={`w-full py-4 rounded-2xl text-base font-semibold transition-all duration-300 ${
              selectedCategories.length > 0
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_30px_rgba(52,211,153,0.2)]"
                : "bg-[#1C1C1E] text-[#6B7280] cursor-not-allowed"
            }`}
          >
            {selectedCategories.length > 0
              ? `Start Swiping (${selectedCategories.length} ${selectedCategories.length === 1 ? "category" : "categories"})`
              : "Select categories to start"}
          </motion.button>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
