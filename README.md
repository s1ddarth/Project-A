# KIID App

Monorepo for a regulatory document SaaS that generates UCITS KIIDs.

```
frontend/   Vite + React app (wizard, editor, live preview)
backend/    FastAPI service (NAV validation, SRRI) — not yet implemented
```

## Prerequisites

- Node.js 22+ (required by Vite 6)
- npm
- Python 3.11+ (when working on `backend/`)

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `frontend/dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check via `jsconfig.json` |

`dist/` is a build artifact — do not commit it. Vercel rebuilds it on deploy; set the Vercel **Root Directory** to `frontend`.

## Backend

The Python service lives in `backend/` and will deploy separately (Render, EU / Frankfurt). See `backend/README.md` when scaffolding starts.

## Project documentation

- `PROJECT_CONTEXT.md` — architecture, decisions, open questions. Read this first.
- `AGENTS.md` — working rules and key files.
