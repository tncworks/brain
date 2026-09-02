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

## Where your logs live

Everything you do in the app (logged problems, redo clicks) is one small JSON document:

- **Local cache** — `localStorage` key `dsa-brain:state:v1`, always written first, so the app works offline.
- **Cloud copy** — behind `/api/state` in Upstash Redis when a database is connected. Every change is pushed after ~350 ms; every time a tab is opened or focused it pulls. The copy with the newer `updatedAt` wins, so your phone and laptop stay in step.

The wordmark shows the state: **synced**, **saving**, **offline** (changes kept locally, retried on reconnect), or **local** (no database connected).

### Connecting the database (one-time, ~2 minutes)

1. Vercel dashboard → your project → **Storage** tab → **Create Database** → **Upstash** → **Redis** → Free plan.
2. Connect it to this project (all environments). Vercel injects `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_*`); both are supported.
3. **Redeploy** once so the new env vars take effect.

The state route sits behind the same password cookie as the rest of the site. `npm run dev` without a database uses an in-memory store so the sync path still runs locally.

To bake a logged problem into the repo, open its card and click **Copy for data.ts**.

## Redo nag mails

While anything is due, `/api/nag` mails one random due problem with a cat and a roast. A GitHub Actions cron (`.github/workflows/nag.yml`) pokes it every 3 hours; the endpoint refuses to send inside quiet hours (`NAG_QUIET_HOURS`, default 0–7 IST) or within 2 hours of the last mail, so retries never double-send.

Setup:

1. Gmail app password for the sending account: Google Account → Security → 2-Step Verification → App passwords.
2. Vercel → Settings → Environment Variables: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `NAG_TO`, `CRON_SECRET` (any long random string), optional `NAG_TZ`, `NAG_QUIET_HOURS`. Redeploy.
3. GitHub → repo → Settings → Secrets and variables → Actions → new secret `CRON_SECRET` with the same value.
4. Actions tab → **redo nag** → Run workflow to test.

Preview the mail in a browser while logged in: `/api/nag?preview=1`. `/api/nag?dry=1` builds and returns the message without sending.

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
