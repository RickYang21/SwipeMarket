import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwipeMarket — Swipe. Predict. Win.",
  description: "Tinder for prediction markets. Swipe to discover, filter by what you care about, get AI-powered buy signals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
