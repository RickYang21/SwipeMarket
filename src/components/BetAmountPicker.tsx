"use client";

import { useState } from "react";
import { useApp } from "@/stores/app-store";
import { motion, AnimatePresence } from "framer-motion";

const AMOUNTS = [5, 10, 25, 50];

export default function BetAmountPicker() {
  const { betAmount, setBetAmount } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[11px] text-[#9CA3AF] hover:text-white transition-colors"
      >
        Betting <span className="text-emerald-400 font-semibold">${betAmount}</span> per swipe ▾
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 bg-[#1C1C1E] rounded-full px-2 py-1.5 border border-white/10 z-50"
          >
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  setBetAmount(amt);
                  setOpen(false);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  betAmount === amt
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "text-[#9CA3AF] hover:text-white"
                }`}
              >
                ${amt}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
