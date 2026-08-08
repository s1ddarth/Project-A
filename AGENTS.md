# AGENTS.md

## Project Context

This is a monorepo for a regulatory document SaaS that generates UCITS KIID fund
disclosure documents.

- **`frontend/`** — Vite + React app. No Base44 SDK, no backend dependency yet, plain npm.
- **`backend/`** — FastAPI service (NAV validation, SRRI). **Not implemented yet.**

**Read `PROJECT_CONTEXT.md` first.** It is the handover document and the source of
truth for architecture and decisions. This file is the short operational version.

Treat this as user-owned application code, keep changes focused on the request, and
preserve existing conventions.

## Rules that must not be broken

These are regulatory, not stylistic. See `PROJECT_CONTEXT.md` §2.

1. **No regulatory maths in the frontend. Ever.** SRRI, volatility, risk classification
   and the CESR Box 3 buffer live in the Python service (`backend/`). Do not compute them
   in JavaScript, do not port them "just for the demo", do not inline a lookup table of
   the SRRI bands. This is the rule that gets broken most often.
2. **One render path.** The on-screen preview and the exported PDF come from the same
   markup through the same renderer. Any change that lets them drift is a bug.
3. **The preview is the document.** A UCITS KIID must fit exactly 2 pages. Pagination
   and overflow are real constraints, not cosmetic.
4. **Computed numbers are never typed.** Calculated figures reach the document only
   through placeholders (`##SRRI##`, `##SRRI_LABEL##`) filled by the engine. No
   free-text field may contain a risk number.
5. **Published documents must be reproducible** — inputs, engine version and
   conventions version stored alongside the output.

## Do not reintroduce

Deliberately deleted. Re-adding any of these undoes a decision, it does not fix a gap:

- **`html2canvas` and `jspdf`** (and `generatePdf.js`) — screenshot-and-slice PDF
  export. It cut mid-paragraph, produced image-only PDFs with no selectable text, and
  could not honour a fixed page count. Printing is CSS paged media now. The missing
  one-click download returns when the Python service renders server-side — not by
  bringing jsPDF back.
- **LaTeX** (`renderTex.js`, `EPIC_KIID.tex.hbs`, `handlebars`) — a second template
  system. Gone.

## Architecture boundary

| Lives in `frontend/` (React) | Lives in `backend/` (Python, **empty for now**) |
|---|---|
| Wizard, editor, live preview, form state | NAV parsing, frequency detection |
| Rendering and page-fit | Validation findings and severities |
| Displaying findings and computed values | SRRI: volatility, classification, Box 3 buffer |

Deciding line: **if a regulator could ask "how did you get this number", it lives in
Python.**

## Current state

- **No auth.** `App.jsx` routes `/` straight to `KiidWorkflow`. Deliberate, for the demo.
- **No API wiring.** No `fetch`, no `axios`, no `VITE_` environment variables anywhere
  in `frontend/src/`.
- **Validation findings and the SRRI are stubbed** in
  `frontend/src/pages/KiidWorkflow.jsx` (see `HEADER_FINDINGS_BY_DEMO`,
  `NAV_FINDINGS_BY_DEMO`, `STUB_SRRI`). The `{ id, severity, code, message }` shape is
  the de facto contract with the future service — keep it stable, and prefer extending
  it over reshaping it.
- **Sample fund:** EPIC Financial Trends, ISIN `IE00BDBB9Q16`, SRRI 4.

## Key files

Paths are under `frontend/` unless noted.

- `src/pages/KiidWorkflow.jsx` — the wizard shell. Four steps: Product → Production →
  Validation → Editor. Owns document state and the stubbed findings.
- `src/pages/KiidEditor.jsx` — split-screen editor / preview. Rendered at `step === 3`
  from `KiidWorkflow`, **not** via a route.
- `src/components/kiid/KiidPreview.jsx` + `kiid-document.css` — the document itself.
  HTML + CSS only.
- `src/lib/printKiid.js` — **fragile, read it before touching print.** Clones the
  preview into an off-screen iframe and prints that, to avoid Firefox/WebKit bugs where
  nested flex + `overflow:auto` clip or drop sections. Contains a separate Safari CSS
  branch. Verify print output in Chrome, Firefox *and* Safari after any change here or
  to the document CSS.
- `src/index.css` — `@page` rules from ~line 111; fallback path for browser Cmd+P.
- `src/lib/kiidData.js` — `defaultData` + `sampleData`.
- `vite.config.js` — `@` → `src` path alias.

## Working notes

- **Node 22+ required** (Vite 6). Node 18 and 21 will not do.
- Frontend: `cd frontend && npm run dev`.
- Document state persists in `localStorage` under `kiid-editor-state-v1`. Clear it if
  the editor loads stale data after a schema change.
- Before finishing frontend code changes, from `frontend/` run `npm run lint`,
  `npm run typecheck` and `npm run build`.
- `dist/` is a Vite build artifact (under `frontend/` after build). Do not commit it.
- Vercel deploys the frontend only — set Root Directory to `frontend`. The backend
  deploys separately to Render (EU / Frankfurt).
- `react-quill@2.0.0` (in `RichTextBullets.jsx`) is unmaintained, has React 18
  `findDOMNode` issues and carries an open XSS advisory in its bundled `quill`. A swap
  to Tiptap is planned. Do not paper over it with `npm audit fix --force` — that
  downgrades to `react-quill@0.0.2`.

## Open questions — do not answer these unilaterally

`PROJECT_CONTEXT.md` §10 lists four decisions the team has not made: the minimum NAV
history conflict, the full validation condition list, the document approval/publish
states, and whether the draft API contract is accepted. If a task depends on one of
these, stop and ask.

## Branch discipline

Four developers share this repo. Work on a branch, open a PR. Do not commit to `main`.
