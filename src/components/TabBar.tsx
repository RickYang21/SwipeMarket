"use client";

import { useApp } from "@/stores/app-store";
import { TabType } from "@/lib/types";
import { motion } from "framer-motion";
import { Home, Activity, Wallet } from "lucide-react";

const TABS: { id: TabType; icon: React.ReactNode; label: string }[] = [
  { id: "explore", icon: <Home size={20} />, label: "Explore" },
  { id: "dashboard", icon: <Activity size={20} />, label: "Dashboard" },
  { id: "wallet", icon: <Wallet size={20} />, label: "Wallet" },
];

export default function TabBar() {
  const { activeTab, setActiveTab, wallet } = useApp();

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40">
      <div
        className="flex items-center justify-around px-6 py-2 pb-6 border-t border-zinc-800/50"
        style={{
          background: "rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {TABS.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            whileTap={{ scale: 0.9 }}
            className="relative flex flex-col items-center gap-1 py-1 px-4 min-w-[64px] group mt-1"
          >
            <div className={`transition-all duration-200 ${
              activeTab === tab.id ? "text-emerald-400 scale-110" : "text-zinc-500 group-hover:text-zinc-300"
            }`}>
              {tab.icon}
            </div>
            <span
              className={`text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? "text-emerald-400" : "text-zinc-500"
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
            {tab.id === "wallet" && wallet.balance < 10 && (
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
