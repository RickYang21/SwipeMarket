"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/stores/app-store";
import { Plus, ChevronRight, Settings } from "lucide-react";
import AddFundsSheet from "./AddFundsSheet";
import WithdrawSheet from "./WithdrawSheet";

const BET_AMOUNTS = [5, 10, 25, 50];

function timeAgo(date: Date): string {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function WalletView() {
  const { wallet, betAmount, setBetAmount } = useApp();
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  const startBalance = 100;
  const pnl = wallet.balance - startBalance;

  const txnIcon = (type: string) => {
    switch (type) {
      case "deposit": return "🟢";
      case "withdrawal": return "🔴";
      case "bet": return "🎲";
      case "winnings": return "🏆";
      default: return "💰";
    }
  };

  return (
    <div className="relative h-full overflow-y-auto pt-16 pb-24 px-4 space-y-4">
      {/* Balance hero */}
      <div className="text-center py-6">
        <motion.p
          key={wallet.balance}
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          className={`text-4xl font-bold ${wallet.balance >= startBalance ? "text-white" : "text-white"}`}
          style={{ fontFamily: '"SF Pro Display", "Geist", system-ui' }}
        >
          ${wallet.balance.toFixed(2)}
        </motion.p>
        <p className="text-xs text-[#9CA3AF] mt-1">Available balance</p>
        <p className={`text-xs mt-1 ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          Started with $100.00 &bull; P&L: {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddFunds(true)}
          className="flex-1 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-semibold text-sm"
        >
          <Plus size={16} className="inline mr-1" /> Add Funds
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowWithdraw(true)}
          className="flex-1 py-3 rounded-2xl border border-white/10 bg-white/5 text-white font-semibold text-sm"
        >
          Withdraw
        </motion.button>
      </div>

      {/* Bet settings */}
      <div className="bg-[#1C1C1E] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium flex items-center gap-2"><Settings size={16} className="text-zinc-400" /> Bet Settings</span>
          <span className="text-xs text-[#9CA3AF]">
            {Math.floor(wallet.balance / betAmount)} bets remaining
          </span>
        </div>
        <div className="flex gap-2">
          {BET_AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => setBetAmount(amt)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                betAmount === amt
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-[#9CA3AF] border border-transparent"
              }`}
            >
              ${amt}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction history */}
      <div>
        <h4 className="text-sm font-medium text-[#9CA3AF] mb-3">Recent activity</h4>
        <div className="space-y-1">
          {wallet.transactions.map((txn) => (
            <div
              key={txn.id}
              className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
            >
              <span className="text-lg">{txnIcon(txn.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{txn.description}</p>
                <p className="text-[10px] text-[#6B7280]">
                  {timeAgo(txn.timestamp)}
                  {txn.status === "pending" && (
                    <span className="ml-2 text-amber-400 animate-pulse">Pending</span>
                  )}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  txn.amount >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {txn.amount >= 0 ? "+" : ""}${Math.abs(txn.amount).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Liquid Network */}
      <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold font-mono text-xs">USDC</div>
          <div>
            <p className="text-sm font-bold">Liquid Network</p>
            <p className="text-xs text-zinc-500">Crypto deposits active</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-zinc-600" />
      </div>

      {/* Bottom sheets */}
      <AnimatePresence>
        {showAddFunds && <AddFundsSheet onClose={() => setShowAddFunds(false)} />}
        {showWithdraw && <WithdrawSheet onClose={() => setShowWithdraw(false)} />}
      </AnimatePresence>
    </div>
  );
}
