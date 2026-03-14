"use client";

import { motion } from "framer-motion";

interface ActionButtonsProps {
  onSkip: () => void;
  onWatchlist: () => void;
  onBuy: () => void;
}

export default function ActionButtons({ onSkip, onWatchlist, onBuy }: ActionButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-3">
      {/* Skip */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onSkip}
        className="w-14 h-14 rounded-full border-2 border-red-500/40 flex items-center justify-center bg-red-500/10 active:bg-red-500/20 transition-colors"
      >
        <span className="text-2xl">❌</span>
      </motion.button>

      {/* Watchlist */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onWatchlist}
        className="w-11 h-11 rounded-full border-2 border-blue-500/40 flex items-center justify-center bg-blue-500/10 active:bg-blue-500/20 transition-colors"
      >
        <span className="text-lg">🔖</span>
      </motion.button>

      {/* Buy */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={onBuy}
        className="w-14 h-14 rounded-full border-2 border-emerald-500/40 flex items-center justify-center bg-emerald-500/10 active:bg-emerald-500/20 transition-colors"
      >
        <span className="text-2xl">✅</span>
      </motion.button>
    </div>
  );
}
