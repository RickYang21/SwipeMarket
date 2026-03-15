"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const PRESET_AMOUNTS = [25, 50, 100];

type PaymentMethod = "bank" | "crypto";

const DEMO_BANK = { label: "Chase Bank", last4: "4521", sub: "Checking account" };
const DEMO_CRYPTO = { label: "Bitcoin Wallet", last4: "a3f2", sub: "BTC • bc1q...a3f2" };

function FundSheet({
    title,
    isWithdraw,
    availableBalance,
    onConfirm,
    onClose,
}: {
    title: string;
    isWithdraw?: boolean;
    availableBalance?: number;
    onConfirm: (amount: number, method: PaymentMethod) => void;
    onClose: () => void;
}) {
    const [presetAmt, setPresetAmt] = useState<number | null>(null);
    const [customAmt, setCustomAmt] = useState("");
    const [method, setMethod] = useState<PaymentMethod | null>(null);

    const resolvedAmount = customAmt !== "" ? parseFloat(customAmt) : presetAmt;
    const isValid =
        resolvedAmount != null &&
        !isNaN(resolvedAmount) &&
        resolvedAmount > 0 &&
        (!isWithdraw || resolvedAmount <= (availableBalance ?? 0)) &&
        method != null;

    const handlePreset = (amt: number) => {
        setPresetAmt(amt);
        setCustomAmt("");
    };

    const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/[^0-9.]/g, "");
        setCustomAmt(v);
        setPresetAmt(null);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 sheet-overlay z-40"
                onClick={onClose}
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
                    {title}
                </h3>
                {isWithdraw && (
                    <p className="text-[11px] text-secondary/50 text-center mb-4 tracking-wide">
                        Available: ${availableBalance?.toFixed(2)}
                    </p>
                )}
                {!isWithdraw && <div className="mb-4" />}

                {/* Amount Section */}
                <p className="text-[10px] text-secondary/40 uppercase tracking-[0.12em] mb-2">
                    Amount
                </p>

                {/* Preset chips */}
                <div className="flex gap-2 mb-3">
                    {PRESET_AMOUNTS.map((amt) => {
                        const disabled = isWithdraw && amt > (availableBalance ?? 0);
                        return (
                            <motion.button
                                key={amt}
                                whileTap={disabled ? {} : { scale: 0.95 }}
                                disabled={disabled}
                                onClick={() => !disabled && handlePreset(amt)}
                                className={`flex-1 py-3 rounded-xl text-[13px] font-bold transition-all duration-200 border ${
                                    disabled
                                        ? "border-transparent bg-white/[0.02] text-secondary/25 cursor-not-allowed"
                                        : presetAmt === amt && customAmt === ""
                                        ? isWithdraw
                                            ? "border-primary bg-white/5 text-primary shadow-[0_0_12px_rgba(255,255,255,0.1)]"
                                            : "border-accent-green bg-accent-green/10 text-accent-green shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                                        : "border-white/[0.06] card-elevated-sm text-secondary/60"
                                }`}
                            >
                                ${amt}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Custom amount input */}
                <div
                    className={`flex items-center card-elevated-sm rounded-xl px-4 py-3 mb-5 border transition-all duration-200 ${
                        customAmt !== ""
                            ? isWithdraw
                                ? "border-primary/40"
                                : "border-accent-green/40"
                            : "border-white/[0.06]"
                    }`}
                >
                    <span className="text-[14px] font-semibold text-secondary/40 mr-1">$</span>
                    <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Custom amount"
                        value={customAmt}
                        onChange={handleCustomChange}
                        className="flex-1 bg-transparent text-[14px] font-semibold text-primary placeholder-secondary/30 outline-none"
                    />
                </div>

                {/* Payment Method Section */}
                <p className="text-[10px] text-secondary/40 uppercase tracking-[0.12em] mb-2">
                    {isWithdraw ? "Send to" : "From"}
                </p>

                <div className="flex flex-col gap-2 mb-5">
                    {/* Bank option */}
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMethod("bank")}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                            method === "bank"
                                ? "border-accent-green/40 bg-accent-green/5"
                                : "border-white/[0.06] card-elevated-sm"
                        }`}
                    >
                        {/* Bank icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${method === "bank" ? "bg-accent-green/10" : "bg-white/[0.04]"}`}>
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={method === "bank" ? "#10B981" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="7" width="20" height="14" rx="2" />
                                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                            </svg>
                        </div>
                        <div className="flex-1 text-left">
                            <p className={`text-[13px] font-semibold ${method === "bank" ? "text-primary" : "text-secondary/70"}`}>
                                {DEMO_BANK.label}
                            </p>
                            <p className="text-[10px] text-secondary/40">{DEMO_BANK.sub} • ••••{DEMO_BANK.last4}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${method === "bank" ? "border-accent-green bg-accent-green" : "border-white/20"}`}>
                            {method === "bank" && (
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    </motion.button>

                    {/* Crypto option */}
                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setMethod("crypto")}
                        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border transition-all duration-200 ${
                            method === "crypto"
                                ? "border-accent-green/40 bg-accent-green/5"
                                : "border-white/[0.06] card-elevated-sm"
                        }`}
                    >
                        {/* Bitcoin icon */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${method === "crypto" ? "bg-accent-green/10" : "bg-white/[0.04]"}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={method === "crypto" ? "#10B981" : "#6B7280"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
                            </svg>
                        </div>
                        <div className="flex-1 text-left">
                            <p className={`text-[13px] font-semibold ${method === "crypto" ? "text-primary" : "text-secondary/70"}`}>
                                {DEMO_CRYPTO.label}
                            </p>
                            <p className="text-[10px] text-secondary/40">{DEMO_CRYPTO.sub}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${method === "crypto" ? "border-accent-green bg-accent-green" : "border-white/20"}`}>
                            {method === "crypto" && (
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            )}
                        </div>
                    </motion.button>
                </div>

                {/* Confirm button */}
                <motion.button
                    whileTap={isValid ? { scale: 0.97 } : {}}
                    onClick={() => isValid && onConfirm(resolvedAmount!, method!)}
                    disabled={!isValid}
                    className={`w-full py-3.5 rounded-xl text-[13px] font-semibold transition-all duration-300 tracking-wide ${
                        isValid ? "btn-primary text-white" : "card-elevated-sm text-secondary/40 cursor-not-allowed"
                    }`}
                >
                    {isValid
                        ? `${isWithdraw ? "Withdraw" : "Add"} $${Number(resolvedAmount).toFixed(2)}`
                        : resolvedAmount && resolvedAmount > 0
                        ? "Select a payment method"
                        : "Enter an amount"}
                </motion.button>
                <div className="h-4" />
            </motion.div>
        </>
    );
}

export default function WalletScreen() {
    const { state, dispatch } = useApp();
    const [showSheet, setShowSheet] = useState(false);
    const [showWithdrawSheet, setShowWithdrawSheet] = useState(false);

    const handleAddFunds = (amount: number, method: PaymentMethod) => {
        dispatch({ type: "ADD_FUNDS", amount });
        dispatch({
            type: "ADD_TRANSACTION",
            transaction: {
                id: `t${Date.now()}`,
                type: "deposit",
                amount,
                description: `Deposit via ${method === "bank" ? "Chase Bank" : "Bitcoin Wallet"}`,
                timestamp: Date.now(),
            },
        });
        setShowSheet(false);
    };

    const handleWithdraw = (amount: number, method: PaymentMethod) => {
        dispatch({ type: "WITHDRAW_FUNDS", amount });
        dispatch({
            type: "ADD_TRANSACTION",
            transaction: {
                id: `w${Date.now()}`,
                type: "withdrawal",
                amount,
                description: `Withdraw to ${method === "bank" ? "Chase Bank" : "Bitcoin Wallet"}`,
                timestamp: Date.now(),
            },
        });
        setShowWithdrawSheet(false);
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
                <h1 className="text-xl font-bold text-primary tracking-tight">Wallet</h1>
                <p className="text-[11px] text-secondary/50 mt-0.5 tracking-wide">Manage your balance</p>
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
                        {state.swipeHistory.filter((s) => (s.action === "buy" || s.action === "buy_no") && !s.sold).length} active positions
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
                <h2 className="text-[13px] font-semibold text-primary/80 tracking-tight">Transaction History</h2>
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
                                        <div className={`w-8 h-8 rounded-lg stat-card flex items-center justify-center ${info.colorClass}`}>
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
                                            <p className="text-[12px] font-semibold text-primary/85">{info.label}</p>
                                            <p className="text-[10px] text-secondary/40 tracking-wide">
                                                {tx.description} · {formatTime(tx.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[13px] font-bold tabular-nums ${tx.type === "deposit" || tx.type === "winnings" ? "text-accent-green" : "text-accent-red/80"}`}>
                                        {tx.type === "deposit" || tx.type === "winnings" ? "+" : "-"}${tx.amount.toFixed(2)}
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Funds Sheet */}
            <AnimatePresence>
                {showSheet && (
                    <FundSheet
                        title="Add Funds"
                        onConfirm={handleAddFunds}
                        onClose={() => setShowSheet(false)}
                    />
                )}
            </AnimatePresence>

            {/* Withdraw Sheet */}
            <AnimatePresence>
                {showWithdrawSheet && (
                    <FundSheet
                        title="Withdraw Funds"
                        isWithdraw
                        availableBalance={state.balance}
                        onConfirm={handleWithdraw}
                        onClose={() => setShowWithdrawSheet(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
