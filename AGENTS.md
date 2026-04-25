# AGENTS.md

AI coding agent instructions for this workspace.

## Scope Map

- Root site (static): `index.html`, `style.css`, `app.js`, `quantum-bg.js`, `hero-3d.js`
- Deployed interactive app artifact: `qmatrix/`
- Source UI app (React + Vite): `web_app/ui/`
- Optional backend API (Flask): `web_app/api/`
- Separate product area with its own conventions: `ui-ux-pro-max-skill/`

Primary boundary: edit source in `web_app/ui/`, then sync build output into `qmatrix/` before deploy.

## Canonical Commands

From repository root:

- Run static website quickly:
  - `python3 -m http.server 8000`

From `web_app/ui/`:

- Install deps: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview build: `npm run preview`

From `web_app/`:

- Benchmark built UI artifact: `node benchmark.mjs`
- Combined helper (API + website): `bash run_web_app.sh`

From `web_app/api/` (optional backend setup):

- `python3 -m venv venv`
- `source venv/bin/activate`
- `pip install -r requirements.txt`
- `python3 app.py`

## Required Build-to-Deploy Sync (Do Not Skip)

After `web_app/ui` build, sync to `qmatrix`:

- `cp web_app/ui/dist/index.html qmatrix/index.html`
- `rm -f qmatrix/assets/*`
- `cp web_app/ui/dist/assets/* qmatrix/assets/`

GitHub Pages deploys the whole repository. If sync is skipped, production appears stale.

## Validation Checklist

For UI changes:

- Run lint in `web_app/ui`
- Run build in `web_app/ui`
- If behavior/performance changes, run benchmark in `web_app`
- Smoke test:
  - `/` (portfolio)
  - `/qmatrix/index.html` (integrated app)

## Safe Editing Boundaries

Avoid editing generated or environment artifacts unless explicitly requested:

- `qmatrix/assets/*` (build artifacts)
- `web_app/ui/dist/*` (build artifacts)
- `web_app/api/.venv/*` (environment files)

Treat `web_app/benchmark.mjs` as evaluator infrastructure unless task requires benchmark logic changes.

## ui-ux-pro-max-skill Conventions

When working inside `ui-ux-pro-max-skill/`, follow its existing instructions first:

- See architecture and sync rules in `ui-ux-pro-max-skill/CLAUDE.md`
- Source of truth is `ui-ux-pro-max-skill/src/ui-ux-pro-max/`
- Sync to CLI assets before publishing:
  - `src/ui-ux-pro-max/data/* -> cli/assets/data/`
  - `src/ui-ux-pro-max/scripts/* -> cli/assets/scripts/`
  - `src/ui-ux-pro-max/templates/* -> cli/assets/templates/`

## Linked Documentation

- Repo overview and qmatrix sync workflow: `README.md`
- UI app details: `web_app/ui/README.md`
- UI/UX Pro Max project details: `ui-ux-pro-max-skill/README.md`
- Data/scripts/templates relationship: `ui-ux-pro-max-skill/docs/三个 data-scripts-templates 的区别.md`
