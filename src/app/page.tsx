"use client";

import { AnimatePresence } from "framer-motion";
import { AppProvider, useApp } from "@/stores/app-store";
import PhoneFrame from "@/components/PhoneFrame";
import TabBar from "@/components/TabBar";
import FilterScreen from "@/components/FilterScreen";
import SwipeScreen from "@/components/SwipeScreen";
import Dashboard from "@/components/Dashboard";
import WalletView from "@/components/Wallet";
import Toast from "@/components/Toast";

function AppContent() {
  const { activeTab, exploreView } = useApp();

  return (
    <PhoneFrame>
      <div className="relative w-full h-full bg-gradient-to-b from-[#141414] to-[#0A0A0A]">
        {/* Toast overlay */}
        <Toast />

        {/* Main content area */}
        <AnimatePresence mode="wait">
          {activeTab === "explore" && exploreView === "filter" && (
            <FilterScreen key="filter" />
          )}
          {activeTab === "explore" && exploreView === "swipe" && (
            <SwipeScreen key="swipe" />
          )}
          {activeTab === "dashboard" && <Dashboard key="dashboard" />}
          {activeTab === "wallet" && <WalletView key="wallet" />}
        </AnimatePresence>

        {/* Tab bar — hidden on filter screen */}
        {!(activeTab === "explore" && exploreView === "filter") && <TabBar />}
      </div>
    </PhoneFrame>
  );
}

export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
