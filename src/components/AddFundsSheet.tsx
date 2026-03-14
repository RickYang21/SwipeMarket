"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useApp } from "@/stores/app-store";

const QUICK_AMOUNTS = [25, 50, 100, 200];

export default function AddFundsSheet({ onClose }: { onClose: () => void }) {
  const { addFunds } = useApp();
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "bank" | "crypto">("card");

  const handleConfirm = () => {
    if (amount <= 0) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
      addFunds(amount);
      setTimeout(() => {
        onClose();
      }, 1000);
    }, 500);
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="absolute bottom-0 left-0 right-0 bg-[#1C1C1E] rounded-t-3xl z-50 p-5 pb-8 border-t border-white/10"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-white">Add Funds</h3>
        <button onClick={onClose} className="text-[#9CA3AF] text-lg">✕</button>
      </div>

      {success ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center"
          >
            <span className="text-3xl">✓</span>
          </motion.div>
          <p className="text-emerald-400 font-semibold">Funds Added!</p>
        </div>
      ) : (
        <>
          {/* Quick amounts */}
          <div className="flex gap-2 mb-4">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                  amount === amt
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/5 text-[#9CA3AF] border border-transparent"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-lg">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-lg font-semibold outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Payment method */}
          <div className="flex gap-2 mb-5">
            {([
              { id: "card", icon: "💳", label: "Card" },
              { id: "bank", icon: "🏦", label: "Bank" },
              { id: "crypto", icon: "₿", label: "Crypto" },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                  payMethod === m.id
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/5 text-[#9CA3AF] border border-transparent"
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {payMethod === "card" && (
            <div className="bg-white/5 rounded-xl p-3 mb-5 text-[#6B7280] text-xs">
              •••• •••• •••• 4242 &nbsp;&nbsp; 12/28
            </div>
          )}

          {/* Confirm */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={loading || amount <= 0}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-base disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              `Add $${amount.toFixed(2)}`
            )}
          </motion.button>
        </>
      )}
    </motion.div>
  );
}
