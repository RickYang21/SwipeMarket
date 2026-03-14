"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/stores/app-store";

export default function Toast() {
  const { toast } = useApp();

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-14 left-4 right-4 z-50"
        >
          <div
            className={`px-4 py-2.5 rounded-xl text-sm font-medium text-center backdrop-blur-xl ${
              toast.type === "success"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20"
                : toast.type === "error"
                ? "bg-red-500/20 text-red-400 border border-red-500/20"
                : "bg-blue-500/20 text-blue-400 border border-blue-500/20"
            }`}
          >
            {toast.message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
