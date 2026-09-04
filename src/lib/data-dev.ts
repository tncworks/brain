/**
 * Developer Journey brain — the fun one. Append freely.
 *
 * kind:   identity (the core) · hub (a cluster) · item (a thing you did) ·
 *         skill (orbits the identity) · learning (dim, dashed, next up)
 * parent: which node this hangs off. Skills have no parent — they orbit.
 * skills: skill ids this item uses; drawn as faint constellation lines on hover.
 */

export type DevKind = "identity" | "hub" | "item" | "skill" | "learning";
export type DevGroup = "identity" | "oss" | "projects" | "community" | "skills" | "learning";

export interface DevNodeDef {
  id: string;
  kind: DevKind;
  group: DevGroup;
  label: string;
  emoji: string;
  parent?: string;
  blurb?: string;
  /** One-line context: role, event, year… */
  meta?: string;
  url?: string;
  skills?: string[];
  /** Crown jewel — gets the big glow. */
  crown?: boolean;
  status?: "live" | "shipped" | "wip";
}

export const DEV_GROUP_COLOR: Record<DevGroup, string> = {
  identity: "#ffd166",
  oss: "#ff5fa2",
  projects: "#ff9f43",
  community: "#ff7b7b",
  skills: "#f9c784",
  learning: "#a3948a",
};

export const DEV_GROUP_LABEL: Record<DevGroup, string> = {
  identity: "Core",
  oss: "Open source",
  projects: "Project",
  community: "Community",
  skills: "Skill",
  learning: "Learning next",
};

