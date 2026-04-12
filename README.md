# PSI Ping Pong

Elo-rated ping pong tracker for the Psychological Institute, KU Leuven. Share one URL with the group — everyone sees live rankings, match history, and player stats on their phone.

## Features

**Rankings & Elo**
- Dynamic Elo rating system (K=40 provisional, K=32 standard, K=24 veteran)
- Margin-of-victory multiplier — dominate and earn more
- Per-game Elo for Best-of-N series (Bo3, Bo5, Bo7) using actual point scores
- Unplayed players shown separately — no free ranking from sitting idle

**Matches**
- Log a game in seconds — pick players, enter score, done
- Best-of-N series with game-by-game score entry
- Gamble system — loser owes bubble tea, beer, push-ups, or a custom bet
- Emoji reactions and rematch button on match cards

**Players**
- Player profiles with Elo history sparkline and head-to-head records
- Achievement badges: King, On Fire, Slump, Flawless, Dominant, Veteran
- Streak tracking and last-5 form indicators
- Paddle type, philosophy, sifu/rival relationships
- PIN-protected profile editing

**Social**
- Challenge board with scheduled dates and voting
- Per-player trash talk speech bubbles on the calendar
- Real-time sync — all connected devices update instantly

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in the SQL editor
3. Run all migration files (`migration_v2.sql` through `migration_v14.sql`) in order
4. Enable Realtime for `matches`, `players`, `challenges`, `votes`, and `reactions` tables

### 2. Environment

```bash
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
```

### 3. Run

```bash
npm install
npm run dev
```

### 4. Deploy

Push to GitHub and connect to [Vercel](https://vercel.com). Add the two env vars in Vercel project settings.

## Stack

- [Svelte](https://svelte.dev) + [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (Postgres + Realtime)
- [svelte-spa-router](https://github.com/ItalyPaleAle/svelte-spa-router)
