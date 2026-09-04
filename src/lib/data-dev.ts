/**
 * Developer Journey brain — seed data. Append freely; nodes you add inside
 * the app are stored in the database and merged on top of this list.
 *
 * kind:   identity (the core) · hub (a cluster) · item (a thing you built or did) ·
 *         sub (a detail hanging off an item) · skill (orbits the core) · learning (dim, dashed, next up)
 * parent: which node this hangs off. Skills have no parent — they orbit.
 * skills: skill ids this item uses; drawn as faint constellation lines on hover.
 */

export type DevKind = "identity" | "hub" | "item" | "sub" | "skill" | "learning";
export type DevGroup = "identity" | "oss" | "projects" | "campus" | "community" | "skills" | "learning";

export interface DevNodeDef {
  id: string;
  kind: DevKind;
  group: DevGroup;
  label: string;
  parent?: string;
  blurb?: string;
  /** One-line context: role, event, year… */
  meta?: string;
  url?: string;
  skills?: string[];
  /** Crown jewel — gets the gold ring and the bigger glow. */
  crown?: boolean;
  status?: "live" | "shipped" | "wip";
  /** True for nodes added inside the app (stored in the database, not in this file). */
  custom?: boolean;
}

export const DEV_GROUP_COLOR: Record<DevGroup, string> = {
  identity: "#e8c574",
  oss: "#e07aa8",
  projects: "#e9a05a",
  campus: "#d98c6a",
  community: "#e57f7f",
  skills: "#d9b98f",
  learning: "#7f7a74",
};

export const DEV_GROUP_LABEL: Record<DevGroup, string> = {
  identity: "Core",
  oss: "Open source",
  projects: "Project",
  campus: "Campus service",
  community: "Community",
  skills: "Skill",
  learning: "Learning next",
};

export const DEV_KIND_LABEL: Record<DevKind, string> = {
  identity: "Core",
  hub: "Cluster",
  item: "Item",
  sub: "Detail",
  skill: "Skill",
  learning: "Next up",
};

const S = (list: (Omit<DevNodeDef, "kind" | "group" | "parent"> & { skills?: string[] })[], group: DevGroup, parent: string): DevNodeDef[] =>
  list.map((d) => ({ ...d, kind: "sub", group, parent }));

