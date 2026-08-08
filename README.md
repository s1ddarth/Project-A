# KIID App

Monorepo for a regulatory document SaaS that generates UCITS KIIDs.

```
frontend/   Vite + React app (wizard, editor, live preview) — no regulatory logic
backend/    FastAPI service + SRRI engine (NAV validation, SRRI calculation)
```

The split is deliberate: **if a regulator could ask "how did you get this number",
it lives in `backend/`.** The frontend renders what the service returns and
computes nothing itself.

---

## Quick start

You need **two terminals**. The frontend calls the backend, so start the backend
first.

### Prerequisites

- **Node.js 22+** (Vite 6 will not run on 21 or below — check with `node --version`)
- **Python 3.11+** (developed on 3.12)

### 1. Backend

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Prove the engine is intact before running anything on top of it.
.venv/bin/python srri_engine/test_srri_engine.py
# -> 88 passed, 0 failed

cd api
../.venv/bin/uvicorn main:app --reload --port 8000
```

Check it: <http://localhost:8000/health> · interactive docs at <http://localhost:8000/docs>

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local     # points at http://localhost:8000
npm run dev
```

Open the URL Vite prints (usually <http://localhost:5173>).

> **Vite reads env files only at startup.** If you create or edit `.env.local`
> while the dev server is running, restart it or the app will not see the change.

### 3. Try it

1. Go to step 3, **Validation**.
2. Fill in the fund header — the sample fund is pre-filled with a valid ISIN.
3. Download the **Template** button's file if you need the NAV column layout, or
   use any NAV history with `Date` and `NAV Price` columns.
4. Pick the **date format that matches your file**. This matters: a US-formatted
   file read as DMY produces a wrong SRRI with no other symptom.
5. **Run validation.** The SRRI, the risk wording and every finding come from
   Python — nothing on this page is computed in JavaScript.
6. **Calculation workbook** downloads the audit workbook (Summary, Calculations,
   Distribution, Methodology, Audit & Findings).

### Troubleshooting

| Symptom | Cause |
|---|---|
| "Could not reach the SRRI service" | Backend is not running, or `.env.local` is missing / the dev server was not restarted after creating it |
| "The SRRI service URL is not configured" | No `VITE_API_URL` — copy `.env.example` to `.env.local` |
| CORS error in the console | Frontend is on a port other than 5173; set `CORS_ORIGINS` on the backend |
| Past performance says "Not yet calculated" | Expected — the engine returns SRRI only. See issue #32 |
| `npm run typecheck` fails with ~105 errors | Pre-existing on `main`, unrelated to your change. See issue #19 |

---

## Frontend commands

Run from `frontend/`.

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `frontend/dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check via `jsconfig.json` (currently failing — issue #19) |

`dist/` is a build artifact — do not commit it.

## Backend commands

Run from `backend/`. Full detail in [`backend/README.md`](backend/README.md).

| Command | Description |
|---------|-------------|
| `.venv/bin/python srri_engine/test_srri_engine.py` | The golden-master pack. Run before and after any engine change |
| `cd api && ../.venv/bin/uvicorn main:app --reload --port 8000` | Start the service |
| `docker build -t srri-service backend/` | Container build (runs the tests as a build step) |

---

## Deployment

The two tiers deploy to **two different platforms**. They cannot share one.

### Frontend — Vercel

A standard Vite build. In the Vercel project settings set:

- **Root Directory:** `frontend`
- **Environment variable:** `VITE_API_URL` = the deployed backend URL

`VITE_*` variables are inlined at **build** time, so changing it requires a
redeploy, not just a restart.

### Backend — Render (EU / Frankfurt), not Vercel

**The FastAPI service will not run on Vercel**, and it should not be made to.

- `pandas` (70 MB) and `numpy` (34 MB) alone are ~104 MB installed; with pydantic,
  openpyxl and FastAPI the bundle is ~130 MB against Vercel's 250 MB unzipped
  serverless limit. It might fit today and break on the next dependency bump.
- Every cold start would re-import pandas, adding seconds to a request.
- The funds are Irish and CBI-regulated, so the data must stay in an EU region —
  see `PROJECT_CONTEXT.md` §3.

Deploy `backend/` as a container to **Render, EU (Frankfurt)** using the included
`Dockerfile`, and set `CORS_ORIGINS` to the Vercel domain. Keeping it a plain
container with all config in environment variables means moving to Cloud Run
later (for batch production) is a deployment change, not a rewrite.

---

## Project documentation

- [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) — architecture, decisions, open questions. Read this first.
- [`AGENTS.md`](AGENTS.md) — working rules and key files.
- [`backend/README.md`](backend/README.md) — engine, API contract, endpoints.
