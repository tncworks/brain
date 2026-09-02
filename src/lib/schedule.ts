import { REDO_LADDER, type Problem } from "./data";
import { topicById } from "./graph";

/* ── Date helpers (all in local time, ISO YYYY-MM-DD) ─────────────────── */

export function todayISO(): string {
  const d = new Date();
  return toISO(d);
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date in a named time zone — serverless runs in UTC, the user does not. */
export function todayISOInTZ(tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return todayISO();
  }
}

export function hourInTZ(tz: string): number {
  try {
    return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Whole days from a → b (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  const ms = parseISO(b).getTime() - parseISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatDate(iso: string | null, opts: { year?: boolean } = {}): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(opts.year ? { year: "numeric" } : {}),
  });
}

/* ── Derived problem state ─────────────────────────────────────────────── */

export type ProblemState = "pending" | "untracked" | "scheduled" | "due";

export interface DerivedProblem extends Problem {
  /** All redo dates (data + localStorage), sorted ascending. */
  redos: string[];
  state: ProblemState;
  /** Next scheduled redo, or null when untracked / pending. */
  nextDue: string | null;
  /** > 0 when overdue, 0 when due today, < 0 when in the future. */
  overdueDays: number;
  /** Which rung of the ladder the *next* redo sits on (0-based). */
  rung: number;
}

export function deriveProblem(p: Problem, extraRedos: string[], today: string): DerivedProblem {
  const baseRedos = p.redoStatus === "redone" && p.redoDate ? [p.redoDate] : [];
  const redos = Array.from(new Set([...baseRedos, ...extraRedos])).sort();

  if (p.redoStatus === "pending") {
    return { ...p, redos, state: "pending", nextDue: null, overdueDays: 0, rung: 0 };
  }

  const lastTouch = redos.length ? redos[redos.length - 1] : p.solvedDate;
  if (!lastTouch) {
    return { ...p, redos, state: "untracked", nextDue: null, overdueDays: 0, rung: 0 };
  }

  const rung = Math.min(redos.length, REDO_LADDER.length - 1);
  const nextDue = addDays(lastTouch, REDO_LADDER[rung]);
  const overdueDays = daysBetween(nextDue, today);
  return {
    ...p,
    redos,
    state: overdueDays >= 0 ? "due" : "scheduled",
    nextDue,
    overdueDays,
    rung,
  };
}

/* ── localStorage-backed redo log ──────────────────────────────────────── */

export const STORAGE_KEY = "dsa-brain:redos:v1";
export type RedoLog = Record<string, string[]>;

export function loadRedoLog(): RedoLog {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as RedoLog) : {};
  } catch {
    return {};
  }
}

export function saveRedoLog(log: RedoLog) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* private mode / quota — the session still works in memory */
  }
}

/* ── localStorage-backed problems logged in the app ────────────────────── */

export const PROBLEMS_KEY = "dsa-brain:problems:v1";

export function loadCustomProblems(): Problem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PROBLEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is Problem => p && typeof p.id === "string" && typeof p.title === "string" && Array.isArray(p.topics) && p.topics.length > 0)
      .map((p) => ({ ...p, custom: true, topics: p.topics.filter((t) => topicById.has(t)) }))
      .filter((p) => p.topics.length > 0);
  } catch {
    return [];
  }
}

export function saveCustomProblems(list: Problem[]) {
  try {
    window.localStorage.setItem(PROBLEMS_KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Render a problem as a line you can paste straight into `problems` in data.ts. */
export function problemToDataLine(p: Problem, redos: string[] = []): string {
  const q = (v: string | null | undefined) => (v == null ? "null" : JSON.stringify(v));
  const lastRedo = redos.length ? redos[redos.length - 1] : p.redoDate;
  const status = p.redoStatus === "pending" || p.redoStatus === "untracked" ? p.redoStatus : lastRedo ? "redone" : "tracked";
  const parts = [
    `id: ${q(p.id)}`,
    `lc: ${p.lc ?? "null"}`,
    `title: ${q(p.title)}`,
    ...(p.slug ? [`slug: ${q(p.slug)}`] : []),
    `difficulty: ${q(p.difficulty)}`,
    `topics: [${p.topics.map((t) => q(t)).join(", ")}]`,
    `solvedDate: ${q(p.solvedDate)}`,
    `redoDate: ${q(lastRedo)}`,
    `redoStatus: ${q(status)}`,
    ...(p.note ? [`note: ${q(p.note)}`] : []),
  ];
  return `  { ${parts.join(", ")} },`;
}
