# AGENTS.md

## Project Context

This is a standalone Vite + React KIID generator app. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup.

## Key Files

- `src/`: frontend application source.
- `src/pages/KiidWorkflow.jsx`: main multi-step KIID workflow.
- `src/pages/KiidEditor.jsx`: split-screen KIID editor / preview.
- `vite.config.js`: Vite config with `@` → `src` path alias.

## Working Notes

- Use `npm run dev` for local development.
- There is no authentication and no Base44 backend dependency.
- Document state persists in `localStorage` under `kiid-editor-state-v1`.
- Run the relevant checks from `package.json` before finishing code changes.
