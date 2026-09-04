import type { SimulationLinkDatum, SimulationNodeDatum } from "d3-force";
import { prerequisites, topics, type Difficulty, type Problem, type Topic, type TopicId } from "./data";
import type { DerivedProblem } from "./schedule";

/* ── Visual vocabulary ─────────────────────────────────────────────────── */

export type VisualStatus = "done" | "due" | "progress" | "next" | "locked" | "pending";

export const STATUS_COLOR: Record<VisualStatus, string> = {
  done: "#7fd9a6",
  due: "#f5b53f",
  progress: "#6ea6ff",
  next: "#6ea6ff",
  locked: "#5a6070",
  pending: "#8b95b0",
};

export const STATUS_LABEL: Record<VisualStatus, string> = {
  done: "Done",
  due: "Redo due",
  progress: "In progress",
  next: "Up next",
  locked: "Locked",
  pending: "Queued",
};

export const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy: "#5eead4",
  medium: "#c9a7ff",
  hard: "#fb7185",
};

export function topicVisualStatus(t: Topic): VisualStatus {
  switch (t.status) {
    case "done":
      return "done";
    case "in-progress":
      return "progress";
    case "next":
      return "next";
    default:
      return "locked";
  }
}

export function problemVisualStatus(p: DerivedProblem): VisualStatus {
  if (p.state === "pending") return "pending";
  if (p.state === "due") return "due";
  return "done";
}

/* ── Graph structure ───────────────────────────────────────────────────── */

export type BrainId = "dsa" | "dev";
export type NodeKind = "topic" | "problem" | "identity" | "hub" | "item" | "skill" | "learning";

export interface GNode extends SimulationNodeDatum {
  id: string;
  brain: BrainId;
  kind: NodeKind;
  label: string;
  emoji?: string;
  r: number;
  /** Per-node phase so ambient motion and pulses are desynchronised. */
  phase: number;
  /** DSA only */
  topicId?: TopicId;
  lobe?: Topic["lobe"];
  /** Dev only */
  group?: string;
  crown?: boolean;
  orbit?: boolean;
}

export interface GLink extends SimulationLinkDatum<GNode> {
  kind: "member" | "prereq" | "tree" | "skill" | "learning";
  source: GNode;
  target: GNode;
}

export interface Graph {
  nodes: GNode[];
  links: GLink[];
  byId: Map<string, GNode>;
  neighbors: Map<string, Set<string>>;
}

export const topicById = new Map(topics.map((t) => [t.id, t]));

export function groupByTopic(problems: Problem[]): Map<TopicId, string[]> {
  const m = new Map<TopicId, string[]>();
  for (const t of topics) m.set(t.id, []);
  for (const p of problems) for (const t of p.topics) m.get(t)?.push(p.id);
  return m;
}

export function topicRadius(count: number) {
  return 15 + Math.sqrt(count) * 5.5;
}

export function problemRadius(d: Difficulty) {
  return d === "hard" ? 8 : d === "medium" ? 7 : 6;
}

const LOBE_ANGLE: Record<Topic["lobe"], number> = {
  foundations: -2.2,
  linear: -0.6,
  search: 0.6,
  graphs: 1.9,
  recursion: 3.3,
};

/** Tiny deterministic PRNG so every build lays the brain out the same way. */
function seeded(s: number) {
  const x = Math.sin(s * 9999.1) * 10000;
  return x - Math.floor(x);
}

function hashId(id: string) {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 10007;
}

