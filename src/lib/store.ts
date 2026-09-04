/**
 * Client-side persistence: a local cache in localStorage plus an optional
 * cloud copy behind /api/state. The whole thing is one small document;
 * the newer `updatedAt` wins.
 */
import type { Problem } from "./data";
import type { DevNodeDef } from "./data-dev";
import { PROBLEMS_KEY, STORAGE_KEY, loadCustomProblems, loadRedoLog, type RedoLog } from "./schedule";

export interface BrainState {
  redos: RedoLog;
  problems: Problem[];
  /** Dev-journey nodes added in the app (seed nodes live in data-dev.ts). */
  devNodes: DevNodeDef[];
  updatedAt: number;
}

export type SyncStatus =
  | "booting" // first load, not yet asked the server
  | "off" // no database configured on the server — local only
  | "syncing"
  | "synced"
  | "offline" // request failed; changes are safe locally and will retry
  | "dev"; // in-memory dev store (npm run dev without a database)

export const STATE_KEY = "dsa-brain:state:v1";

export function loadLocal(): BrainState {
  if (typeof window === "undefined") return { redos: {}, problems: [], devNodes: [], updatedAt: 0 };
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as Partial<BrainState>;
      return {
        redos: s.redos && typeof s.redos === "object" ? s.redos : {},
        problems: Array.isArray(s.problems) ? s.problems : [],
        devNodes: Array.isArray(s.devNodes) ? s.devNodes : [],
        updatedAt: typeof s.updatedAt === "number" ? s.updatedAt : 0,
      };
    }
  } catch {
    /* fall through to migration */
  }
  // Migrate from the two pre-sync keys, if present.
  const redos = loadRedoLog();
  const problems = loadCustomProblems();
  const had = Object.keys(redos).length > 0 || problems.length > 0;
  const migrated: BrainState = { redos, problems, devNodes: [], updatedAt: had ? Date.now() : 0 };
  if (had) saveLocal(migrated);
  return migrated;
}

export function saveLocal(s: BrainState) {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(s));
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(PROBLEMS_KEY);
  } catch {
    /* quota / private mode */
  }
}

export interface RemoteInfo {
  configured: boolean;
  backend?: "redis" | "memory";
  state: BrainState | null;
}

export async function fetchRemote(): Promise<RemoteInfo> {
  const res = await fetch("/api/state", { cache: "no-store" });
  if (res.status === 503) return { configured: false, state: null };
  if (!res.ok) throw new Error(`state fetch ${res.status}`);
  return (await res.json()) as RemoteInfo;
}

export async function pushRemote(s: BrainState): Promise<{ ok: true } | { ok: false; state: BrainState } | { configured: false }> {
  const res = await fetch("/api/state", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(s),
  });
  if (res.status === 503) return { configured: false };
  if (res.status === 409) return { ok: false, state: (await res.json()).state as BrainState };
  if (!res.ok) throw new Error(`state push ${res.status}`);
  return { ok: true };
}
