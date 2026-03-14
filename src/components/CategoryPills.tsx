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
        return (
          <motion.button
            key={cat}
            whileTap={{ scale: 0.9 }}
            onClick={() => toggleCategory(cat)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400 font-medium whitespace-nowrap flex-shrink-0"
          >
            {config?.emoji} {config?.label}
            <span className="text-emerald-400/50 ml-0.5">×</span>
          </motion.button>
        );
      })}
    </div>
  );
}
