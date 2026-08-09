# Project Context — Regulatory Document SaaS

**Handover document for a fresh Claude Code session.**
Last updated: 9 August 2026. Repo: `github.com/s1ddarth/Project-A`

Read this first, then the companion documents listed in §11. This file records both the
current state of the code and the decisions already made, including several corrections
to earlier assumptions. Where something is unresolved it is flagged explicitly in §10 —
do not silently pick an answer to those. Decisions taken since handover are in §14.

---

## 1. What we are building

A web product that replaces the Excel-and-Word process behind fund disclosure documents.
A user logs in, fills in structured fund data, writes narrative sections in a form,
uploads one NAV time-series file, and downloads a finished, regulation-compliant PDF.

Three product lines, **built as one wizard driven by three configurations — not three
applications**. A document type is a field schema + a template + an engine method.

| Product line | Computed output | Format | Engine status |
|---|---|---|---|
| **UCITS KIID** — the MVP | SRRI 1–7 (CESR volatility, Box 3 buffer) | 2 pages, fixed | Built (weekly + monthly calculators) |
| PRIIPs KID | SRI 1–7, performance scenarios, cost/RIY tables | 3 pages, fixed | Built and reconciled (`priips_engine.py`) |
| Factsheet | Performance, risk stats, allocations | Flexible, 2–4 pages | Not started |

**Current scope is UCITS KIID only, for a demo.** PRIIPs and factsheets come later and
must not influence the code you write now beyond keeping the config-driven shape intact.

## 2. Rules that must not be broken

These come from the developer primer and are non-negotiable:

1. **One render path.** The on-screen preview and the exported PDF come from the same
   template through the same renderer. If they can drift, they will, and a client will
   find the drift before we do.
2. **The preview is the document, not a summary of it.** A UCITS KIID is legally
   required to fit exactly 2 pages. The editor must show real pagination and flag
   overflow live.
3. **Computed numbers are never typed.** Every calculated figure enters through a
   placeholder filled by the engine. No free-text field may ever contain a risk number.
4. **The engine is imported, never reimplemented.** No maths in the frontend. No second
   copy in JavaScript. It is wrapped as a service behind a stable contract.
5. **Every published document is reproducible.** Store inputs, engine version and
   conventions version alongside the output so any figure can be re-derived on demand by
   a client, an auditor or a regulator.

## 3. Architecture

Three tiers in **one monorepo**:

- **`frontend/`** — React + Vite. Auth, wizard, editor, live preview. Holds *no*
  regulatory logic whatsoever.
- **`backend/`** — FastAPI. NAV parsing, validation, SRRI. Owns everything that must be
  reproducible and auditable. **Not implemented yet** (placeholder README only).
- **Storage** — NAV files and generated PDFs. Not needed for the demo; the demo path
  can accept an upload, validate, calculate, return, and discard.

Deciding line: **if a regulator could ever ask "how did you get this number", it lives
in Python.**

### Hosting decisions

- **Frontend** — Vercel or Netlify. Standard Vite build from `frontend/`
  (`npm run build` → `frontend/dist/`). Set the Vercel **Root Directory** to
  `frontend`. Free tier is sufficient. Do not commit `dist/`.
- **Python service** — Render, cheapest tier, **EU region (Frankfurt)**. Point the
  service at `backend/`. The funds are Irish and CBI-regulated; do not put data in a
  US region. Do **not** host the backend on Vercel.
- Keep the Python service as a plain Docker container with all config in environment
  variables, so moving to Cloud Run later (for batch runs) is a deployment change and
  not a rewrite.
- Running the backend on a laptop with an ngrok/Cloudflare tunnel is acceptable for the
  dev loop but **not** for anything shown to another person.

**Cost note:** because PDF generation currently runs in the *browser's* print engine,
the backend does not need headless Chromium yet. That was the expensive part. A service
doing only validation + SRRI runs comfortably on a small instance. The larger instance
becomes necessary only when server-side rendering returns for batch production.

## 4. Current state of this repo

`github.com/s1ddarth/Project-A`. Layout is a simple monorepo:

```
frontend/     Vite + React app (the working product today)
backend/      FastAPI placeholder (README only; service not built yet)
```

