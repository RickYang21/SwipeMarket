"use client";

import { MarketAnalysis } from "@/lib/types";

const VERDICT_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  "STRONG BUY": { bg: "bg-emerald-500/20", text: "text-emerald-400", icon: "🟢" },
  BUY: { bg: "bg-emerald-500/15", text: "text-emerald-400", icon: "🟢" },
  "LEAN BUY": { bg: "bg-yellow-500/15", text: "text-yellow-400", icon: "🟡" },
  SKIP: { bg: "bg-red-500/15", text: "text-red-400", icon: "🔴" },
};

const RISK_STYLES: Record<string, { label: string; icon: string }> = {
  low: { label: "Low Risk", icon: "✅" },
  medium: { label: "Med Risk", icon: "⚠️" },
  high: { label: "High Risk", icon: "⚡" },
};

export default function AIRecommendation({
  analysis,
  compact = false,
}: {
  analysis: MarketAnalysis;
  compact?: boolean;
}) {
  const verdict = VERDICT_STYLES[analysis.verdict] || VERDICT_STYLES.SKIP;
  const risk = RISK_STYLES[analysis.risk_level] || RISK_STYLES.medium;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${verdict.bg} ${verdict.text}`}>
        {verdict.icon} {analysis.verdict}
      </span>
    );
  }

  return (
    <div className="bg-[#1A1A2E] rounded-xl p-3 space-y-2">
      {/* Verdict + Risk row */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${verdict.bg} ${verdict.text}`}
        >
          {verdict.icon} {analysis.verdict}
        </span>
        <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
          {risk.icon} {risk.label}
        </span>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
            style={{ width: `${analysis.confidence}%` }}
          />
        </div>
        <span className="text-[10px] text-amber-400 font-semibold">{analysis.confidence}%</span>
      </div>

      {/* Reasoning */}
      <p className="text-xs text-[#D1D5DB] leading-relaxed">{analysis.reasoning}</p>

      {/* Edge */}
      <p className="text-[11px] text-amber-400/80 italic">Edge: {analysis.edge}</p>
    </div>
  );
}
