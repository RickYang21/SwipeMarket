"use client";

import PhoneFrame from "@/components/PhoneFrame";
import FilterScreen from "@/components/FilterScreen";
import SwipeScreen from "@/components/SwipeScreen";
import DashboardScreen from "@/components/DashboardScreen";
import WalletScreen from "@/components/WalletScreen";
import { useApp } from "@/context/AppContext";

function AppContent() {
  const { state } = useApp();

  const renderScreen = () => {
    switch (state.currentScreen) {
      case "filter":
        return <FilterScreen />;
      case "explore":
        return <SwipeScreen />;
      case "dashboard":
        return <DashboardScreen />;
      case "wallet":
        return <WalletScreen />;
      default:
        return <FilterScreen />;
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center"
      style={{ background: "#0A0A0A" }}
    >
      <PhoneFrame>{renderScreen()}</PhoneFrame>
    </main>
  );
}

export default function Home() {
  return <AppContent />;
}