**This repo is detached from Base44.** There is no `@base44/sdk` dependency, no
`base44/` config directory, and no SDK imports anywhere in `frontend/src/`. That is why
it runs on plain npm. It is a copy, *not* a two-way sync — the Base44 app
(`6a7117d6f7d596d1fdf47ee4`) still exists and has diverged. **Treat this repo as the
source of truth and do not attempt to sync back to Base44.**

Notable frontend structure (`frontend/`):

```
src/
  App.jsx                          single route "/" -> KiidWorkflow ("*" -> PageNotFound)
  index.css                        @page rules from line 111
  pages/
    KiidWorkflow.jsx               the wizard shell; owns state + stubbed findings
    KiidEditor.jsx                 split editor/preview; printKiid() at line 91
  components/
    kiid/
      KiidForm.jsx                 master data + narrative inputs
      HeaderForm.jsx               fund identification fields
      KiidPreview.jsx              the document itself
      SrriScale.jsx                1-7 coloured risk scale
      PerformanceChart.jsx         past performance bar chart (recharts)
      PerformanceEditor.jsx        past performance data entry
      RichTextBullets.jsx          rich-text narrative input (react-quill)
      kiid-document.css            document styling
    workflow/
      WorkflowStepper.jsx          step indicator
      ProductPicker.jsx            step 0 - document type
      ProductionMode.jsx           step 1 - single vs batch
      ValidationStep.jsx           step 2 - NAV upload + validation (stubbed)
      ValidationResults.jsx        renders a findings list by severity
    ui/                            shadcn components (many unused)
    ScrollToTop.jsx
  lib/
    kiidData.js                    defaultData + sampleData (EPIC Funds p.l.c.)
    printKiid.js                   off-screen iframe print path (fragile, see §5)
    query-client.js                react-query client
    PageNotFound.jsx
    utils.js
  hooks/                           use-mobile, use-size
  utils/index.ts
```

**There is no auth.** No login or register pages; `App.jsx` routes `/` straight to the
wizard. This was a deliberate decision for the demo.

**The wizard is four steps, not three:** Product -> Production -> Validation -> Editor.
The editor is not a route — `KiidWorkflow` renders `KiidEditor` directly at `step === 3`
so it can take over the full screen with its own header.

**There is no API wiring.** No `fetch`, no `axios`, no `VITE_` environment variables
anywhere in `frontend/src/`. All validation findings and the SRRI value are stubbed
inside components. The Python integration is entirely greenfield.

**Sample fund:** EPIC Financial Trends, EPIC Funds p.l.c., ISIN `IE00BDBB9Q16`
(checksum verified valid), SRRI 4.

## 5. What has already been done and why

**PDF generation was rewritten.** The original approach (`generatePdf.js`) screenshotted
the preview with html2canvas and sliced the resulting image at fixed A4 intervals with
jsPDF. That slicing is blind to content — it cut mid-paragraph and mid-table, padded the
final page with white space, and produced an image-only PDF with no selectable text. It
could not respect a fixed page count, which is a regulatory requirement.

It was replaced with **CSS paged media** — `@page` rules plus the browser's native print
engine. `generatePdf.js`, `html2canvas` and `jspdf` were deleted.
The known trade-off is that the user gets a print dialog rather than an instant
download; this is accepted for now.

Printing no longer calls `window.print()` on the page directly.
`frontend/src/lib/printKiid.js` clones the preview into an off-screen iframe and prints
that, because nested flex + `overflow:auto` shells caused Firefox and WebKit to clip or
drop sections. It carries a separate Safari CSS branch. **This is the most fragile file
in the repo** — changes to it or to the document CSS must be verified in Chrome, Firefox
and Safari. The one-click download returns when the Python service renders the same HTML
server-side with Playwright, which is also what satisfies rule 1 (one render path).

**The LaTeX path was deleted.** `renderTex.js`, `EPIC_KIID.tex.hbs` and `handlebars` are
gone and are not coming back. Do not reintroduce a second template system.

## 6. The SRRI engine

