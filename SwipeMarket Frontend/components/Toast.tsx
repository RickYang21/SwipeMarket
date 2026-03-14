"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ToastProps {
    message: string;
    type: "buy" | "skip" | "watchlist" | "error";
    onDone: () => void;
}

export default function Toast({ message, type, onDone }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onDone, 300);
        }, 1500);
        return () => clearTimeout(timer);
    }, [onDone]);

    const styleMap = {
        buy: {
            bg: "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)",
            border: "rgba(16, 185, 129, 0.2)",
            text: "text-accent-green",
            shadow: "0 4px 16px rgba(16, 185, 129, 0.15)",
        },
        skip: {
            bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.08) 100%)",
            border: "rgba(239, 68, 68, 0.2)",
            text: "text-accent-red",
            shadow: "0 4px 16px rgba(239, 68, 68, 0.15)",
        },
        watchlist: {
            bg: "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 100%)",
            border: "rgba(59, 130, 246, 0.2)",
            text: "text-accent-blue",
            shadow: "0 4px 16px rgba(59, 130, 246, 0.15)",
        },
        error: {
            bg: "linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 100%)",
            border: "rgba(239, 68, 68, 0.35)",
            text: "text-accent-red",
            shadow: "0 4px 20px rgba(239, 68, 68, 0.25)",
        },
    };

    const s = styleMap[type];

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`absolute bottom-24 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-xl text-[13px] font-semibold z-50 backdrop-blur-sm tracking-wide ${s.text}`}
                    style={{
                        background: s.bg,
                        border: `1px solid ${s.border}`,
                        boxShadow: s.shadow,
                    }}
                >
                    {message}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
