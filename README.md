# PingPong Tracker

Track wins, losses, and live Elo rankings for your ping pong group. Mobile-first web app — share one URL with everyone.

## Features

- Elo-based rankings that update in real time across all devices
- Log matches in seconds — pick players, enter score, done
- Player profiles with Elo history sparkline and head-to-head records
- Streak tracking, nemesis detection, win rate stats
- Dark mode, works great on mobile

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor
3. Enable Realtime for the `matches` table in the Supabase dashboard
4. Copy your Project URL and anon key

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

Push to GitHub and connect to [Vercel](https://vercel.com). Add the two env vars in the Vercel project settings.

## Stack

- [Svelte](https://svelte.dev) + [Vite](https://vite.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com)
- [svelte-spa-router](https://github.com/ItalyPaleAle/svelte-spa-router)