export const devNodes: DevNodeDef[] = [
  // ── Core ────────────────────────────────────────────────────────────
  {
    id: "ayush",
    kind: "identity",
    group: "identity",
    label: "Ayush",
    emoji: "🧑‍💻",
    meta: "backend / systems dev · CS undergrad @ NIT Hamirpur '28",
    blurb: "Builds the boring-but-critical stuff: auth, serialization, daemons, servers that stay up. Ships in Go, thinks in systems.",
    url: "https://github.com/ayush00git",
  },

  // ── Open source ─────────────────────────────────────────────────────
  { id: "oss", kind: "hub", group: "oss", label: "Open Source", emoji: "🌍", parent: "ayush", blurb: "Code that other people run." },
  {
    id: "fory",
    kind: "item",
    group: "oss",
    label: "Apache Fory",
    emoji: "🔥",
    parent: "oss",
    crown: true,
    status: "live",
    meta: "Committer · Apache Software Foundation",
    blurb: "Blazing-fast multi-language serialization framework. Landed gRPC codegen, guardrails, and stream deserialization. The crown jewel.",
    url: "https://github.com/apache/fory",
    skills: ["go", "grpc", "python"],
  },
  {
    id: "claude-grant",
    kind: "item",
    group: "oss",
    label: "Claude for Open Source",
    emoji: "🎁",
    parent: "oss",
    status: "live",
    meta: "Grant recipient · 6-month Max via ASF",
    blurb: "Anthropic's open-source grant, routed through the ASF. Basically an AI pair-programmer on retainer.",
  },

  // ── Projects ────────────────────────────────────────────────────────
  { id: "projects", kind: "hub", group: "projects", label: "Projects", emoji: "🛠️", parent: "ayush", blurb: "Things that exist because of a weekend." },
  {
    id: "goth",
    kind: "item",
    group: "projects",
    label: "Goth",
    emoji: "🔐",
    parent: "projects",
    status: "shipped",
    meta: "Go auth microservice",
    blurb: "Production-grade authentication service in Go, speaking Fory over gRPC. Sessions, tokens, the works.",
    skills: ["go", "grpc", "gin", "postgres", "docker"],
  },
  {
    id: "protpocket",
    kind: "item",
    group: "projects",
    label: "ProtPocket",
    emoji: "🧬",
    parent: "projects",
    status: "live",
    meta: "HackMol 7.0",
    blurb: "Browser-native drug discovery on AlphaFold data. Along the way, found an undocumented AlphaFold complex API parameter.",
    url: "https://protpocket.ayushz.me",
    skills: ["ts", "node", "python"],
  },
  {
    id: "cortex",
    kind: "item",
    group: "projects",
    label: "Cortex",
    emoji: "🧠",
    parent: "projects",
    status: "shipped",
    meta: "MCP server · company brain",
    blurb: "Ingests GitHub issues and PRs, indexes docs, and answers AI agents' questions about the codebase.",
    skills: ["ts", "mcp", "node"],
  },
  {
    id: "wisp",
    kind: "item",
    group: "projects",
    label: "Wisp",
    emoji: "👻",
    parent: "projects",
    status: "shipped",
    meta: "Go daemon",
    blurb: "Global keystroke capture via evdev; Claude answers appear in an overlay right at the caret. Spooky-fast.",
    skills: ["go", "linux"],
  },
  {
    id: "cms-web",
    kind: "item",
    group: "projects",
    label: "CMS-Web",
    emoji: "📋",
    parent: "projects",
    status: "shipped",
    meta: "NIT Hamirpur Estate Office",
    blurb: "Complaint management system for the campus estate office. Migrated to Go / Gin / MongoDB.",
    skills: ["go", "gin", "mongodb", "nginx"],
  },
  {
    id: "raft",
    kind: "item",
    group: "projects",
    label: "Raft",
    emoji: "🗳️",
    parent: "projects",
    status: "wip",
    meta: "In progress · learning build",
    blurb: "Consensus from scratch in Go. Leader election, log replication, the whole paper, by hand.",
    skills: ["go"],
  },
  {
    id: "homeserver",
    kind: "item",
    group: "projects",
    label: "Home server",
    emoji: "🖥️",
    parent: "projects",
    status: "live",
    meta: "Ubuntu · 24/7 homelab",
    blurb: "A spare PC that refuses to die. Runs everything that shouldn't touch a laptop.",
    skills: ["linux", "docker", "nginx"],
  },

  // ── Community ───────────────────────────────────────────────────────
  { id: "community", kind: "hub", group: "community", label: "Community", emoji: "🤝", parent: "ayush", blurb: "The people part." },
  {
    id: "hackonhills",
    kind: "item",
    group: "community",
    label: "HackOnHills",
    emoji: "🏔️",
    parent: "community",
    meta: "Organizer · 6.0 & 7.0",
    blurb: "NIT Hamirpur's flagship hackathon. Two editions of logistics, judging, sponsors, and no sleep.",
  },
  {
    id: "workshops",
    kind: "item",
    group: "community",
    label: "Fresher workshops",
    emoji: "🎓",
    parent: "community",
    meta: "Git / GitHub · backend · Figma",
    blurb: "Taught first-years how to commit, how to serve, and how to make it look good.",
  },
  {
    id: "freelance",
    kind: "item",
    group: "community",
    label: "Freelance sites",
    emoji: "💼",
    parent: "community",
    meta: "Small businesses · Himachal",
    blurb: "Websites for local businesses that needed to exist online. Paid in money and occasionally in chai.",
    skills: ["ts", "node", "aws"],
  },

  // ── Skills (orbit the core) ─────────────────────────────────────────
  { id: "go", kind: "skill", group: "skills", label: "Go", emoji: "🐹" },
  { id: "ts", kind: "skill", group: "skills", label: "TypeScript", emoji: "🟦" },
  { id: "c", kind: "skill", group: "skills", label: "C", emoji: "⚙️" },
  { id: "cpp", kind: "skill", group: "skills", label: "C++", emoji: "⚙️" },
  { id: "python", kind: "skill", group: "skills", label: "Python", emoji: "🐍" },
  { id: "gin", kind: "skill", group: "skills", label: "Gin", emoji: "🍸" },
  { id: "grpc", kind: "skill", group: "skills", label: "gRPC", emoji: "📡" },
  { id: "node", kind: "skill", group: "skills", label: "Node / Express", emoji: "🟢" },
  { id: "mcp", kind: "skill", group: "skills", label: "MCP", emoji: "🔌" },
  { id: "cobra", kind: "skill", group: "skills", label: "Cobra", emoji: "🐍" },
  { id: "aws", kind: "skill", group: "skills", label: "AWS", emoji: "☁️" },
  { id: "docker", kind: "skill", group: "skills", label: "Docker", emoji: "🐳" },
  { id: "nginx", kind: "skill", group: "skills", label: "Nginx", emoji: "🚦" },
  { id: "mongodb", kind: "skill", group: "skills", label: "MongoDB", emoji: "🍃" },
  { id: "postgres", kind: "skill", group: "skills", label: "PostgreSQL", emoji: "🐘" },
  { id: "linux", kind: "skill", group: "skills", label: "Linux", emoji: "🐧" },

  // ── Learning next (dim, dashed) ─────────────────────────────────────
  { id: "next", kind: "hub", group: "learning", label: "Next up", emoji: "🔭", parent: "ayush", blurb: "Not yet. Soon." },
  { id: "raft-internals", kind: "learning", group: "learning", label: "Raft internals", emoji: "📜", parent: "next", blurb: "Beyond the paper: snapshots, membership changes, the ugly bits." },
  { id: "arrow", kind: "learning", group: "learning", label: "Apache Arrow", emoji: "🏹", parent: "next", blurb: "Columnar memory. Pairs suspiciously well with Fory." },
  { id: "k8s", kind: "learning", group: "learning", label: "Kubernetes", emoji: "☸️", parent: "next", blurb: "The homelab wants to be a cluster when it grows up." },
  { id: "ai-agents", kind: "learning", group: "learning", label: "AI / agents", emoji: "🤖", parent: "next", blurb: "Cortex was the appetizer." },
];
