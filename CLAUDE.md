# CLAUDE.md — PocketBase Realtime Mouse Tracker

## Project Overview

A real-time collaborative mouse cursor tracker demo built with PocketBase SSE + React. Multiple users open the app and see each other's cursors move live on a shared canvas. Demonstrates PocketBase's SSE-based realtime subscription system.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | PocketBase (self-hosted binary) | Built-in SSE realtime, SQLite, REST API, zero-config |
| Frontend | React + TypeScript + Vite | Fast HMR, type safety |
| Styling | TailwindCSS | Utility-first, no CSS files needed |
| PB Client | `pocketbase` npm SDK | Official JS SDK |

---

## Architecture

```
Browser A                    PocketBase Server              Browser B
   │                               │                            │
   │── mousemove → throttle ──→ PATCH /api/collections/cursors/records/:id
   │                               │                            │
   │                          SQLite write                      │
   │                               │                            │
   │←── SSE event ─────────────────┤──── SSE event ────────────→│
   │  {action:"update", record:{}} │  {action:"update", record:{}}
   │                               │                            │
lerp interpolation                                    lerp interpolation
```

Transport: **Server-Sent Events (SSE)** — not WebSocket.  
Write path: HTTP PATCH (REST) → SQLite → SSE broadcast to all subscribers.

---

## PocketBase Collection Schema

Collection name: `cursors`

| Field | Type | Options |
|---|---|---|
| `userId` | Text | Required |
| `username` | Text | Required |
| `x` | Number | Default: 0 |
| `y` | Number | Default: 0 |
| `color` | Text | Default: `#6366f1` |
| `active` | Bool | Default: true |

**API Rules** (set in PocketBase Admin UI):
- List rule: `""` (empty = public)
- View rule: `""` (empty = public)
- Create rule: `""` (empty = public)
- Update rule: `""` (empty = public)
- Delete rule: `""` (empty = public)

> For production: replace `""` with `@request.auth.id != ""` to require auth.

---

## Project Structure

```
pb-realtime/
├── CLAUDE.md                  # this file
├── pocketbase                 # PocketBase binary (download separately)
├── pb_data/                   # PocketBase auto-generated data dir
├── pb_hooks/                  # Optional: server-side JS hooks
│   └── cleanup.pb.js          # Cron to delete stale cursors (>30s)
└── frontend/
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── pocketbase.ts      # PocketBase client singleton
        ├── hooks/
        │   ├── useCursors.ts  # SSE subscription + cursor state
        │   └── useMouseTracker.ts  # mousemove → throttled PATCH
        ├── components/
        │   ├── CursorCanvas.tsx    # renders all remote cursors
        │   ├── CursorDot.tsx       # single animated cursor
        │   └── UserBadge.tsx       # username pill above cursor
        └── types.ts           # shared TypeScript types
```

---

## Core Implementation Details

### 1. PocketBase Client Singleton (`src/pocketbase.ts`)

```ts
import PocketBase from 'pocketbase'
export const pb = new PocketBase('http://127.0.0.1:8090')
```

### 2. Cursor Record Type (`src/types.ts`)

```ts
export interface CursorRecord {
  id: string
  userId: string
  username: string
  x: number
  y: number
  color: string
  active: boolean
  updated: string
}

export interface CursorState extends CursorRecord {
  displayX: number   // lerp-interpolated x
  displayY: number   // lerp-interpolated y
}
```

### 3. Subscription Hook (`src/hooks/useCursors.ts`)

- Call `pb.collection('cursors').subscribe('*', handler)` on mount
- Store cursor map in `useRef` (avoids re-render on every SSE event)
- Use `requestAnimationFrame` loop to lerp `displayX/Y` toward `targetX/Y`
- Lerp factor: `0.15` (adjust for speed vs smoothness)
- Unsubscribe on unmount: `return () => pb.collection('cursors').unsubscribe()`

### 4. Mouse Tracker Hook (`src/hooks/useMouseTracker.ts`)

