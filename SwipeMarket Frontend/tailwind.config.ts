import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#141414",
          card: "#1C1C1E",
          elevated: "#1A1A2E",
        },
        accent: {
          green: "#10B981",
          red: "#EF4444",
          gold: "#F59E0B",
          blue: "#3B82F6",
        },
        titanium: "#2A2A2E",
        primary: "#FAFAFA",
        secondary: "#9CA3AF",
      },
      fontFamily: {
        sans: [
          "SF Pro Display",
          "Geist",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      borderRadius: {
        phone: "54px",
      },
    },
  },
  plugins: [],
};
export default config;
