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
  marketYesPrice,
}: {
  analysis: MarketAnalysis;
  compact?: boolean;
  marketYesPrice?: number;
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

  const aiProb = analysis.ai_probability;
  const marketProb = marketYesPrice !== undefined ? Math.round(marketYesPrice * 100) : null;
  const hasSources = analysis.sources && analysis.sources.length > 0;
  const hasAiProb = aiProb !== undefined && aiProb !== null;

  // Determine the diff direction
  const probDiff = hasAiProb && marketProb !== null ? aiProb - marketProb : 0;
  const diffColor = probDiff > 0 ? "text-emerald-400" : probDiff < 0 ? "text-red-400" : "text-[#9CA3AF]";
  const diffSign = probDiff > 0 ? "+" : "";

  return (
    <div className="bg-[#1A1A2E] rounded-xl p-3 space-y-2">
      {/* Verdict + Risk row */}
      <div className="flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${verdict.bg} ${verdict.text}`}
        >
          {verdict.icon} {analysis.verdict}
        </span>
        <div className="flex items-center gap-2">
          {hasSources && (
            <span className="text-[10px] text-blue-400 flex items-center gap-0.5">
              📰 {analysis.sources!.length} sources
            </span>
          )}
          <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
            {risk.icon} {risk.label}
          </span>
        </div>
      </div>

      {/* AI vs Market probability comparison */}
      {hasAiProb && marketProb !== null && (
        <div className="bg-black/30 rounded-lg p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-[#9CA3AF]">AI vs Market</span>
            <span className={`font-bold ${diffColor}`}>
              {diffSign}{probDiff}% edge
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* AI estimate */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-amber-400 font-semibold">🧠 AI: {aiProb}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                  style={{ width: `${aiProb}%` }}
                />
              </div>
            </div>
            {/* Market estimate */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[9px] text-[#9CA3AF] font-semibold">📊 Mkt: {marketProb}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#6B7280] to-[#4B5563]"
                  style={{ width: `${marketProb}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confidence bar (only when no AI probability) */}
      {!hasAiProb && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all"
              style={{ width: `${analysis.confidence}%` }}
            />
          </div>
          <span className="text-[10px] text-amber-400 font-semibold">{analysis.confidence}%</span>
        </div>
      )}

      {/* Reasoning */}
      <p className="text-xs text-[#D1D5DB] leading-relaxed">{analysis.reasoning}</p>

      {/* Edge */}
      <p className="text-[11px] text-amber-400/80 italic">Edge: {analysis.edge}</p>

      {/* Sources */}
      {hasSources && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {analysis.sources!.slice(0, 3).map((s, i) => (
            <a
              key={i}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/10 hover:bg-blue-500/20 rounded text-[9px] text-blue-400 truncate max-w-[150px] transition-colors"
              title={s.title}
            >
              🔗 {s.title.length > 25 ? s.title.slice(0, 25) + "…" : s.title}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