export const devNodes: DevNodeDef[] = [
  // ── Core ────────────────────────────────────────────────────────────
  {
    id: "core",
    kind: "identity",
    group: "identity",
    label: "Dev Journey",
    meta: "backend / systems · CS undergrad @ NIT Hamirpur '28 · Apache committer",
    blurb: "Backend and distributed-systems work: serialization, auth, daemons, campus services that thousands of people use. Ships in Go, thinks in systems.",
    url: "https://github.com/ayush00git",
  },

  // ── Open source ─────────────────────────────────────────────────────
  { id: "oss", kind: "hub", group: "oss", label: "Open Source", parent: "core", blurb: "Code that other people run." },
  {
    id: "fory",
    kind: "item",
    group: "oss",
    label: "Apache Fory",
    parent: "oss",
    crown: true,
    status: "live",
    meta: "Committer · Apache Software Foundation",
    blurb: "Blazing-fast multi-language serialization framework (JIT, zero-copy). Used at Ant Group, Alibaba, ByteDance. Worked on every release from v0.15.0 through the first major v1.0.0.",
    url: "https://github.com/apache/fory",
    skills: ["go", "grpc", "javascript", "dart", "protobuf"],
  },
  ...S(
    [
      { id: "fory-grpc", label: "gRPC codegen", blurb: "Generates gRPC transport code from Fory Definition Language." },
      { id: "fory-guardrails", label: "Guardrails", blurb: "Safety limits and validation on the deserialization path." },
      { id: "fory-stream", label: "Stream deserialization", blurb: "Decode straight from a stream instead of buffering whole payloads." },
      { id: "fory-go", label: "Go runtime", blurb: "Regular contributor to the Go implementation." },
      { id: "fory-js", label: "JavaScript runtime", blurb: "Contributions to the JS/TS implementation." },
      { id: "fory-dart", label: "Dart runtime", blurb: "Contributions to the Dart implementation." },
      { id: "fory-releases", label: "v0.15 → v1.0.0", meta: "release train", blurb: "Shipped work across multiple releases, including the first major release." },
    ],
    "oss",
    "fory",
  ),
  {
    id: "claude-grant",
    kind: "item",
    group: "oss",
    label: "Claude for Open Source",
    parent: "oss",
    status: "live",
    meta: "Grant recipient · 6-month Max via ASF",
    blurb: "Anthropic's open-source grant, routed through the Apache Software Foundation.",
  },

  // ── Projects ────────────────────────────────────────────────────────
  { id: "projects", kind: "hub", group: "projects", label: "Projects", parent: "core", blurb: "Things that exist because of a weekend, or several." },
  {
    id: "goth",
    kind: "item",
    group: "projects",
    label: "Goth",
    parent: "projects",
    status: "wip",
    meta: "Go auth microservice",
    blurb: "Production-grade authentication microservice in Go. Fory over gRPC for transport; Raft being added for token revocation across instances.",
    url: "https://github.com/ayush00git/goth",
    skills: ["go", "grpc", "gin", "postgres", "redis", "docker", "fory"],
  },
  ...S(
    [
      { id: "goth-sessions", label: "Sessions & tokens", blurb: "Issue, refresh, revoke." },
      { id: "goth-fory", label: "Fory gRPC transport", blurb: "Services talk Fory over gRPC instead of JSON." },
      { id: "goth-raft", label: "Raft revocation sync", meta: "in progress", blurb: "Replicating token revocation across goth instances with Raft." },
      { id: "gothctl", label: "gothctl", meta: "Cobra + Viper CLI", blurb: "Admin CLI for the service.", url: "https://github.com/ayush00git/gothctl", skills: ["go", "cobra"] },
    ],
    "projects",
    "goth",
  ),
  {
    id: "protpocket",
    kind: "item",
    group: "projects",
    label: "ProtPocket",
    parent: "projects",
    status: "live",
    meta: "HackMol 7.0",
    blurb: "Browser-native drug discovery on AlphaFold data: from predicted complex to drug lead, fast.",
    url: "https://protpocket.ayushz.me",
    skills: ["typescript", "node", "python"],
  },
  ...S(
    [
      { id: "pp-alphafold", label: "AlphaFold complex API", blurb: "Found an undocumented parameter on the complex endpoint." },
      { id: "pp-pockets", label: "Pocket detection" },
      { id: "pp-docking", label: "Docking" },
      { id: "pp-mutation", label: "Mutation impact prediction" },
    ],
    "projects",
    "protpocket",
  ),
  {
    id: "stanza",
    kind: "item",
    group: "projects",
    label: "Stanza",
    parent: "projects",
    status: "shipped",
    meta: "Claude: Life Sciences Hackathon",
    blurb: "Structure-based, resistance-aware pipeline that designs and screens small molecules against covalent and steric resistance mutations.",
    url: "https://github.com/ayush00git/stanza",
    skills: ["go", "python"],
  },
  ...S(
    [
      { id: "stanza-design", label: "Molecule design" },
      { id: "stanza-screen", label: "Resistance-aware screening" },
    ],
    "projects",
    "stanza",
  ),
  {
    id: "cortex",
    kind: "item",
    group: "projects",
    label: "Cortex",
    parent: "projects",
    status: "shipped",
    meta: "MCP server · company brain",
    blurb: "Long-term memory for AI agents over your GitHub: ingests issues and PRs, indexes docs, answers once and keeps iterating.",
    url: "https://github.com/ayush00git/cortex",
    skills: ["typescript", "mcp", "node", "rag"],
  },
  ...S(
    [
      { id: "cortex-ingest", label: "GitHub ingestion", blurb: "Issues and PRs in, memory out." },
      { id: "cortex-search", label: "Doc search" },
      { id: "cortex-tools", label: "MCP tools" },
    ],
    "projects",
    "cortex",
  ),
  {
    id: "wisp",
    kind: "item",
    group: "projects",
    label: "Wisp",
    parent: "projects",
    status: "shipped",
    meta: "Go daemon · Linux only · closed source",
    blurb: "The most silent resident of the kernel: global keystroke capture via evdev, Claude's answer rendered in an overlay at the caret.",
    skills: ["go", "linux", "systemd"],
  },
  ...S(
    [
      { id: "wisp-evdev", label: "evdev keystroke capture" },
      { id: "wisp-overlay", label: "Caret overlay" },
    ],
    "projects",
    "wisp",
  ),
  {
    id: "vicy",
    kind: "item",
    group: "projects",
    label: "Vicy",
    parent: "projects",
    status: "shipped",
    meta: "voice → text, anywhere",
    blurb: "Personal voice-to-text that works in any window. Built because typing prompts got old.",
    url: "https://github.com/ayush00git/vicy",
    skills: ["python", "linux"],
  },
  {
    id: "cbot",
    kind: "item",
    group: "projects",
    label: "cbot",
    parent: "projects",
    status: "shipped",
    meta: "AI assistant in the terminal",
    blurb: "Lightweight CLI for people who don't want to leave the terminal to ask a question.",
    url: "https://github.com/ayush00git/cbot",
    skills: ["go", "cobra"],
  },
  {
    id: "lowkey",
    kind: "item",
    group: "projects",
    label: "lowkey",
    parent: "projects",
    status: "shipped",
    meta: "p2p · e2e chat",
    blurb: "Chat once, leave no digital footprint.",
    url: "https://github.com/ayush00git/lowkey",
    skills: ["dart", "websockets"],
  },
  {
    id: "tuifolio",
    kind: "item",
    group: "projects",
    label: "tuifolio",
    parent: "projects",
    status: "shipped",
    meta: "TUI portfolio generator",
    blurb: "Turns a portfolio into a terminal UI.",
    url: "https://github.com/ayush00git/tuifolio",
    skills: ["go"],
  },
  {
    id: "gh-widget",
    kind: "item",
    group: "projects",
    label: "gh-widget",
    parent: "projects",
    status: "shipped",
    meta: "Android",
    blurb: "GitHub contributions as a home-screen widget, not the boring green-dot way.",
    url: "https://github.com/ayush00git/gh-widget",
    skills: ["kotlin"],
  },
  {
    id: "raft",
    kind: "item",
    group: "projects",
    label: "Raft",
    parent: "projects",
    status: "wip",
    meta: "consensus from scratch · learning build",
    blurb: "Leader election, log replication, the whole paper, by hand in Go.",
    skills: ["go"],
  },
  ...S(
    [
      { id: "raft-election", label: "Leader election" },
      { id: "raft-log", label: "Log replication" },
    ],
    "projects",
    "raft",
  ),
  {
    id: "homeserver",
    kind: "item",
    group: "projects",
    label: "Home server",
    parent: "projects",
    status: "live",
    meta: "Ubuntu · 24/7 homelab",
    blurb: "A spare PC that refuses to die. Runs everything that shouldn't touch a laptop.",
    skills: ["linux", "docker", "nginx", "systemd"],
  },
  ...S(
    [
      { id: "hs-compose", label: "Docker Compose stack" },
      { id: "hs-nginx", label: "Nginx reverse proxy" },
      { id: "hs-hardening", label: "ufw + systemd hardening" },
    ],
    "projects",
    "homeserver",
  ),

  // ── Campus services (real users, real uptime) ───────────────────────
  { id: "campus", kind: "hub", group: "campus", label: "Campus Services", parent: "core", blurb: "Official NIT Hamirpur systems that run daily campus life." },
  {
    id: "cms-web",
    kind: "item",
    group: "campus",
    label: "CMS-Web",
    parent: "campus",
    status: "live",
    meta: "Estate Office · 1000+ users",
    blurb: "Construction-cell complaint management for faculty, wardens, centre heads and staff. Migrated to Go / Gin / MongoDB.",
    url: "https://cms.nith.ac.in/",
    skills: ["go", "gin", "mongodb", "nginx", "typescript"],
  },
  ...S(
    [
      { id: "cms-migration", label: "Go / Gin / MongoDB migration" },
      { id: "cms-roles", label: "Role-based workflows", blurb: "Faculty, wardens, centre heads, non-teaching staff." },
    ],
    "campus",
    "cms-web",
  ),
  {
    id: "eo",
    kind: "item",
    group: "campus",
    label: "Estate Office site",
    parent: "campus",
    status: "live",
    meta: "booking platform · maintained",
    blurb: "The Estate Office booking platform, the version that's actually maintained.",
    url: "https://eo.nith.ac.in/",
    skills: ["javascript", "node", "mongodb"],
  },
  {
    id: "laca-web",
    kind: "item",
    group: "campus",
    label: "LA/CA portal",
    parent: "campus",
    status: "live",
    meta: "1000+ registrations",
    blurb: "Official student registration portal for LA/CA elective courses.",
    url: "https://github.com/ayush00git/laca-web",
    skills: ["node", "mongodb"],
  },
  {
    id: "appteam-web",
    kind: "item",
    group: "campus",
    label: "App Team site",
    parent: "campus",
    status: "live",
    meta: "core CSE club",
    blurb: "Official website of App Team, the core club of the CSE department.",
    url: "https://github.com/ayush00git/appteam-web",
    skills: ["javascript", "node"],
  },

  // ── Community ───────────────────────────────────────────────────────
  { id: "community", kind: "hub", group: "community", label: "Community", parent: "core", blurb: "The people part." },
  {
    id: "hackonhills",
    kind: "item",
    group: "community",
    label: "HackOnHills",
    parent: "community",
    meta: "Organizer · 6.0 & 7.0",
    blurb: "NIT Hamirpur's flagship hackathon. Two editions of logistics, judging, sponsors, and no sleep.",
  },
  ...S(
    [
      { id: "hoh-6", label: "HackOnHills 6.0" },
      { id: "hoh-7", label: "HackOnHills 7.0" },
    ],
    "community",
    "hackonhills",
  ),
  {
    id: "tnc",
    kind: "item",
    group: "community",
    label: "The Nerds Community",
    parent: "community",
    status: "live",
    meta: "peers who think, build and ship",
    blurb: "A community focused on execution. The repo is the org's most-starred.",
    url: "https://github.com/ayush00git/TNC",
    skills: ["typescript"],
  },
  {
    id: "deznov",
    kind: "item",
    group: "community",
    label: "DezNov",
    parent: "community",
    status: "shipped",
    meta: "share projects with the college",
    blurb: "A space to share coding and design projects within the campus community.",
    url: "https://github.com/ayush00git/DezNov",
    skills: ["javascript"],
  },
  {
    id: "workshops",
    kind: "item",
    group: "community",
    label: "Fresher workshops",
    parent: "community",
    meta: "Git / GitHub · backend · Figma",
    blurb: "Taught first-years how to commit, how to serve, and how to make it look good.",
  },
  ...S(
    [
      { id: "ws-git", label: "Git & GitHub" },
      { id: "ws-backend", label: "Backend basics" },
      { id: "ws-figma", label: "Figma" },
    ],
    "community",
    "workshops",
  ),
  {
    id: "freelance",
    kind: "item",
    group: "community",
    label: "Freelance sites",
    parent: "community",
    meta: "small businesses · Himachal",
    blurb: "Websites for local businesses that needed to exist online.",
    skills: ["typescript", "node", "aws"],
  },
  {
    id: "merch",
    kind: "item",
    group: "community",
    label: "Merch design",
    parent: "community",
    meta: "100+ prints",
    blurb: "Designs that ended up on real shirts. Engineering balanced with a little creativity.",
    skills: ["figma"],
  },

  // ── Skills (orbit the core) ─────────────────────────────────────────
  { id: "go", kind: "skill", group: "skills", label: "Go" },
  { id: "typescript", kind: "skill", group: "skills", label: "TypeScript" },
  { id: "javascript", kind: "skill", group: "skills", label: "JavaScript" },
  { id: "c", kind: "skill", group: "skills", label: "C" },
  { id: "cpp", kind: "skill", group: "skills", label: "C++" },
  { id: "python", kind: "skill", group: "skills", label: "Python" },
  { id: "dart", kind: "skill", group: "skills", label: "Dart" },
  { id: "kotlin", kind: "skill", group: "skills", label: "Kotlin" },
  { id: "gin", kind: "skill", group: "skills", label: "Gin" },
  { id: "nethttp", kind: "skill", group: "skills", label: "net/http" },
  { id: "grpc", kind: "skill", group: "skills", label: "gRPC" },
  { id: "node", kind: "skill", group: "skills", label: "Node / Express" },
  { id: "websockets", kind: "skill", group: "skills", label: "WebSockets" },
  { id: "protobuf", kind: "skill", group: "skills", label: "Protobuf" },
  { id: "fory-skill", kind: "skill", group: "skills", label: "Fory / FDL" },
  { id: "postgres", kind: "skill", group: "skills", label: "PostgreSQL" },
  { id: "mongodb", kind: "skill", group: "skills", label: "MongoDB" },
  { id: "redis", kind: "skill", group: "skills", label: "Redis" },
  { id: "gorm", kind: "skill", group: "skills", label: "GORM" },
  { id: "aws", kind: "skill", group: "skills", label: "AWS" },
  { id: "nginx", kind: "skill", group: "skills", label: "Nginx" },
  { id: "docker", kind: "skill", group: "skills", label: "Docker" },
  { id: "gha", kind: "skill", group: "skills", label: "GitHub Actions" },
  { id: "linux", kind: "skill", group: "skills", label: "Linux" },
  { id: "systemd", kind: "skill", group: "skills", label: "systemd" },
  { id: "mcp", kind: "skill", group: "skills", label: "MCP" },
  { id: "rag", kind: "skill", group: "skills", label: "RAG" },
  { id: "cobra", kind: "skill", group: "skills", label: "Cobra / Viper" },
  { id: "figma", kind: "skill", group: "skills", label: "Figma" },

  // ── Learning next (dim, dashed) ─────────────────────────────────────
  { id: "next", kind: "hub", group: "learning", label: "Next up", parent: "core", blurb: "Not yet. Soon." },
  { id: "agentic-ai", kind: "learning", group: "learning", label: "Agentic AI", parent: "next", blurb: "Cortex was the appetizer." },
  { id: "system-design", kind: "learning", group: "learning", label: "System design", parent: "next", blurb: "Deeper. Trade-offs, not diagrams." },
  { id: "linux-internals", kind: "learning", group: "learning", label: "Linux internals", parent: "next", blurb: "Wisp lives in the kernel; time to understand the landlord." },
  { id: "distributed", kind: "learning", group: "learning", label: "Distributed patterns", parent: "next", blurb: "Beyond Raft: consensus, replication, failure modes." },
  { id: "raft-internals", kind: "learning", group: "learning", label: "Raft internals", parent: "next", blurb: "Snapshots, membership changes, the ugly bits." },
  { id: "arrow", kind: "learning", group: "learning", label: "Apache Arrow", parent: "next", blurb: "Columnar memory. Pairs suspiciously well with Fory." },
  { id: "k8s", kind: "learning", group: "learning", label: "Kubernetes", parent: "next", blurb: "The homelab wants to be a cluster when it grows up." },
];
