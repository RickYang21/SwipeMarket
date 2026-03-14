"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Market, MarketAnalysis, SwipeRecord, Wallet, TabType, ExploreView } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface AppState {
  // Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  exploreView: ExploreView;
  setExploreView: (view: ExploreView) => void;

  // Filters
  selectedCategories: string[];
  toggleCategory: (cat: string) => void;

  // Swipe history
  swipeHistory: SwipeRecord[];
  addSwipe: (market: Market, analysis: MarketAnalysis, action: "buy" | "skip" | "watchlist") => void;

  // Wallet
  wallet: Wallet;
  betAmount: number;
  setBetAmount: (amount: number) => void;
  addFunds: (amount: number) => void;
  withdrawFunds: (amount: number) => boolean;
  placeBet: (market: Market) => boolean;

  // Toast
  toast: { message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [exploreView, setExploreView] = useState<ExploreView>("filter");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<SwipeRecord[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [toast, setToast] = useState<AppState["toast"]>(null);

  const [wallet, setWallet] = useState<Wallet>({
    balance: 100,
    transactions: [
      {
        id: uuidv4(),
        type: "deposit",
        amount: 100,
        description: "Welcome bonus",
        timestamp: new Date(),
        status: "completed",
      },
    ],
  });

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  const addFunds = useCallback((amount: number) => {
    setWallet((prev) => ({
      balance: prev.balance + amount,
      transactions: [
        {
          id: uuidv4(),
          type: "deposit",
          amount,
          description: "Added funds",
          timestamp: new Date(),
          status: "completed",
        },
        ...prev.transactions,
      ],
    }));
    showToast(`💰 $${amount.toFixed(2)} added to wallet`, "success");
  }, [showToast]);

  const withdrawFunds = useCallback((amount: number): boolean => {
    if (amount > wallet.balance) return false;
    setWallet((prev) => ({
      balance: prev.balance - amount,
      transactions: [
        {
          id: uuidv4(),
          type: "withdrawal",
          amount: -amount,
          description: "Withdrew to bank",
          timestamp: new Date(),
          status: "pending",
        },
        ...prev.transactions,
      ],
    }));
    // Auto-complete pending withdrawal after 60s
    setTimeout(() => {
      setWallet((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.status === "pending" && t.type === "withdrawal"
            ? { ...t, status: "completed" }
            : t
        ),
      }));
    }, 60000);
    showToast(`💸 Withdrawal of $${amount.toFixed(2)} initiated`, "info");
    return true;
  }, [wallet.balance, showToast]);

  const placeBet = useCallback((market: Market): boolean => {
    if (wallet.balance < betAmount) return false;
    setWallet((prev) => ({
      balance: prev.balance - betAmount,
      transactions: [
        {
          id: uuidv4(),
          type: "bet",
          amount: -betAmount,
          description: `Bet on: ${market.question.slice(0, 50)}`,
          timestamp: new Date(),
          status: "completed",
        },
        ...prev.transactions,
      ],
    }));
    return true;
  }, [wallet.balance, betAmount]);

  const addSwipe = useCallback(
    (market: Market, analysis: MarketAnalysis, action: "buy" | "skip" | "watchlist") => {
      const record: SwipeRecord = {
        id: uuidv4(),
        market,
        analysis,
        action,
        bet_amount: action === "buy" ? betAmount : 0,
        timestamp: new Date(),
        price_at_swipe: {
          yes: market.yes_price,
          no: market.no_price,
        },
      };
      setSwipeHistory((prev) => [record, ...prev]);
    },
    [betAmount]
  );

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        exploreView,
        setExploreView,
        selectedCategories,
        toggleCategory,
        swipeHistory,
        addSwipe,
        wallet,
        betAmount,
        setBetAmount,
        addFunds,
        withdrawFunds,
        placeBet,
        toast,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
