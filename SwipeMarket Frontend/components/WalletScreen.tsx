"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_AMOUNTS = [25, 50, 100];

export default function WalletScreen() {
    const { state, dispatch } = useApp();
    const [showSheet, setShowSheet] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
    const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);
    const [selectedWithdrawAmount, setSelectedWithdrawAmount] = useState<number | null>(null);

    const handleAddFunds = () => {
        if (selectedAmount) {
            dispatch({ type: "ADD_FUNDS", amount: selectedAmount });
            dispatch({
                type: "ADD_TRANSACTION",
                transaction: {
                    id: `t${Date.now()}`,
                    type: "deposit",
                    amount: selectedAmount,
                    description: `Added $${selectedAmount}`,
                    timestamp: Date.now(),
                },
            });
            setShowSheet(false);
            setSelectedAmount(null);
        }
    };

    const handleWithdraw = () => {
        if (selectedWithdrawAmount && selectedWithdrawAmount <= state.balance) {
            dispatch({ type: "WITHDRAW_FUNDS", amount: selectedWithdrawAmount });
            dispatch({
                type: "ADD_TRANSACTION",
                transaction: {
                    id: `w${Date.now()}`,
                    type: "withdrawal",
                    amount: selectedWithdrawAmount,
                    description: `Withdrew $${selectedWithdrawAmount}`,
                    timestamp: Date.now(),
                },
            });
            setShowWithdrawSheet(false);
            setSelectedWithdrawAmount(null);
        }
    };

    const getTxInfo = (type: string) => {
        switch (type) {
            case "deposit":
                return { label: "Deposit", colorClass: "tx-deposit" };
            case "withdrawal":
                return { label: "Withdrawal", colorClass: "tx-withdrawal" };
            case "bet":
                return { label: "Bet", colorClass: "tx-bet" };
            case "winnings":
                return { label: "Winnings", colorClass: "tx-winnings" };
            default:
                return { label: "Transaction", colorClass: "text-secondary" };
        }
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex flex-col h-full pt-14 relative">
            {/* Ambient glow */}
            <div
                className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[250px] h-[150px] pointer-events-none"
                style={{
                    background: "radial-gradient(ellipse, rgba(16, 185, 129, 0.04) 0%, transparent 70%)",
                    filter: "blur(40px)",
                }}
            />

            {/* Header */}
            <div className="px-5 mb-2 relative z-10">
                <h1 className="text-xl font-bold text-primary tracking-tight">
                    Wallet
                </h1>
                <p className="text-[11px] text-secondary/50 mt-0.5 tracking-wide">
                    Manage your balance
                </p>
            </div>

            {/* Balance Hero */}
            <div className="px-5 mb-5">
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="balance-hero rounded-2xl p-6 text-center noise-overlay"
                >
                    <p className="text-[10px] text-secondary/60 uppercase tracking-[0.15em] mb-2">
                        Available Balance
                    </p>
                    <p className="text-[36px] font-bold text-primary tracking-tight tabular-nums mb-1 float-slow">
                        ${state.balance.toFixed(2)}
                    </p>
                    <p className="text-[11px] text-secondary/50 tracking-wide">
                        {state.swipeHistory.filter((s) => s.action === "buy").length} active
                        positions
                    </p>
                </motion.div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 mb-5 flex gap-3">
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowSheet(true)}
                    className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white btn-primary tracking-wide"
                >
                    Add Funds
                </motion.button>
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowWithdrawSheet(true)}
                    className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-secondary/70 btn-secondary tracking-wide"
                >
                    Withdraw
                </motion.button>
            </div>

            {/* Transaction History */}
            <div className="px-5 mb-2">
                <h2 className="text-[13px] font-semibold text-primary/80 tracking-tight">
                    Transaction History
                </h2>
            </div>
            <div className="flex-1 overflow-y-auto phone-content px-5 pb-4">
                {state.transactions.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                        <p className="text-[13px] text-secondary/50">No transactions yet</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        {state.transactions.map((tx, idx) => {
                            const info = getTxInfo(tx.type);
                            return (
                                <motion.div
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.03, ease: [0.22, 1, 0.36, 1] }}
                                    className="flex items-center justify-between card-elevated rounded-xl px-4 py-3"
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-lg stat-card flex items-center justify-center ${info.colorClass}`}
                                        >
                                            {tx.type === "deposit" && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <line x1="12" y1="5" x2="12" y2="19" />
                                                    <polyline points="19 12 12 19 5 12" />
                                                </svg>
                                            )}
                                            {tx.type === "withdrawal" && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <line x1="12" y1="19" x2="12" y2="5" />
                                                    <polyline points="5 12 12 5 19 12" />
                                                </svg>
                                            )}
                                            {tx.type === "bet" && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="8" x2="12" y2="16" />
                                                    <line x1="8" y1="12" x2="16" y2="12" />
                                                </svg>
                                            )}
                                            {tx.type === "winnings" && (
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-semibold text-primary/85">
                                                {info.label}
                                            </p>
                                            <p className="text-[10px] text-secondary/40 tracking-wide">
                                                {formatTime(tx.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`text-[13px] font-bold tabular-nums ${tx.type === "deposit" || tx.type === "winnings"
                                            ? "text-accent-green"
                                            : "text-accent-red/80"
                                            }`}
                                    >
                                        {tx.type === "deposit" || tx.type === "winnings"
                                            ? "+"
                                            : "-"}
                                        ${tx.amount.toFixed(2)}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Bottom Sheet */}
            <AnimatePresence>
                {showSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 sheet-overlay z-40"
                            onClick={() => {
                                setShowSheet(false);
                                setSelectedAmount(null);
                            }}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/[0.06] p-6 z-50 noise-overlay"
                            style={{
                                background: "linear-gradient(180deg, #1E1E22 0%, #1C1C1E 100%)",
                                boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                            }}
                        >
                            {/* Handle */}
                            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

                            <h3 className="text-[15px] font-bold text-primary mb-4 text-center tracking-tight">
                                Add Funds
                            </h3>

                            {/* Preset Amounts */}
                            <div className="flex gap-3 mb-5">
                                {PRESET_AMOUNTS.map((amt) => (
                                    <motion.button
                                        key={amt}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedAmount(amt)}
                                        className={`flex-1 py-3.5 rounded-xl text-[14px] font-bold transition-all duration-200 border ${selectedAmount === amt
                                            ? "border-accent-green bg-accent-green/10 text-accent-green shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                            : "border-white/[0.06] card-elevated-sm text-secondary/60 hover:text-primary"
                                            }`}
                                    >
                                        ${amt}
                                    </motion.button>
                                ))}
                            </div>

                            {/* Confirm */}
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleAddFunds}
                                disabled={!selectedAmount}
                                className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 tracking-wide ${selectedAmount
                                    ? "btn-primary text-white"
                                    : "card-elevated-sm text-secondary/40 cursor-not-allowed"
                                    }`}
                            >
                                {selectedAmount
                                    ? `Add $${selectedAmount}`
                                    : "Select an amount"}
                            </motion.button>

                            <div className="h-4" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Withdraw Bottom Sheet */}
            <AnimatePresence>
                {showWithdrawSheet && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 sheet-overlay z-40"
                            onClick={() => {
                                setShowWithdrawSheet(false);
                                setSelectedWithdrawAmount(null);
                            }}
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-white/[0.06] p-6 z-50 noise-overlay"
                            style={{
                                background: "linear-gradient(180deg, #1E1E22 0%, #1C1C1E 100%)",
                                boxShadow: "0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
                            }}
                        >
                            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />

                            <h3 className="text-[15px] font-bold text-primary mb-1 text-center tracking-tight">
                                Withdraw Funds
                            </h3>
                            <p className="text-[11px] text-secondary/50 text-center mb-4 tracking-wide">
                                Available: ${state.balance.toFixed(2)}
                            </p>

                            <div className="flex gap-3 mb-5">
                                {PRESET_AMOUNTS.map((amt) => {
                                    const canWithdraw = amt <= state.balance;
                                    return (
                                        <motion.button
                                            key={amt}
                                            whileTap={canWithdraw ? { scale: 0.95 } : {}}
                                            onClick={() => canWithdraw && setSelectedWithdrawAmount(amt)}
                                            disabled={!canWithdraw}
                                            className={`flex-1 py-3.5 rounded-xl text-[14px] font-bold transition-all duration-200 border ${!canWithdraw
                                                ? "border-transparent bg-white/[0.02] text-secondary/30 cursor-not-allowed"
                                                : selectedWithdrawAmount === amt
                                                    ? "border-primary bg-white/5 text-primary shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                                                    : "border-white/[0.06] card-elevated-sm text-secondary/60 hover:text-primary"
                                                }`}
                                        >
                                            ${amt}
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleWithdraw}
                                disabled={!selectedWithdrawAmount}
                                className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 tracking-wide ${selectedWithdrawAmount
                                    ? "btn-primary text-white"
                                    : "card-elevated-sm text-secondary/40 cursor-not-allowed"
                                    }`}
                            >
                                {selectedWithdrawAmount
                                    ? `Withdraw $${selectedWithdrawAmount}`
                                    : "Select an amount"}
                            </motion.button>
                            <div className="h-4" />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
