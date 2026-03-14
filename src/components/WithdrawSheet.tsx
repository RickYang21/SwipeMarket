"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/stores/app-store";

export default function WithdrawSheet({ onClose }: { onClose: () => void }) {
  const { wallet, withdrawFunds } = useApp();
  const [amount, setAmount] = useState(25);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [dest, setDest] = useState<"bank" | "crypto">("bank");

  const isValid = amount >= 5 && amount <= wallet.balance;

  const handleConfirm = () => {
    if (!isValid) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const ok = withdrawFunds(amount);
      if (ok) {
        setSuccess(true);
        setTimeout(() => onClose(), 1000);
      }
    }, 500);
  };

  const quickAmounts = [25, 50, 100];

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 bg-[#1C1C1E] rounded-t-3xl z-50 p-5 pb-8 border-t border-white/10"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-bold text-white">Withdraw Funds</h3>
        <button onClick={onClose} className="text-[#9CA3AF] text-lg">✕</button>
      </div>

      <p className="text-xs text-[#9CA3AF] mb-4">
        Available: <span className="text-white">${wallet.balance.toFixed(2)}</span>
      </p>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <span className="text-3xl">✓</span>
          </motion.div>
          <p className="text-emerald-400 font-semibold">Withdrawal Initiated!</p>
        </div>
      ) : (
        <>
          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(Math.min(amt, wallet.balance))}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  amount === amt
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-[#9CA3AF] border border-transparent"
                }`}
              >
                ${amt}
              </button>
            ))}
            <button
              onClick={() => setAmount(wallet.balance)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                amount === wallet.balance
                  ? "bg-white/10 text-white border border-white/20"
                  : "bg-white/5 text-[#9CA3AF] border border-transparent"
              }`}
            >
              Max
            </button>
          </div>

          {/* Custom amount */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-lg font-semibold outline-none focus:border-white/30"
            />
          </div>

          {/* Destination */}
          <div className="space-y-2 mb-5">
            <button
              onClick={() => setDest("bank")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                dest === "bank" ? "bg-white/10 border border-white/20" : "bg-white/5 border border-transparent"
              }`}
            >
              <span>🏦</span>
              <span className="text-sm text-white">Bank Account •••• 7890</span>
            </button>
            <button
              onClick={() => setDest("crypto")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                dest === "crypto" ? "bg-white/10 border border-white/20" : "bg-white/5 border border-transparent"
              }`}
            >
              <span>₿</span>
              <span className="text-sm text-white">Crypto Wallet 0x3f...a1c2</span>
            </button>
          </div>

          {/* Validation msg */}
          {amount > wallet.balance && (
            <p className="text-xs text-red-400 mb-2">Insufficient funds</p>
          )}
          {amount > 0 && amount < 5 && (
            <p className="text-xs text-red-400 mb-2">Minimum withdrawal: $5</p>
          )}

          {/* Confirm */}
          <motion.button
            whileTap={isValid ? { scale: 0.97 } : {}}
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base disabled:opacity-40"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Withdraw $${amount.toFixed(2)}`
            )}
          </motion.button>
        </>
      )}
    </motion.div>
  );
}