- On mount: create a new record in `cursors` with random `color` and `userId`
- Throttle strategy: **distance threshold** — only PATCH if moved > 5px
- Secondary throttle: max 20 updates/sec (50ms `setTimeout`)
- On unmount / `beforeunload`: `pb.collection('cursors').delete(myRecordId)`
- On `visibilitychange`: set `active: false` when tab hidden, `true` when visible

### 5. Lerp Animation Loop

```ts
// Inside useCursors — runs every frame
const animate = () => {
  setCursors(prev => prev.map(c => ({
    ...c,
    displayX: c.displayX + (c.x - c.displayX) * 0.15,
    displayY: c.displayY + (c.y - c.displayY) * 0.15,
  })))
  rafRef.current = requestAnimationFrame(animate)
}
```

> Note: for performance, consider using `useRef` + direct DOM manipulation instead of `setState` in the RAF loop if you have >20 cursors.

### 6. Stale Cursor Cleanup (`pb_hooks/cleanup.pb.js`)

```js
// Runs every 10 seconds, deletes cursors not updated in 30s
cronAdd("cleanup_cursors", "*/10 * * * * *", () => {
  const threshold = new Date(Date.now() - 30_000).toISOString()
  const stale = $app.dao().findRecordsByFilter(
    "cursors",
    `updated < "${threshold}"`,
    "", 0, 0
  )
  stale.forEach(record => $app.dao().deleteRecord(record))
})
```

---

## Dev Setup

### 1. Start PocketBase

```bash
# Download from https://pocketbase.io/docs/
./pocketbase serve
# Admin UI: http://127.0.0.1:8090/_/
```

### 2. Create Collection

Go to Admin UI → Collections → New collection → name: `cursors` → add fields from schema above → set API rules to empty strings.

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
# App: http://localhost:5173
```

### 4. Test Realtime

Open `http://localhost:5173` in two browser windows side by side. Move mouse in one — cursor should appear and move in the other.

---

## Key Implementation Decisions

- **No auth** for this demo — `userId` is a random UUID generated client-side and stored in `localStorage`.
- **SSE not WebSocket** — PocketBase only supports SSE. Write always goes through REST.
- **Color** is assigned randomly on first visit and persisted in `localStorage` alongside `userId` and the PocketBase `recordId`.
- **Canvas is `position: fixed; inset: 0; pointer-events: none`** — overlaid on top of everything so cursors render without blocking interaction.
- **Own cursor is hidden** from the canvas (filter by `userId !== myUserId`) since browser already shows it.
- **Cursor label** shows `username` in a pill, positioned above the cursor dot.

---

## Performance Targets

| Metric | Target |
|---|---|
| Mouse update rate | ≤ 20/sec (50ms throttle) |
| SSE latency (LAN) | < 50ms |
| Lerp smoothness | 60fps RAF loop |
| Max cursors before DOM perf degrades | ~50 (switch to Canvas API beyond that) |

---

## Stretch Goals (not in MVP)

- [ ] Named rooms via URL param (`?room=abc`) — filter subscription by `roomId`
- [ ] Click effects — broadcast click position as ephemeral "ripple" event
- [ ] Cursor trail — keep last N positions per user for trail rendering
- [ ] Auth with PocketBase users — swap anonymous userId for real auth
- [ ] Canvas API renderer — replace DOM cursors with `<canvas>` for scale

---

## Common Pitfalls

1. **CORS** — PocketBase default allows all origins in dev; in prod set `--origins` flag.
2. **SSE disconnect** — PocketBase SDK auto-reconnects; don't implement your own reconnect logic.
3. **Record not found on delete** — wrap `delete` in try/catch; record may already be gone.
4. **Race condition on create** — store `recordId` in a `useRef` before any `mousemove` fires.
5. **RAF + setState** — calling `setState` every frame causes excessive re-renders; prefer `useRef` + direct style mutation for cursor positions.
