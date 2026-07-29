---
id: "001"
title: "Project scaffold: Vite+TS client + Node proxy"
status: pending
depends_on: []
touches:
  - client/
  - server/
  - package.json
  - client/package.json
  - server/package.json
  - client/vite.config.ts
  - client/tsconfig.json
  - client/index.html
  - client/src/main.tsx
  - client/src/App.tsx
  - server/index.js
  - server/.env.example
test_files: []
iterations: 0
attempt_log: []
---

## Scope
Bootstrap the monorepo structure:
- `client/` — Vite + TypeScript + React (vitest for unit tests)
- `server/` — minimal Node/Express proxy with three routes: `/generate`, `/tts`, `/image`
- Root scripts to run both concurrently

## Acceptance Criteria
- AC1: `cd client && npm run dev` starts Vite dev server on port 5173 (shows a "La Casa" placeholder page)
- AC2: `cd server && node index.js` starts on port 3001; GET `/health` returns `{ok:true}`
- AC3: `POST /generate` with missing ANTHROPIC_API_KEY returns HTTP 503 with `{error:"stub"}` (not a crash)
- AC4: `POST /tts` with missing ELEVENLABS_API_KEY returns HTTP 503 with `{error:"stub"}`
- AC5: `POST /image` with missing OPENAI_API_KEY returns HTTP 503 with `{error:"stub"}`
- AC6: `cd client && npm run test` discovers and runs vitest unit tests
- AC7: Vite proxies `/generate`, `/tts`, `/image` to `http://localhost:3001` so client can call them relative
- AC8: Baloo 2 font loaded (Google Fonts import in index.html or bundled woff2)