Two Python scripts exist (attached, see §11). They are correct but are written as
command-line tools and need to become an importable library. **The maths must not
change** — `cesr_weekly_volatility`, `classify_srri`, `apply_buffer_zone`, `SRRI_BANDS`
and `RISK_LABELS` are the regulated parts and are believed right.

Required changes, in the order they matter:

1. **Merge the two scripts.** They are ~85% identical; the only real differences are
   `m` (52 vs 12), `T` (260 vs 60) and the resample rule (`W-FRI` vs month-end). Make
   frequency a parameter. Currently a fix to the Box 3 buffer logic must be applied
   twice, which is how regulatory bugs happen.
2. **`read()` takes a filepath.** It must accept bytes or a file object; a server never
   has the file on disk.
3. **`run()` ends in `wb.save()`.** The core must return a structured result —
   annualised volatility, raw SRRI, disclosed SRRI, the series, status. Excel export
   becomes a separate optional function called on that result.
4. **Keep the workbook.** The Summary / Calculations / Distribution / Methodology sheets
   are a genuine audit artifact and should be attached to each document as evidence.
   They just stop being the return value.
5. **Extract validation from `read()`.** Data-quality checks must become their own step
   returning a list of findings, each with a severity, so the UI can render them.
6. **Remove `argparse` from the core.** A CLI may remain as a thin wrapper.
7. **Every `log.warning()` becomes a returned value.** The browser cannot read a
   terminal; "only 3.2 years of data" must reach the user as a finding.
8. **Two defects:**
   - `pd.to_datetime(..., dayfirst=True)` is hardcoded, so `03/04/2024` silently parses
     as 3 April. A US-formatted upload would produce a wrong SRRI with no warning. Date
     format must be an explicit input.
   - `--min-weeks` allows generating an SRRI on under 5 years of data. In a multi-user
     web app this must be an admin-only override recorded with who approved it, not a
     flag anyone can set. **Done** — the engine requires a `MinPeriodsOverride`
     carrying an approver and a reason, and the API deliberately does not expose it,
     so there is no route to a sub-5-year SRRI through the product (see §14).
9. **Return `engine_version` and a hash of the input file** so any published document
   traces back to exactly what produced it.

**Before refactoring, write golden tests** — the CESR Box 1 worked example the
Methodology sheet already cites, plus a frozen fixture per fund — so the refactor can be
proven not to move a single number.

## 7. Proposed API contract (draft, not yet agreed)

Both sides are currently building against an unspecified interface. This is the single
biggest integration risk. Proposed:

**`POST /v1/validate`** — multipart file upload plus declared header fields (ISIN,
currency, expected frequency, date format).

```json
{
  "nav_series_id": "ns_01H...",
  "file_sha256": "a3f...",
  "detected_frequency": "daily",
  "period_covered": { "from": "2019-01-04", "to": "2024-12-31" },
  "observation_count": 1566,
  "status": "warnings",
  "findings": [
    { "code": "COVERAGE_UNDER_5Y", "severity": "warning",
      "message": "4.8 years of data; CESR requires 5 years",
      "context": { "years": 4.8 } },
    { "code": "DUPLICATE_DATE", "severity": "error",
      "message": "Duplicate observation for 2022-03-14",
      "context": { "row": 812, "date": "2022-03-14" } }
  ]
}
```

**`POST /v1/calculate/srri`** — takes `nav_series_id` plus any acknowledged warnings.

```json
{
  "engine_version": "1.0.0",
  "input_sha256": "a3f...",
  "as_of": "2024-12-31",
  "annualised_volatility": 0.0873,
  "srri_raw": 4,
  "srri_disclosed": 4,
  "risk_label": "Medium Risk",
  "basis": { "frequency": "weekly", "m": 52, "T": 260, "observations_used": 260 },
  "overrides_applied": []
}
```

Design intent: `status` is a single field the UI branches on; every finding carries a
machine-readable `code` so the frontend never parses English; `context` carries row and
date so a finding can be linked to the offending row. Both `srri_raw` and
`srri_disclosed` are returned so the editor can show when the Box 3 buffer is holding a
migration back.

