"use client";

import { useApp } from "@/stores/app-store";
import { TabType } from "@/lib/types";
import { motion } from "framer-motion";

const TABS: { id: TabType; emoji: string; label: string }[] = [
  { id: "explore", emoji: "🔥", label: "Explore" },
  { id: "dashboard", emoji: "📊", label: "Dashboard" },
  { id: "wallet", emoji: "💳", label: "Wallet" },
];

export default function TabBar() {
  const { activeTab, setActiveTab, wallet } = useApp();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div
        className="flex items-center justify-around px-6 py-2 pb-6 border-t border-white/5"
        style={{
          background: "rgba(10, 10, 10, 0.8)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {TABS.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-col items-center gap-0.5 py-1 px-4"
          >
            <span className="text-lg">{tab.emoji}</span>
            <span
              className={`text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? "text-emerald-400" : "text-[#9CA3AF]"
              }`}
            >
              {tab.label}
            </span>
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute -bottom-1 w-5 h-[2px] rounded-full bg-emerald-400"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            {/* Low balance indicator */}
            {tab.id === "wallet" && wallet.balance < 10 && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
