# Multi-Game Stat Tracker: Project Plan and Context

Hand this file to Claude Code at the start of a new chat so it has the full context. Written 2026-11-23.

## 1. About me and how to work with me

- I am a **beginner at building web apps**. Explain what you're doing and why, in plain language, as you go.
- Work in **small steps**. After each step, tell me how to run it and what I should see so I can check it works before moving on.
- Prefer simple, readable code over clever code. Add short comments where a beginner would be confused.
- Before installing a big dependency or making a major structural decision, tell me the tradeoff and ask.
- Never put API keys in code or commit them. Use `.env.local` and keep it in `.gitignore`.

## 2. Project goal

A web app that combines stats from several competitive PvP games and a couple of non-game services into one dashboard.

**Target sources (in priority order):**
1. Deadlock
2. YouTube
3. League of Legends
4. Spotify
5. Overwatch
6. Valorant (hard, later)
7. Rainbow Six Siege (hard, last)

**Audience:** a portfolio piece to show employers, and something my friends can use. It will not be advertised, so traffic will be tiny. The app must look and work well for someone who lands on it **without logging in**.

## 3. Tech decisions (already made)

- **Framework: Next.js** (App Router, TypeScript). Chosen because it has frontend and backend in one project, so server code can call game APIs and keep secrets hidden. It also has a large beginner ecosystem, free hosting on Vercel, and built-in fetch caching.
- Styling: Tailwind CSS (or whatever Next.js's setup offers by default).
- Hosting: Vercel (free hobby tier).
- Database: **not yet.** Add later (Supabase or Vercel Postgres) only if I want accounts or saved history.
- Alternative considered: SvelteKit (gentler syntax, smaller community). Sticking with Next.js unless I say otherwise.

## 4. Key architecture ideas

### 4.1 One adapter per data source
Each game or service gets its own small "adapter" module that calls that source's API and converts the response into a **common internal data shape**. The UI only ever sees the common shape. When an API breaks or changes, only one adapter needs to be rewritten.

Suggested folder layout (adjust as sensible):

```
src/
  app/                  # pages and API routes
  adapters/
    types.ts            # shared types (see 4.2)
    deadlock.ts
    youtube.ts
    league.ts
    spotify.ts
    overwatch.ts
  demo/
    sampleData.ts       # realistic fake data for demo mode
  components/
```

### 4.2 Common data shape (starting point, refine as needed)

```ts
type Source = "deadlock" | "youtube" | "league" | "spotify" | "overwatch" | "valorant" | "r6";

interface Stat {
  label: string;            // e.g. "Win rate"
  value: number | string;   // e.g. 56.3
  unit?: string;            // e.g. "%"
}

interface PlayerSummary {
  source: Source;
  displayName: string;
  fetchedAt: string;        // ISO timestamp
  stats: Stat[];            // headline numbers
  recent?: RecentItem[];    // recent matches / videos / tracks
  isDemo: boolean;
}

interface Adapter {
  source: Source;
  getSummary(id: string): Promise<PlayerSummary>;
}
```

### 4.3 Demo mode is a core feature
Many of these APIs restrict public access (see section 5). So the app must have a **"View demo" mode** with realistic sample data for every source, so an employer can see the whole app with no login. Live data is layered on top for me and a few friends. Build demo mode FIRST.

### 4.4 Server-side calls and caching
All API calls happen on the server (API routes or server components) so keys stay hidden. Cache responses for a few minutes to respect rate limits and quotas.

## 5. API research findings (as of 2026-11-23, verify before relying on them)

APIs and policies change often. Re-check the linked docs when implementing each adapter.

### Deadlock (easiest)
- Community-run, free, open API: https://api.deadlock-api.com (interactive docs at `/docs`). Covers match history, player stats, hero and item analytics, leaderboards.
- It is **not** an official Valve API, so it is a dependency I don't control.
- Players are identified by Steam account ID. Check the docs for exact endpoints.

### YouTube
- YouTube Data API v3 (public video and channel stats, API key) plus the Analytics API (own-channel metrics, needs OAuth).
- Default quota: **10,000 units per day**. `search.list` costs **100 units** (expensive). `videos.list` and `channels.list` cost **1 unit**. So: look things up by ID, avoid search where possible, and cache aggressively.
- A batch video-stats method (`videos.batchGetStats`) was added in Nov 2026.
- Setup: Google Cloud Console, create a project, enable YouTube Data API v3, create an API key.

### League of Legends
- Riot developer portal: https://developer.riotgames.com
- A **personal key** is allowed for small personal projects, such as viewing your own match history and aggregate stats.
- If the product serves other players, it must be **registered** with Riot, and a public product needs a **production key** (apply with a working prototype or mockups showing the user flow).
- Must show Riot's required legal disclaimer in a visible place. Use Riot IDs (game name + tag line), not summoner names. Don't expose the key in client code.
- Personal keys expire and need regenerating (typically every 24 hours for the dev key; check the portal).

### Spotify (personal/limited use only)
- Since Feb 2026, Development Mode requires a **Premium** account and is capped at **5 authorized users** per app. Extended quota requires a registered business and 250,000 monthly active users, so it is not realistic for this project.
- Some endpoints were removed or gated since Nov 2024. The user-top-read scope (my top tracks and artists) still works in dev mode; re-check which endpoints currently work before designing features.
- **Plan:** live Spotify login for me plus up to 4 friends. Everyone else gets demo mode.
- **Stretch goal:** let anyone upload their own Spotify data export (Spotify provides listening history files on request from privacy settings; verify the current process and file format) and compute stats from it. No API limits.

### Overwatch
- **No official API.** Community tools read Blizzard's public career pages. OverFast API (https://github.com/TeKrop/overfast-api) is an actively maintained unofficial option. Players need public profiles. Treat this adapter as fragile.

### Valorant (hard, later)
- Personal and dev keys don't work for the Valorant API. Needs a production key and **Riot Sign On (RSO)** with player opt-in. Riot does not approve apps that are private or personal-use only, and does not allow scouting. Defer until the rest works and decide then whether to apply.

### Rainbow Six Siege (hard, last)
- No official public API found. Old community wrappers reverse-engineered Ubisoft endpoints and many are unmaintained. Needs fresh research (including third-party services and their terms) before attempting.

## 6. First steps (do these in order)

Check in with me after each one.

1. **Create the project.**
   - `npx create-next-app@latest` with TypeScript, Tailwind, App Router, and ESLint.
   - Confirm it runs with `npm run dev` and I can see the starter page.
   - Initialize git, make sure `.env.local` is gitignored, and make a first commit.
2. **Define the shared types** (section 4.2) in `src/adapters/types.ts`. Explain each type to me.
3. **Build demo mode.**
   - Write realistic sample data for Deadlock, YouTube, League, and Spotify in `src/demo/sampleData.ts`.
   - Make a demo adapter that returns it.
4. **Build the dashboard UI** using demo data only: a page with one card per source showing headline stats and recent items, clearly labeled as demo. Keep the design clean and responsive. This is the "employer view," so polish matters.
5. **First live integration: Deadlock.**
   - Read the Deadlock API docs, then write `adapters/deadlock.ts` that maps the response to `PlayerSummary`.
   - Add a server route and a way to enter a Steam ID. Add basic caching and error handling (API down, player not found).
6. **Deploy to Vercel** early, with demo mode as the default for visitors. Set up environment variables there.
7. **Second integration: YouTube** (API key, channel stats, recent uploads, quota-friendly calls only).
8. **Third integration: League** with a personal key (Riot ID lookup, recent matches, simple aggregate stats). Add the Riot disclaimer.
9. **Spotify** (OAuth login, top tracks and artists, 5-user cap noted in the UI). Later, optionally add the data-export upload.
10. **Overwatch** via OverFast, then reassess Valorant and R6.

## 7. README requirements (important for the portfolio)

Keep a README that has: what the app is, a screenshot or GIF, a live demo link, the tech stack, an architecture explanation (adapters and common data shape), a note on why demo mode exists (API restrictions), and setup instructions with a list of required env vars. Keep a `.env.example` with placeholder values.

## 8. Open questions to settle as we go

- Do I want a database and accounts, or keep it stateless?
- Which stats should the headline cards show per source?
- Visual style and theme preferences.
- Whether to apply for a Riot production key once the League integration works.

## 9. Where we left off

Nothing is built yet. Research is done and the plan is above. **Start at step 1 of section 6.**
