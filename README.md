# Eco-Stream Player

Eco-Stream is a mobile-first, highly interactive, premium video streaming platform tailored specifically for climate and biodiversity content. It emphasizes smooth gesture controls, seamless page-to-page video transitions, dynamic recommendation engines, and high-performance React UI components capable of rendering at ~60fps on mobile browsers.

## 🚀 Setup Instructions

This project is built as a monorepo containing a React frontend (Vite) and an Node.js/Express backend. 

### Prerequisites
- Node.js (v18 or higher)
- npm package manager

### 1. Install Dependencies
Navigate into the root directory and install packages for both client and server:

```bash
# This uses the root package.json to install the client dependencies 
# (server has no external npm modules other than dev dependencies right now, but run it anyway)
npm install

# Make sure to also install server dependencies explicitly
cd server
npm install

# And client dependencies 
cd ../client
npm install
cd ..
```

### 2. Run the Development Servers
From the root directory, run both servers concurrently:

```bash
npm run dev
```

Alternatively, you can run them in separate terminals:
- **Server:** `cd server && npm run dev` (Runs on `http://localhost:4000`)
- **Client:** `cd client && npm run dev` (Runs on `http://localhost:5173`)

## 🛠 Tech Stack & Architecture

- **Frontend:** React 19, TypeScript, Vite, TailwindCSS (v4), Framer Motion, Zustand (State Management), React Query (Data Fetching), Lucide React (Icons).
- **Backend:** Node.js, Express, TypeScript, in-memory mock data simulation.
- **Design Philosophy:** **Mobile-First**. The primary interface is designed entirely around mobile viewport ergonomics, touch gestures, and bottom-nav overlays. A distinct desktop layout adapts the content gracefully to wider screens.

---

## 🧠 Core Feature Logic & Implementation details

For visitor understanding, here is how the core algorithms and mechanisms function under the hood:

### a) "Climate Impact" Score (Dynamically Generated)
Every video displays an "Impact Score" between 1 and 100. Rather than hardcoding this value, it's generated via an algorithm that evaluates the video's underlying metadata.
* **The Logic (`client/src/utils/impact.ts`):** 
  - **Base Value:** Starts at exactly 50 points.
  - **Category Weight:** High-impact categories (like 'renewable-energy' or 'forest-growth') inject up to 25 bonus points.
  - **Keyword Parsing:** The algorithm scans the title and description for specific green keywords (e.g., `solar`, `biodiversity`, `sustainability`). Each match adds 4 points.
  - **Consistency Hash:** To ensure a video doesn't randomly change scores on every render, the video's ID is checksummed to yield a consistent 1-10 point bonus.
  - **Normalization:** The final tally is clamped forcefully between `[1, 99]`.

### b) Pull-to-Refresh Simulation
To replicate native app behavior on the mobile PWA frontend, a pull-to-refresh mechanic is employed.
* **The Logic (`usePullToRefresh.ts` & React Query):**
  - Uses `framer-motion` and `use-gesture` to track vertical drag velocity (`dragY`) when scrolled to the very top (`scrollTop === 0`) of the feed.
  - Once the drag reaches a certain threshold (e.g., `80px`), a spinner icon reveals itself, and a gesture release instantly triggers React Query's `.refetch()` method to pull the latest video mutations from the API.

### c) Advanced Recommendation System
Eco-Stream isn't a static list of videos; it utilizes a mock algorithm simulating a "For You" engine.
* **The Logic (`server/routes/recommendations.ts` & `history.ts`):**
  - **Affinity Mapping:** Each time a user watches a video, the category is logged locally to build a "Category Affinity" score.
  - **Scoring Pipeline:** When requesting recommendations, videos go through a pipeline: 
    - Base score is the dynamic *Climate Impact Score*.
    - *Same-Category Priority:* Massive bump (+1000) if matching the currently viewed category.
    - *History Affinity:* Point multiplier based on how often the user watches this category.
    - *Diversity Pass:* The algorithm guarantees at least 1 out of the top 4 recommended videos belongs to a *completely different category* to prevent echo chambers and encourage content discovery.
    - *Watched Penalty:* Highly watched videos are heavily penalized so the feed remains fresh.

### d) Track Watch Progress & Seamless Resumption
When a user minimizes a video or navigates to another page, they don't lose their spot.
* **The Logic:** 
  - Hooked deeply into the HTML5 `<video>` `onTimeUpdate` event. Every few seconds, the normalized playback progress `(currentTime / duration)` is dispatched to the backend (via PATCH) and stored instantly in the browser's `localStorage`.
  - Upon visiting a video page, the player checks `localStorage` and automatically sets the video's current time `videoRef.current.currentTime = savedProgress * duration;`.

### e) Simulate Videos Becoming "Trending"
Instead of a static "Trending" list, videos organically rotate in and out of the trending tier to mimic a live social platform.
* **The Logic (`server/middleware/trendingTicker.ts`):**
  - A scheduled `setInterval` acts as a background chron job in the backend. 
  - Every X seconds, it flushes the current "trending" flags on all videos. It parses the entire video dataset and randomly promotes 3-5 videos to `isTrending = true`.
  - The React Query client frequently polls the `/trending-tick` endpoint or utilizes a cache invalidator to instantly shuffle the Trending horizontal row dynamically on the frontend.

### f) UI Automatically Updating (No Page Refreshes)
To achieve an app-like feel, the entire application operates via Single Page Architecture without any disruptive DOM clears.
* **The Logic:**
  - **Zustand + React Router:** Global state like the "Mini Player" is decoupled from React Router. As you navigate from 'Home' -> 'Category' -> 'Search', the persistent mini-player overlay stays mounted completely outside the routing tree. 
  - **React Query Hooks:** Uses stale-while-revalidate strategies. Data fetching happens in the background while the UI paints immediately using cached data, gracefully updating the DOM when new JSON arrives.

### g) Smooth Interactions & 60fps Target
Eco-Stream relies intensely on hardware-accelerated animations to feel premium and buttery smooth on mobile chips.
* **The Logic:**
  - **Framer Motion Layout IDs:** Employs the `layoutId` prop, allowing the browser to calculate independent `transform` translation states. Instead of re-rendering, elements instantly scale-and-slide from the thumbnail to the fullscreen player by leveraging the GPU.
  - **CSS Strictness:** Avoids animating costly layout properties like `width`, `height`, or `margin`. Everything is driven by `translate`, `scale`, and `opacity`, keeping the main thread free and frame times strictly below 16ms.
