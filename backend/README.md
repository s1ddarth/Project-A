# Backend — SRRI service

Python service owning everything that must be reproducible and auditable: NAV
parsing, validation and the SRRI calculation.

```
backend/
  srri_engine/
    srri_engine.py        the engine — CESR/10-673. Imported, never modified.
    test_srri_engine.py   88 checks, including parity against the original scripts
  api/
    main.py               FastAPI app (HTTP concerns only)
    header_checks.py      pass 1 — ISIN check digit, currencies, required fields
    models.py             wire format
    engine.py             import shim for srri_engine
```

The engine holds the regulated maths. Nothing in `api/` reimplements any of it.

## Setup

Python 3.11+ (developed on 3.12).

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

## Run the tests

Always run these before touching anything downstream — they are the golden-master
pack, and they include parity against the two original calculators.

```bash
.venv/bin/python srri_engine/test_srri_engine.py
# 88 passed, 0 failed
```

Exits non-zero on failure, so it can gate CI as-is.

## Run the service

```bash
cd backend/api
../.venv/bin/uvicorn main:app --reload --port 8000
```

- http://localhost:8000/health — liveness and engine version
- http://localhost:8000/docs — interactive API docs

## Running the whole app locally

Two terminals.

**Terminal 1 — backend:**

```bash
cd backend/api
../.venv/bin/uvicorn main:app --reload --port 8000
```

**Terminal 2 — frontend:**

```bash
cd frontend
npm install
npm run dev
```

The frontend reads the service URL from `VITE_API_URL`. Create
`frontend/.env.local`:

```
VITE_API_URL=http://localhost:8000
```

Vite only reads env files at startup, so restart `npm run dev` after creating it.

CORS already allows `http://localhost:5173`. Override with the `CORS_ORIGINS`
environment variable (comma-separated) when deploying.

## Endpoints

### `POST /v1/srri`

Runs both validation passes and, when a file is supplied, the SRRI.

| Field | Type | Notes |
|---|---|---|
| `header` | form field, JSON object | master-data fields for pass 1 |
| `frequency` | form field | `auto` (default), `weekly`, `monthly` |
| `date_format` | form field | `dmy` (default), `mdy`, `iso`, `auto` |
| `file` | file upload | **optional** — omit to run header checks alone |

`status` is the single field to branch on: `ok`, `ok_with_warnings`, `blocked`,
`no_valid_srri`, `awaiting_file`.

```bash
curl -X POST http://localhost:8000/v1/srri \
  -F 'header={"isin":"IE00BDBB9Q16","subFundName":"EPIC Financial Trends",
               "companyName":"EPIC Funds p.l.c.","shareClassFullName":"Class X USD Shares",
               "subFundBaseCurrency":"USD","shareClassBaseCurrency":"USD",
               "accDis":"Accumulating"}' \
  -F 'frequency=auto' -F 'date_format=dmy' \
  -F 'file=@NAV_daily_clean.xlsx'
```

### `POST /v1/srri/workbook`

Same multipart upload; returns the Summary / Calculations / Distribution /
Methodology / Audit workbook as an xlsx download. The response carries
`X-Engine-Version` and `X-Input-Sha256`.

Both endpoints are **stateless** — nothing is stored between calls, so a result
cannot go stale and there is no session to lose. The workbook endpoint re-accepts
the file rather than keying off a server-side id.

## Notes

- `date_format` defaults to `dmy`. The engine's own docstring flags that this
  should become a required per-upload choice before external users touch the
  uploader: a US-formatted file silently parsed as DMY produces a wrong SRRI with
  no other symptom.
- The sub-5-year window can only be relaxed through a `MinPeriodsOverride`
  carrying an approver and a reason. That is deliberately **not** exposed over
  HTTP yet — a bare `min_periods` parameter would recreate the bug the engine
  fixed.
- Past performance is **not** computed here. The engine returns SRRI only.