export function buildGraph(problems: Problem[]): Graph {
  const nodes: GNode[] = [];
  const byId = new Map<string, GNode>();
  const byTopic = groupByTopic(problems);

  topics.forEach((t, i) => {
    const count = byTopic.get(t.id)!.length;
    const a = LOBE_ANGLE[t.lobe] + (seeded(i) - 0.5) * 0.9;
    const d = 180 + seeded(i + 100) * 120;
    const n: GNode = {
      id: t.id,
      brain: "dsa",
      kind: "topic",
      label: t.short,
      r: topicRadius(count),
      phase: seeded(i + 7) * Math.PI * 2,
      topicId: t.id,
      lobe: t.lobe,
      x: Math.cos(a) * d,
      y: Math.sin(a) * d,
    };
    nodes.push(n);
    byId.set(n.id, n);
  });

  for (const p of problems) {
    const parent = byId.get(p.topics[0]);
    if (!parent) continue;
    const h = hashId(p.id);
    const a = seeded(h) * Math.PI * 2;
    const n: GNode = {
      id: p.id,
      brain: "dsa",
      kind: "problem",
      label: p.lc ? `LC ${p.lc}` : p.title,
      r: problemRadius(p.difficulty),
      phase: seeded(h + 900) * Math.PI * 2,
      topicId: p.topics[0],
      lobe: parent.lobe,
      x: (parent.x ?? 0) + Math.cos(a) * 60,
      y: (parent.y ?? 0) + Math.sin(a) * 60,
    };
    nodes.push(n);
    byId.set(n.id, n);
  }

  const links: GLink[] = [];
  for (const p of problems) {
    const target = byId.get(p.id);
    if (!target) continue;
    for (const t of p.topics) {
      const source = byId.get(t);
      if (source) links.push({ kind: "member", source, target });
    }
  }
  for (const [from, to] of prerequisites) {
    links.push({ kind: "prereq", source: byId.get(from)!, target: byId.get(to)! });
  }

  const neighbors = new Map<string, Set<string>>();
  for (const n of nodes) neighbors.set(n.id, new Set());
  for (const l of links) {
    neighbors.get(l.source.id)!.add(l.target.id);
    neighbors.get(l.target.id)!.add(l.source.id);
  }

  return { nodes, links, byId, neighbors };
}

/* ── Fuzzy search ──────────────────────────────────────────────────────── */

export interface SearchDoc {
  id: string;
  kind: "topic" | "problem" | "dev";
  primary: string;
  secondary: string;
  haystack: string;
}

export function buildSearchDocs(problems: Problem[]): SearchDoc[] {
  return [
    ...topics.map<SearchDoc>((t) => ({
      id: t.id,
      kind: "topic",
      primary: t.name,
      secondary: "Topic",
      haystack: `${t.name} ${t.short} ${t.id.replace(/-/g, " ")}`.toLowerCase(),
    })),
    ...problems.map<SearchDoc>((p) => ({
      id: p.id,
      kind: "problem",
      primary: p.lc ? `LC ${p.lc} · ${p.title}` : p.title,
      secondary: p.topics.map((t) => topicById.get(t)?.short ?? t).join(", "),
      haystack: `${p.lc ?? ""} lc${p.lc ?? ""} ${p.title} ${p.topics.join(" ")}`.toLowerCase(),
    })),
  ];
}

/** Subsequence match with bonuses for word starts and consecutive runs. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.toLowerCase().replace(/\s+/g, "");
  if (!q) return 0;
  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let i = 0; i < text.length && qi < q.length; i++) {
    if (text[i] === q[qi]) {
      const wordStart = i === 0 || /[\s\-·/]/.test(text[i - 1]);
      score += 10 + streak * 6 + (wordStart ? 12 : 0);
      streak++;
      qi++;
    } else {
      streak = 0;
    }
  }
  if (qi < q.length) return -Infinity;
  if (text.includes(q)) score += 40;
  return score - text.length * 0.05;
}

export function search(query: string, docs: SearchDoc[], limit = 6): SearchDoc[] {
  if (!query.trim()) return [];
  return docs
    .map((d) => {
      // A hit in the visible title outranks a hit in the tags; topics outrank problems on ties.
      const title = fuzzyScore(query, d.primary.toLowerCase());
      const tags = fuzzyScore(query, d.haystack);
      const s = Math.max(title > -Infinity ? title + 30 : -Infinity, tags) + (d.kind === "topic" ? 12 : 0);
      return { d, s };
    })
    .filter((x) => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.d);
}
