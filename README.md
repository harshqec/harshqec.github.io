# Harsh Academic Website + Q-Matrix Interactive Lab

Personal academic website with an integrated quantum graph-code editor/lab (`qmatrix`) and a development workspace under `web_app`.

## Project Overview

This repository contains:

- A portfolio site served from the repository root.
- An integrated interactive app at `qmatrix/index.html` used by the website.
- A source workspace (`web_app/ui`) used to build the integrated `qmatrix` artifacts.
- An optional Flask API (`web_app/api`) for backend-based compute workflows.

## Repository Structure

- `index.html`, `style.css`, `app.js`, `quantum-bg.js`: main portfolio website.
- `images/`: website images.
- `qmatrix/`: integrated deploy-ready app used by the website.
- `web_app/ui/`: React + Vite source app.
- `web_app/api/`: Flask API and math engine.
- `web_app/run_web_app.sh`: helper script to run API + static site locally.

## Local Run Options

### Option 1: Run the full website quickly

From repository root:

```bash
python3 -m http.server 8000
```

Open:

- `http://127.0.0.1:8000/`
- `http://127.0.0.1:8000/qmatrix/index.html`

### Option 2: Run helper script (API + site)

From `web_app`:

```bash
bash run_web_app.sh
```

This starts:

- Flask API at `http://127.0.0.1:5000`
- Static site at `http://127.0.0.1:8000`

## UI Development Workflow (React Source)

From `web_app/ui`:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Build output goes to:

- `web_app/ui/dist/index.html`
- `web_app/ui/dist/assets/*`

## Important: Sync Build Into Integrated qmatrix

The live website uses `qmatrix/`, not `web_app/ui/dist/` directly.
After `npm run build`, sync artifacts:

```bash
cp web_app/ui/dist/index.html qmatrix/index.html
rm -f qmatrix/assets/*
cp web_app/ui/dist/assets/* qmatrix/assets/
```

Then commit both source and synced artifacts.

## API Setup (Optional)

From `web_app/api`:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

## Deployment Notes

- Repository is connected to GitHub Pages.
- Pushes to `main` trigger deployment workflow.
- If changes are not visible immediately, hard refresh browser (`Ctrl+Shift+R`) after GitHub Pages finishes deployment.

## Common Pitfall

If the source app was updated but website app looks old, it usually means `qmatrix/` was not synced with `web_app/ui/dist/` before commit.
