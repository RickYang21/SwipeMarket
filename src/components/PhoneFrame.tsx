"use client";

import { ReactNode } from "react";

export default function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-[#0A0A0A] gap-12">
      {/* Phone */}
      <div className="relative">
        {/* Phone outer shell */}
        <div
          className="relative w-[390px] h-[844px] rounded-[54px] border border-[#2A2A2E] bg-gradient-to-b from-[#141414] to-[#0A0A0A] overflow-hidden"
          style={{
            boxShadow:
              "0 0 60px rgba(52, 211, 153, 0.05), 0 0 120px rgba(52, 211, 153, 0.02), 0 25px 50px rgba(0,0,0,0.5)",
          }}
        >
          {/* Dynamic Island */}
          <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[126px] h-[37px] bg-black rounded-[20px] z-50" />

          {/* Screen content */}
          <div className="relative w-full h-full overflow-hidden">
            {children}
          </div>
        </div>

        {/* Breathing glow */}
        <div
          className="absolute inset-0 rounded-[54px] pointer-events-none animate-glow"
          style={{
            boxShadow: "0 0 80px rgba(52, 211, 153, 0.06)",
          }}
        />
      </div>

      {/* Floating label outside phone */}
      <div className="hidden lg:flex flex-col gap-2 max-w-[200px]">
        <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: '"SF Pro Display", "Geist", system-ui' }}>
          SwipeMarket
        </h1>
        <p className="text-[#9CA3AF] text-sm" style={{ fontFamily: '"SF Pro Text", "Geist", system-ui' }}>
          Swipe. Predict. Win.
        </p>
        <div className="mt-4 w-12 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent" />
        <p className="text-[#6B7280] text-xs mt-2 leading-relaxed">
          AI-powered prediction market discovery. Filter by what you care about. Swipe to bet.
        </p>
      </div>
    </div>
  );
}
