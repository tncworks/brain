import { REDO_LADDER, type Problem } from "./data";

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
