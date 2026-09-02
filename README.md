# DSA Brain

A force-directed knowledge graph of DSA prep. Topics and problems are neurons; membership and prerequisite edges are synapses. Redo-due problems pulse amber until you mark them redone.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```

Deploy to Vercel with zero config: import the repo, framework preset "Next.js", done. No env vars, no database. Pushes to `main` roll out automatically.

## Password gate

Every route except `/unlock` is protected by `src/middleware.ts`. The password lives in `src/lib/auth.ts` (server-only, never shipped to the browser) and can be overridden with a `DSA_BRAIN_PASSWORD` env var on Vercel. A correct entry sets a one-year httpOnly cookie; the **lock** control bottom-right clears it.

## Logging solves in the app

Hit **Log solve**, press `n`, or type a title into search and choose "Log … as a new solve". The problem appears as a node next to its topic, goes on the redo ladder immediately, and shows up in the redo tray 3 days later (then 7, 14, 30 days after each redo).

Logged problems and redo clicks live in `localStorage` (`dsa-brain:problems:v1`, `dsa-brain:redos:v1`), so they are per-browser. To make one permanent, open its card, click **Copy for data.ts**, paste the line into `problems`, and push. Delete removes it from the browser only.

## Adding data

Everything lives in `src/lib/data.ts`:

- **Topics** — `topics` array. Set `status` to `done | in-progress | next | locked`. `lobe` only seeds the initial layout.
- **Prerequisites** — `prerequisites` array of `[from, to]` topic ids.
- **Problems** — `problems` array. `topics[0]` is the primary topic; extra topics add extra edges. `redoStatus`:
  - `redone` — solved and re-solved at least once (`redoDate` = last redo)
  - `tracked` — solved, no redo yet
  - `untracked` — solved before you tracked redos; never nags until you mark it redone
  - `pending` — queued

## Redo ladder

`REDO_LADDER = [3, 7, 14, 30]` days. A problem is due when `lastTouch + ladder[redoCount]` ≤ today. Redos you log in the app are stored in `localStorage` under `dsa-brain:redos:v1` and merged on top of the data file; hard-code them into `data.ts` whenever you want them permanent.

## Controls

- Drag nodes · drag empty space to pan · scroll to zoom
- Click a node for its card · `Esc` closes (or clears filters)
- `/` or `⌘K` to search · `↑↓` `↵` to pick · `n` to log a solve
