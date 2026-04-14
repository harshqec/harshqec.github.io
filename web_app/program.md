# Web App Autoresearch (Speed Benchmarking)

This is an automated experiment to have the autonomous LLM do its own iterative research to optimize the page load time and canvas render latency of the Q-Matrix Interactive Lab.

## Setup

To set up a new experiment, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `speed-mar5`). The branch `autoresearch/<tag>` must not already exist — this is a fresh run.
2. **Create the branch**: `git checkout -b autoresearch/<tag>` from current master.
3. **Read the in-scope files**: The repo is small. Read these files for full context:
   - `web_app/benchmark.mjs` — the fixed evaluation script. Do not modify.
   - `web_app/ui/src/App.jsx` — the main rendering file you modify. Target React optimization, hook optimization, and SVG rendering logic.
   - `web_app/ui/src/index.css` / `App.css` - optional styling optimizations.
4. **Initialize results.tsv**: Create `results.tsv` in `web_app/` with just the header row. The baseline will be recorded after the first run.
5. **Confirm and go**: Confirm setup looks good with the user before fully detaching into autonomous mode.

## Experimentation

Each experiment revolves around tweaking the web infrastructure and React code, running the Vite build, and executing the Node Puppeteer benchmark.

**What you CAN do:**
- Modify `/web_app/ui/src/App.jsx` and its styling. Everything is fair game: React component memoization (`React.memo`), `useCallback`, state batching, CSS transforms over SVG properties, debouncing interactions, and DOM structure flattening.
- Run frontend builds: `cd web_app/ui && npm run build`

**What you CANNOT do:**
- Modify `/web_app/benchmark.mjs`. It is read-only. That is the objective ground truth metric.
- Install new heavy dependencies that ruin artifact size. You can only use what's already in `package.json` unless it's a known microscopic optimization utility.
- Cheat the benchmark by skipping required node rendering or functionally breaking the Interactive Lab tools.

**The goal is simple: get the lowest Average SVG Node Render Time and the lowest Page Load Time.** 

**Simplicity criterion**: All else being equal, simpler is better. A 0.01ms improvement that makes `App.jsx` entirely unreadable is not worth it. 

**The first run**: Your very first run should always be to establish the baseline: build the baseline UI, run `node benchmark.mjs`, log it, and use it as your anchor.

## Output format

When you run the benchmark, it prints your metrics:

```
✅ UI Initial Page Load Time: X.XX ms
✅ Average SVG Node Render Time: Y.YY ms
```

Extract the "Average SVG Node Render Time" and "UI Initial Page Load Time" from the log cleanly.

## Logging results

When an experiment is done, log it to `web_app/results.tsv` (tab-separated, NOT comma-separated — commas break in descriptions).

The TSV must have a header row and 5 columns:

```
commit	page_load_ms	render_latency_ms	status	description
```

1. git commit hash (short, 7 chars)
2. page_load_ms achieved (e.g. 1096.96)
3. render_latency_ms achieved (e.g. 3.82)
4. status: `keep`, `discard`, or `crash`
5. short text description of what this experiment tried

Example:
```
commit	page_load_ms	render_latency_ms	status	description
a1b2c3d	1096.96	3.82	keep	baseline
b2c3d4e	1080.00	1.90	keep	use React.memo for SVG nodes
c3d4e5f	1105.00	4.50	discard	debounced state hook
```

## The experiment loop

LOOP FOREVER:

1. Look at the git state: the current branch/commit we're on
2. Tune `App.jsx` with a new experimental speed optimization.
3. Build the frontend: `cd web_app/ui && npm run build`
4. git commit
5. Run the experiment: `cd web_app && node benchmark.mjs > run.log 2>&1` (redirect everything — do NOT use tee)
6. Read out the results: grep for the times in `run.log`. If errors occurred, read `run.log`.
7. Record the results in `web_app/results.tsv` (NOTE: do not commit the results.tsv file, leave it untracked by git)
8. If render_latency_ms or page_load_ms improved significantly (lower), you "advance" the branch, keeping the git commit.
9. If performance is equal or worse, you inherently `git reset --hard HEAD~1` to instantly revert back to where you started.

**Crashes**: If a run crashes or breaks the layout, use your judgment. Fix typos quickly, but if the React optimization is fundamentally broken, just skip it, log "crash" as the status in the tsv, and move on.

**NEVER STOP**: Once the experiment loop has begun (after the initial setup), do NOT pause to ask the human if you should continue. Do NOT ask "should I keep going?" or "is this a good stopping point?". The human might be asleep, or gone from a computer. You are completely autonomous. Iterate and rewrite the React codebase completely independently to hunt for speed. The loop runs until the human explicitly interrupts you, period.