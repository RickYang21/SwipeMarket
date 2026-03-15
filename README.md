# SwipeMarket

**Tinder for prediction markets** — swipe to discover, filter by what you care about, get AI-powered buy signals, track your portfolio.

## How it works

1. **Filter** — Pick your markets: NBA, UFC, Politics, and more
2. **Swipe** — Swipe right to buy, left to buy the other/short, down to watchlist, up to skip. Each card shows full market data + an AI recommendation.
3. **Track** — Dashboard with full portfolio overview, P&L tracking, and swipe history

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** (dark luxury theme)
- **Framer Motion** (swipe gestures + animations)
- **Polymarket CLOB API** (gamma-api.polymarket.com)
- **Anthropic API** (Claude claude-sonnet-4-20250514 for AI analysis)
- **Liquid SDK/API** (Crypto and live updates)

## Getting started

```bash
npm install
cp .env.example .env.local   # Add your ANTHROPIC_API_KEY (optional) and LIQUID_API_KEY and LIQUID_API_SECRET
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start swiping.

The app works fully without an API key — AI analysis falls back to smart mock data.

## Hackathon tracks

- **Polymarket Prediction Markets Track** ($2k) — core app
- **Liquid Trading Interfaces Track** ($4k/$2k) — crypto category (stretch goal)

## Features

- Realistic iPhone 15 Pro frame shell
- Category filter screen with 13+ sports, politics, and event categories
- Full Polymarket market data on each card (odds, volume, liquidity)
- AI-powered BUY/SKIP recommendation with confidence scores
- Swipe physics with spring animations, stamps, and edge glows
- Dashboard with portfolio stats, donut chart, and expandable history cards
- Wallet with add funds, withdraw, and transaction history
- P&L tracking tied to real bet amounts

## Deploy

Configured for Vercel deployment. Just connect your repo and deploy.

---

Built for the hackathon by the SwipeMarket team.
