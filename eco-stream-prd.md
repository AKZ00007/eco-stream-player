# Eco-Stream Video Platform — Product Requirements Document

> **Version:** 1.0 | **Type:** Assignment | **Stack:** React + TypeScript + Node.js

---

## Table of Contents

1. [Product Overview & Goals](#1-product-overview--goals)
2. [Dataset & Data Layer](#2-dataset--data-layer)
3. [Data Models & API Contracts](#3-data-models--api-contracts)
4. [Feature 1 — Discover Feed (Home)](#4-feature-1--discover-feed-home)
5. [Feature 2 — Premium Video Player](#5-feature-2--premium-video-player)
6. [Feature 3 — Mini Player (Picture-in-App)](#6-feature-3--mini-player-picture-in-app)
7. [Feature 4 — Real-Time Trending Updates](#7-feature-4--real-time-trending-updates)
8. [Climate Impact Score Engine](#8-climate-impact-score-engine)
9. [Recommendation System](#9-recommendation-system)
10. [Tech Stack & Architecture](#10-tech-stack--architecture)
11. [Performance Targets](#11-performance-targets)
12. [Delivery Milestones](#12-delivery-milestones)

---

## 1. Product Overview & Goals

Eco-Stream is a **mobile-first video streaming web application** focused on environmental storytelling. It mimics the UX of premium streaming apps (Netflix/YouTube-like), with gesture-based controls, shared-element transitions, a persistent mini-player, and intelligent content discovery.

| Property | Value |
|---|---|
| Platform | Mobile-first Web (PWA-ready) |
| Primary Framework | React 18 + TypeScript |
| Backend | Node.js / Express (Mock API) |
| Target Devices | Mobile (360–430px) + Desktop |

### Core Goals

- Deliver a premium, smooth video browsing and playback experience
- Surface environmental impact clearly through dynamic scoring
- Achieve ~60fps interactions and smooth transitions throughout
- Work seamlessly on mobile with gesture-first interactions
- Keep video context alive across navigation via a persistent mini-player

---

## 2. Dataset & Data Layer

The application uses the provided dataset of **5 ecosystem categories** containing **9 videos** total.

### Ecosystem Categories

| Emoji | Category | Slug | Videos |
|---|---|---|---|
| 🌊 | Ocean Conservation | `ocean-health` | 2 |
| ☀️ | Renewable Energy | `clean-power` | 2 |
| 🌳 | Reforestation | `forest-growth` | 1 |
| 🏙️ | Urban Sustainability | `green-cities` | 2 |
| 🦏 | Wildlife Protection | `biodiversity` | 2 |

### Mock Server Setup

Use a lightweight **Express.js** server. Data is seeded from the provided JSON. Additional computed fields (`isTrending`, `viewCount`, `watchProgress`, `dominantColor`, dynamic `impactScore`) are injected at server initialization and mutated by simulated real-time events.

---

## 3. Data Models & API Contracts

### Video Object

```typescript
interface Video {
  id: string;              // UUID, generated at seed time
  title: string;           // from dataset
  mediaUrl: string;        // MP4 stream URL
  thumbnailUrl: string;    // Unsplash image URL
  duration: string;        // "MM:SS" format
  categorySlug: string;    // linked category
  impactScore: number;     // dynamic 0–100, recalculated each response
  isTrending: boolean;     // mutated by trending simulation
  viewCount: number;       // simulated counter
  watchProgress: number;   // 0.0–1.0, persisted per session
  dominantColor: string;   // hex, extracted from thumbnail
}
```

### Category Object

```typescript
interface Category {
  slug: string;       // e.g. "ocean-health"
  category: string;   // display name
  emoji: string;      // assigned emoji icon
  videoCount: number; // computed from contents.length
}
```

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/videos` | All videos. Accepts `?category=slug`, `?trending=true`, `?sort=viewCount` |
| `GET` | `/categories` | All category objects with video count |
| `GET` | `/videos/:id` | Single video with full computed fields |
| `GET` | `/recommendations` | 3–5 videos. Accepts `?watchedCategory=slug&excludeId=id` |
| `PATCH` | `/videos/:id/progress` | Body: `{ progress: 0.0–1.0 }`. Updates watch position. |
| `GET` | `/trending-tick` | Internal endpoint polled every 30s. Returns mutated video list. |

### Example Response — `GET /videos`

```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "The Great Barrier Reef Revival",
    "mediaUrl": "https://www.w3schools.com/html/mov_bbb.mp4",
    "thumbnailUrl": "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
    "duration": "03:45",
    "categorySlug": "ocean-health",
    "impactScore": 96,
    "isTrending": true,
    "viewCount": 18420,
    "watchProgress": 0.0,
    "dominantColor": "#1a6fa3"
  }
]
```

---

## 4. Feature 1 — Discover Feed (Home)

The home screen is a vertically scrollable feed grouped by ecosystem category. Each group has a horizontally scrollable row of video cards.

### Video Card Spec

| Element | Spec |
|---|---|
| **Thumbnail** | Lazy-loaded at 16:9 ratio. Skeleton loader while loading. Use `loading="lazy"` + IntersectionObserver. |
| **Title** | Max 2 lines, ellipsis truncation. 14px medium weight. |
| **Duration badge** | Overlaid bottom-right on thumbnail. Semi-transparent dark pill. E.g. `03:45`. |
| **Trending badge** | Overlaid top-left. Amber pill with flame icon. Only when `isTrending = true`. Fade-in animation. |
| **Climate Impact Score** | Shown below title. Arc or progress chip with score/100. Color: green (70+), amber (40–69), red (<40). |
| **Tap** | Initiates shared-element transition to full player via Framer Motion `layoutId`. |

### Category Section Layout

- Section header: emoji + category name + "See all →" link
- Horizontally scrollable card row (snap scrolling, hidden scrollbar)
- Card width: `240px` on mobile, `280px` on desktop. Gap: `12px`
- Categories load incrementally — first 2 visible, rest loaded as user scrolls (IntersectionObserver on section sentinel)

### Pull-to-Refresh

On mobile, dragging the feed down >60px triggers a refresh indicator (spinner + "Refreshing…"). Re-calls `GET /videos` and `GET /categories`. Implemented via touch event delta or `react-pull-to-refresh`. Shows a brief toast: "Feed updated" on completion.

---

## 5. Feature 2 — Premium Video Player

A full-screen custom video player that replaces native browser controls. Opened by tapping a video card.

### Player Entry — Shared Element Transition

- Card thumbnail morphs into the player header using Framer Motion `layoutId`
- Metadata (title, score) fade-slides in after transition completes (~300ms)
- Audio fades from `0` to `1` over 1.5s on autoplay (ramp `video.volume` in a `requestAnimationFrame` loop)

### Custom Controls

| Control | Behavior |
|---|---|
| **Play / Pause** | Tap center. Controls auto-hide after 3s of inactivity. |
| **Gesture Seek** | Double-tap left half → −10s. Double-tap right half → +10s. Ripple animation + "−10s" / "+10s" overlay label. |
| **Playback Speed** | Tap to cycle: `0.5×` → `1×` → `1.5×`. Sets `video.playbackRate`. Shown as a pill badge. |
| **Progress Bar** | Scrubable. Shows buffered range as lighter track. Elapsed + total duration shown. |
| **Volume** | Slider on desktop. Mute toggle on mobile. |
| **Swipe down** | Initiates transition to mini-player (see Feature 3). |

### Watch Progress Persistence

Every 5 seconds during playback, `video.currentTime / video.duration` is saved to `localStorage` keyed by `video.id`. On opening a video with saved progress (>5%), a "Resume from MM:SS?" prompt is shown. Dismissed → plays from 0. Progress is also synced to the backend via `PATCH /videos/:id/progress` (debounced, 5s interval).

### Dynamic Background Color

On player open, a `<canvas>` element samples the thumbnail image's dominant color (draw image → sample center 50×50px → average RGB). The hex is applied as a subtle radial gradient behind the player UI. Transition uses `CSS transition: background 0.6s ease`. Runs in `requestIdleCallback` to avoid blocking the main thread.

---

## 6. Feature 3 — Mini Player (Picture-in-App)

Swiping down on the full player docks it into a compact bar anchored to the bottom of the screen. Persists across navigation.

### State Machine

```
Closed → [tap card] → Full Player
Full Player → [swipe down] → Mini Player
Mini Player → [horizontal swipe >80px] → Dismissed
Mini Player → [tap or swipe up] → Full Player
```

### Mini Player UI Spec

| Element | Spec |
|---|---|
| **Size** | Fixed bar, 64px tall, full device width. Docked to bottom. |
| **Thumbnail** | 56×40px image on left edge. |
| **Title** | Truncated/marquee text, 13px, center. |
| **Play/Pause** | 32px icon button, right-center. |
| **Close button** | 24px × icon, far right. Stops playback and dismisses. |
| **Progress indicator** | 2px bar at the very top of the mini-player. Tracks playback in real-time. |

### Gesture Interactions

- **Tap anywhere** → expands to full player
- **Horizontal swipe (>80px delta)** → dismisses with slide-out animation in swipe direction
- **Swipe up** → expands to full player

### Persistence Across Navigation

The mini-player is mounted at the **app root level** (`App.tsx`), outside the route render tree. A `PlayerContext` (or Zustand store) holds current video, playback state, and progress. Route changes do not unmount the mini-player or interrupt the underlying `<video>` element.

---

## 7. Feature 4 — Real-Time Trending Updates

### Simulation Strategy

The backend runs a **trending ticker**: every 30 seconds, a server-side `setInterval` randomly picks 1–2 videos, sets `isTrending = true`, and resets previously trending ones. The frontend polls `GET /trending-tick` every 30 seconds (or uses Server-Sent Events). On receiving updates, React Query invalidates the `/videos` cache, triggering a background re-fetch without a full page reload.

### UI Behavior on Trending Update

- Trending badge animates **in** (scale + fade) on newly trending cards
- Badge animates **out** on de-trended cards
- Non-blocking toast: "2 new trending videos" shown for 3 seconds
- No scroll position disruption

---

## 8. Climate Impact Score Engine

The climate impact score is **dynamically computed** — not hardcoded. The dataset's `impactScore` values serve as a baseline, recalculated from multiple signals on every API response.

### Score Formula

```
score = (
  baseScore       × 0.40    // dataset impactScore
+ categoryWeight  × 0.30    // category urgency multiplier (see table below)
+ keywordBonus    × 0.20    // title keyword scan (0–10 pts)
+ trendingBonus   × 0.10    // +5 if isTrending, else 0
)
```

Clamped to `0–100`, rounded to nearest integer.

### Category Weight Table

| Category | Weight | Rationale |
|---|---|---|
| Wildlife Protection | 100 | Extinction is irreversible |
| Ocean Conservation | 95 | Covers 70% of Earth's surface |
| Reforestation | 92 | Direct carbon sequestration |
| Renewable Energy | 90 | Emissions reduction at scale |
| Urban Sustainability | 85 | Systems-level change |

### Keyword Bonus Dictionary

| Keywords | Bonus |
|---|---|
| "zero waste", "revival" | +8–9 pts |
| "protection", "rhino", "arctic", "reef" | +6–7 pts |
| "sahara", "offshore", "rainforest" | +5 pts |

Max keyword bonus capped at **10 pts**.

---

## 9. Recommendation System

Endpoint: `GET /recommendations?watchedCategory=slug&excludeId=id`

### Ranking Logic (Server-Side)

1. **Same-category priority** — If `watchedCategory` is passed, return all other videos from that category first.
2. **High impact fill** — Fill remaining slots with videos sorted by `impactScore DESC`, excluding current video and already-selected.
3. **Trending bonus** — Videos with `isTrending = true` receive `+10` in the sort score.
4. **Response** — Returns exactly **4 video objects**. Displayed in an "Up Next" rail below the player.

---

## 10. Tech Stack & Architecture

### Frontend

| Concern | Library |
|---|---|
| UI Framework | React 18 + TypeScript |
| Animation | Framer Motion |
| Global State | Zustand (player context, trending state) |
| Data Fetching | TanStack React Query |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 |
| Gestures | Framer Motion / `@use-gesture/react` |
| Build Tool | Vite |

### Backend

| Concern | Library |
|---|---|
| Server | Express.js + Node.js |
| Language | TypeScript |
| Data | In-memory seed from JSON dataset |
| Real-time simulation | `setInterval` trending ticker |

### Deployment

| Target | Service |
|---|---|
| Frontend | Vercel |
| Backend API | Render or Railway |

### Recommended Folder Structure

```
src/
├── components/       # VideoCard, MiniPlayer, CategorySection, VideoPlayer…
├── pages/            # Home, Player, CategoryFeed
├── hooks/            # usePlayer, useWatchProgress, useTrending, useColorExtract
├── store/            # Zustand player + trending store
├── api/              # API client functions + React Query hooks
├── utils/            # impactScore.ts, colorExtractor.ts, formatDuration.ts
└── types/            # Video, Category, PlayerState, RecommendationResponse

server/
├── index.ts          # Express app entry
├── routes/
│   ├── videos.ts
│   ├── categories.ts
│   └── recommendations.ts
├── middleware/
│   └── trendingTicker.ts
└── data/
    └── seed.ts       # Dataset + UUID injection + computed fields
```

---

## 11. Performance Targets

| Metric | Target |
|---|---|
| Animation frame rate | 60fps |
| Player open transition | <200ms |
| API response (p95) | <500ms |
| Thumbnail load (LCP) | <2.5s |

### Key Performance Rules

- All thumbnails lazy-loaded with skeleton placeholders. Set `width` + `height` attributes to prevent CLS.
- Color extraction runs in `requestIdleCallback` — never blocks the main thread.
- Animations use only `transform` and `opacity` — no layout-triggering properties (`width`, `height`, `top`, `left`).
- React Query caching prevents redundant API calls on re-navigation. Stale time: 30s.
- Player page code-split with `React.lazy()` — only loaded when a video is tapped.

---

## 12. Delivery Milestones

| Week | Deliverable |
|---|---|
| **Week 1** | Vite + React + TypeScript boilerplate. Express mock API with all endpoints. Seed dataset, UUID generation, impact score engine, trending ticker. Verify all API responses. |
| **Week 2** | Home feed — category sections, video cards, lazy loading, thumbnails, badges, pull-to-refresh. React Query integration. Mobile layout polish. |
| **Week 3** | Full-screen video player — shared element transition, custom controls, gesture seek, speed toggle, audio fade-in, dynamic background color extraction. |
| **Week 4** | Mini-player with Zustand — swipe-to-dock, swipe-to-dismiss, cross-route persistence. Real-time trending polling and toast notifications. Watch progress persistence. |
| **Week 5** | Performance audit, accessibility pass, README with setup instructions, deploy to Vercel + Render/Railway. Record demo GIF for submission. |

---

## Appendix — Prompt for AI IDE

When pasting this PRD into an AI IDE (e.g. Google's anti-gravity IDE), prefix your prompt with:

```
You are helping me build a React 18 + TypeScript + Express.js project called Eco-Stream.
Below is the full PRD. Scaffold the project following the folder structure in Section 10.
Start with: (1) TypeScript interfaces from Section 3, (2) the Express seed file, (3) the Zustand player store.
```

---

*Eco-Stream PRD v1.0 — Ready for AI IDE ingestion*