**Recommended next step:** scaffold a stub FastAPI service under `backend/` returning
hardcoded responses in this shape and deploy it to Render (EU), *before* the engine
refactor lands. It proves deployment, CORS, auth and frontend wiring while the engine
is still being written, and swapping the stub for the real engine is then a one-line
change.

## 8. Validation design

Two separate passes, not one combined list:

- **Header checks** — run against the form fields before the file is opened. ISIN format
  and check digit, currency consistency, required fields.
- **NAV file checks** — run against the spreadsheet. Date and price parsing, duplicate
  dates, out-of-order dates, gaps beyond frequency tolerance, mixed frequency, runs of
  identical NAV (stale pricing), non-positive values, extreme single-period moves,
  coverage length.

Every finding has a severity. **Errors block. Warnings proceed only after explicit
acknowledgement**, recorded with the user and timestamp.

A currency mismatch between the declared share class and the file should be treated as
**blocking**, not a warning — it means the user is about to generate a KIID for the
wrong share class.

## 9. Corrections to earlier assumptions

Recorded because they are easy to get wrong again:

- **Past performance is data entry, not a calculation.** The field schema spec is
  explicit on this. The Python service computes **SRRI only** for the UCITS KIID. Do not
  build a performance calculation endpoint.
- **The Base44 app is not the source of truth.** This repo is.
- **The LaTeX template is not dormant, it is deleted.** Do not resurrect it.

## 10. Open questions — do not answer these unilaterally

1. ~~**Minimum history conflict.**~~ **ANSWERED, 9 August 2026 — see §14.**
2. **The full validation condition list** was never supplied. §8 above is a proposed
   structure, not the agreed rules.
3. **Who approves and publishes a document**, and what the states are between draft and
   published.
4. **Whether the API contract in §7 is accepted.** It is a draft written by one person.

## 11. Known issues and cleanup

- **`react-quill@2.0.0` is a real risk.** It is the rich-text editor, it is unmaintained,
  and it has known React 18 `findDOMNode` issues. Rich text is core to the product, so
  this should be swapped deliberately (Tiptap is the usual target) rather than discovered
  breaking during a demo.
- **Dead dependencies to remove.** Imported by nothing: `three`, `react-leaflet`,
  `@stripe/*`, `canvas-confetti`, `@hello-pangea/dnd`, `moment`, `react-markdown`. Also
  `embla-carousel-react`, `vaul` and `input-otp`, which appear only in unused shadcn
  component files. `three` alone is several hundred KB.
- ~~**`CLAUDE.md` in this repo is a Base44 export**~~ — no longer true. `CLAUDE.md` is a
  pointer to `AGENTS.md`, which was audited against the code and rewritten on
  7 August 2026. Both now carry the §2 rules, the Python boundary and the deletions.
- **Branch discipline.** Four developers now share this repo. Work on a branch, open a PR.

## 12. Companion documents

Attach these alongside this file:

| File | What it is | Why it matters |
|---|---|---|
| `Primer_Doc_SaaS.docx` | Developer primer, v1.0 | The authoritative product vision, the five unbreakable rules, component boundaries, and the P0–P4 build sequence |
| `Field_Schema_Spec_UCITS_KIID.docx` | UCITS KIID field schema | Field-by-field spec for the wizard. Section 4 is the source of the "past performance is data entry" correction; section 5 covers history minima |
| `updated_Template_-_Copy.xlsx` | The production intake workbook | The process being replaced. Four sheets: Master Information (35×21), Questionnaire (125 rows, narrative sections), SRRI (2332 rows of calculation), Past Performance. Contains the `##SRRI##` placeholder token showing how computed values are injected into narrative text |
| `SRRI_Weekly_Calculator_Daily_to_Weekly.py` | Weekly SRRI engine | Daily NAV → weekly resample (`W-FRI`), `m=52`, `T=260` |
| `SRRI_Monthly_Calculator.py` | Monthly SRRI engine | Month-end NAV, `m=12`, `T=60`. ~85% duplicated from the weekly script |
| `NAV_daily_clean.xlsx` | Test fixture | 1,566 business days, Jan 2019 – Dec 2024. Verified 8.03% annualised volatility → **SRRI 4** on a full 260-week window |
| `NAV_monthly_clean.xlsx` | Test fixture | Same series at month-end, 72 observations. 7.26% volatility → **SRRI 4**, full 60-month window |
| `NAV_daily_dirty.xlsx` | Test fixture | Same data with six deliberate defects: duplicated date, six-week gap, run of 16 identical NAVs, a zero price, a +90% single-day jump, an out-of-order pair. Use this to exercise the validation page |

