# PocketBase Realtime — Mouse Tracker

<p align="center">
  <i>Demo GIF here — open 2 tabs, move mouse, see live sync</i>
</p>

Realtime collaborative mouse cursor tracker + shared note. Open 2 browser tabs, move your mouse in one — see the cursor move in the other at 60fps. Built with **PocketBase SSE** and **React**.

## Features

- **Live cursor sync** — multiple users see each other's cursors move in realtime
- **Shared note** — collaborative textarea, see who's typing and who edited last
- **Smooth animation** — lerp interpolation at 60fps, no jitter
- **Auto cleanup** — cursor disappears when a user closes the tab
- **Custom identity** — random name + color assigned on first visit, persisted in localStorage
- **Dark theme** — minimal UI, backdrop-blur header, SVG cursors

## How it works

```
Browser A                  PocketBase                  Browser B
   │                            │                           │
   │── mouse → PATCH ──────────→│                           │
   │                       SQLite write                      │
   │                            │── SSE event ─────────────→│
   │←── SSE event ──────────────│                           │
```

- Client sends mouse position via HTTP `PATCH`
- PocketBase writes to SQLite, broadcasts via **SSE** to all subscribers
- Each client lerps cursor position smoothly at 60fps using `requestAnimationFrame`

## Quick Start

### 1. Download PocketBase

Download the binary from [pocketbase.io/docs](https://pocketbase.io/docs), place it in the project root, then:

```bash
./pocketbase serve
# Admin UI → http://127.0.0.1:8090/_/
```

### 2. Create collections

Go to Admin UI → Collections → create these **2 collections** with **empty API rules** (public access):

**`cursor`**

| Field | Type | Options |
|---|---|---|
| `Userid` | Plain text | |
| `usename` | Plain text | |
| `color` | Plain text | |
| `x` | Number | |
| `y` | Number | |
| `active` | Bool | |

**`note`**

| Field | Type | Options |
|---|---|---|
| `content` | Plain text | |
| `Userid` | Plain text | |
| `authorName` | Plain text | |
| `authorColor` | Plain text | |

### 3. Configure URL

Edit `frontend/src/pocketbase.ts` — update the PocketBase URL if needed:

```ts
export const pb = new PocketBase("http://127.0.0.1:8090")
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 5. Test

Open `http://localhost:5173` in **2 browser tabs** side by side. Move your mouse around — you'll see the cursor appear and move in the other tab.

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | PocketBase (Go, SQLite, REST API, SSE) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | TailwindCSS |
| Transport | Server-Sent Events (SSE) |
| Animation | `requestAnimationFrame` + GPU-accelerated transforms |
