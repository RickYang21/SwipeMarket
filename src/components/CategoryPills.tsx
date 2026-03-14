"use client";

import { useApp } from "@/stores/app-store";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { motion } from "framer-motion";

export default function CategoryPills() {
  const { selectedCategories, toggleCategory } = useApp();

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar px-1">
      {selectedCategories.map((cat) => {
        const config = CATEGORY_CONFIG[cat];
        const isCrypto = cat === "crypto";
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleCategory(cat)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 ${
              isCrypto
                ? "bg-amber-500/15 border border-amber-500/30 text-amber-400"
                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
            }`}
          >
            {config?.emoji} {config?.label}
            <span className={`ml-0.5 ${isCrypto ? "text-amber-400/50" : "text-emerald-400/50"}`}>×</span>
          </motion.button>
        );
      })}
    </div>
  );
}