## 13. Immediate priorities

1. From `frontend/`: Node 22+ LTS, `npm install`, `npm run dev` — get the app running.
2. Confirm Vercel Root Directory is `frontend`.
3. Remove the dead dependencies (§11).
4. Agree the API contract (§7), then scaffold the stub FastAPI service under `backend/`
   and deploy it to Render (EU).
5. Land the engine refactor (§6) behind golden tests.
6. Swap the stub for the real engine.

---

## 14. Decisions taken since handover

Recorded here so a resolved question is not reopened by accident. Each supersedes
whatever the earlier sections or the spec documents say.

### 14.1 Minimum NAV history — 5 years, hard stop (9 August 2026)

**Decision.** A compliant SRRI requires **at least 5 years of NAV history,
irrespective of the frequency of the data set** — daily, weekly or monthly. Less
than 5 years is not accepted.

This supersedes:

- §10 open question 1, now closed.
- **Field Schema Spec §5**, which cites minima of daily 2 years / weekly 4 years /
  monthly 5 years. Those figures no longer apply; the spec document is stale on
  this point.

CESR Box 1 §4 governs, and both calculation bases already express the same
5-year window — weekly `T=260` at `m=52`, monthly `T=60` at `m=12`.

**Already implemented; no code change was required.** `validate()` raises a
blocking `INSUFFICIENT_HISTORY` error whenever the usable returns on the
calculation grid fall short of `T`. Verified end to end:

| History supplied | Result |
|---|---|
| 3.0 years | `blocked` — `INSUFFICIENT_HISTORY`, no SRRI produced |
| 4.5 years | `blocked` — `INSUFFICIENT_HISTORY`, no SRRI produced |
| 6.0 years | `ok` — SRRI produced |

**On the override.** The engine retains a `MinPeriodsOverride` that can relax the
window, but it cannot be constructed without a named approver and a reason. The
FastAPI service (PR #33, not yet merged) deliberately does **not** expose it, so
once that lands there is no route to a sub-5-year SRRI through the product — the
hard stop holds for every user, and the override stays reachable only from the
library and CLI.

**Open point:** whether the override should be removed from the engine outright.
"Hard stop" as stated admits no exception, but an attributable, logged override is
a different thing from a flag anyone can set. Left in place for now because
nothing user-facing can reach it.

### 14.2 Header validation lives in Python (9 August 2026)

**Decision.** ISIN check-digit validation — and header validation generally — runs
on the Python service, not in the browser. Closes §10-adjacent issue #18.

The reasoning is rule 5 rather than rule 4: validation findings are part of what
makes a published document reproducible, so they belong on the tier that carries a
version number and an audit trail. A duplicate implementation in JavaScript is the
pattern rule 4 exists to prevent, and it would drift.

Implemented in `backend/api/header_checks.py` (PR #33), covering ISO 6166 shape and
check digit, benchmark ISIN, required master-data fields, ISO 4217 currency shape,
share-class currency consistency and the Acc/Dis enum. Findings use the same wire
shape as the engine's, so the UI renders both passes through one component and keys
off `code`, never message text.

The trade-off accepted: no instant client-side feedback on a mistyped ISIN. Each
finding carries a `remediation` string to compensate — `ISIN_CHECKSUM` reports the
digit the ISIN should have ended with.

**Related judgement call.** A currency mismatch between share class and sub-fund is
a **warning**, not a blocking error. A share class denominated differently from the
fund base is normal — that is what a currency or hedged share class is, and
`is_hedged` marks it. It warns only when the classes differ *and* the class is not
hedged, because the SRRI then carries unhedged FX volatility. §8 calls currency
mismatch blocking, but that rule concerns the share class versus **the NAV file**,
and a NAV file carries no currency — so §8 as written is not implementable.
