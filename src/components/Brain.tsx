"use client";

import { useEffect, useRef } from "react";
import { forceCollide, forceLink, forceManyBody, forceSimulation, type ForceLink, type Simulation } from "d3-force";
import type { Difficulty } from "@/lib/data";
import { DIFFICULTY_COLOR, type BrainId, type GLink, type GNode, type Graph, type VisualStatus } from "@/lib/graph";
import { SKILL_ORBIT } from "@/lib/graph-dev";

/* ── Public types ──────────────────────────────────────────────────────── */

export interface NodeVisual {
  status: VisualStatus;
  color: string;
  difficulty?: Difficulty;
  /** 0..1 retention ring for topics with problems; undefined = no ring. */
  mastery?: number;
  /** Days overdue for `due` nodes (0 = due today). Drives nag intensity. */
  overdueDays?: number;
  dim: boolean;
  /** Dev brain: shipping status badge. */
  badge?: "live" | "shipped" | "wip";
}

export interface FocusRequest {
  id: string;
  nonce: number;
  color?: string;
  zoom?: number;
}

export interface FitRequest {
  brain: BrainId | "all";
  nonce: number;
}

export interface ClusterInput {
  id: BrainId;
  graph: Graph;
  anchor: { x: number; y: number };
  color: string;
  personality: "calm" | "playful";
}

export interface BrainProps {
  clusters: ClusterInput[];
  visuals: Map<string, NodeVisual>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  focus: FocusRequest | null;
  fit: FitRequest | null;
  /** Brain to dim when the other is focused. */
  dimBrain: BrainId | null;
  cardRef: React.RefObject<HTMLElement | null>;
}

/* ── Internals ─────────────────────────────────────────────────────────── */

interface Pt {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  k: number;
  tx: number;
  ty: number;
  tk: number;
}

interface Pulse {
  id: string;
  t0: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  rot: number;
  spin: number;
  kind: "confetti" | "spark";
}

interface Live {
  id: BrainId;
  graph: Graph;
  nodes: GNode[];
  links: GLink[];
  byId: Map<string, GNode>;
  sim: Simulation<GNode, GLink>;
  color: string;
  personality: "calm" | "playful";
  anchor: { x: number; y: number; vx: number; vy: number };
  centroid: Pt;
  envelope: number;
  hull: Pt[];
}

const BASE_ALPHA = 0.02;
const MIN_K = 0.25;
const MAX_K = 3.4;
const HULL_PAD = 30;

/* colour helpers */
const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
  let c = rgbCache.get(hex);
  if (!c) {
    const h = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
    const n = parseInt(h.slice(1), 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
  }
  return c;
}
function rgba(hex: string, a: number) {
  const c = rgb(hex);
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}
/** t > 0 lightens toward white, t < 0 darkens toward black. */
function shade(hex: string, t: number, a = 1) {
  const c = rgb(hex);
  const f = (v: number) => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t));
  return `rgba(${f(c[0])},${f(c[1])},${f(c[2])},${a})`;
}

const easeOutBack = (t: number) => Math.max(0.02, 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fade = (k: number, from: number, to: number) => clamp01((k - from) / (to - from));

/* ── Physics recipes ───────────────────────────────────────────────────── */

function linkDistance(l: GLink) {
  const rs = l.source.r + l.target.r;
  switch (l.kind) {
    case "member":
      return 38 + rs + 12;
    case "prereq":
      return 170;
    case "tree":
      return l.source.kind === "identity" ? 235 : l.target.kind === "sub" ? 22 + rs : 56 + rs;
    case "learning":
      return l.source.kind === "identity" ? 190 : 34 + rs;
    case "skill":
      return 0;
  }
}
function linkStrength(l: GLink) {
  switch (l.kind) {
    case "member":
      return 0.75;
    case "prereq":
      return 0.22;
    case "tree":
      return l.source.kind === "identity" ? 0.55 : l.target.kind === "sub" ? 0.9 : 0.8;
    case "learning":
      return 0.5;
    case "skill":
      return 0;
  }
}
function charge(n: GNode) {
  switch (n.kind) {
    case "topic":
      return -560;
    case "problem":
      return -80;
    case "identity":
      return -1300;
    case "hub":
      return -520;
    case "item":
      return n.crown ? -240 : -150;
    case "sub":
      return -28;
    case "skill":
      return -22;
    case "learning":
      return -110;
  }
}
function collidePad(n: GNode) {
  switch (n.kind) {
    case "topic":
      return 24;
    case "problem":
      return 11;
    case "identity":
      return 32;
    case "hub":
      return 24;
    case "item":
      return 12;
    case "sub":
      return 5;
    case "skill":
      return 3;
    case "learning":
      return 9;
  }
}

/* ── Geometry ──────────────────────────────────────────────────────────── */

function convexHull(pts: Pt[]): Pt[] {
  if (pts.length < 3) return pts.slice();
  const p = pts.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
function chaikin(pts: Pt[], iterations = 2): Pt[] {
  let cur = pts;
  for (let it = 0; it < iterations; it++) {
    const next: Pt[] = [];
    for (let i = 0; i < cur.length; i++) {
      const a = cur[i];
      const b = cur[(i + 1) % cur.length];
      next.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 });
      next.push({ x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 });
    }
    cur = next;
  }
  return cur;
}
function inPolygon(p: Pt, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* ── Component ─────────────────────────────────────────────────────────── */

export default function Brain(props: BrainProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const camRef = useRef<Camera>({ x: 0, y: 0, k: 1, tx: 0, ty: 0, tk: 1 });
  const pulsesRef = useRef<Pulse[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1, left: 0, top: 0 });
  const hoverRef = useRef<string | null>(null);
  const liveRef = useRef<Map<BrainId, Live>>(new Map());
  const bornRef = useRef<Map<string, number>>(new Map());
  const liftRef = useRef<Map<string, number>>(new Map());
  const labelAlphaRef = useRef<Map<string, number>>(new Map());

  const findNode = (id: string | null) => {
    if (!id) return null;
    for (const l of liveRef.current.values()) {
      const n = l.byId.get(id);
      if (n) return { node: n, live: l };
    }
    return null;
  };

  const fitTo = (nodes: GNode[], zoomCap = 1.3) => {
    if (!nodes.length) return;
    const { w, h, left, top } = sizeRef.current;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, (n.x ?? 0) - n.r);
      maxX = Math.max(maxX, (n.x ?? 0) + n.r);
      minY = Math.min(minY, (n.y ?? 0) - n.r);
      maxY = Math.max(maxY, (n.y ?? 0) + n.r);
    }
    let cw = w, cx = w / 2, cy = h / 2 + 10;
    const card = propsRef.current.cardRef.current?.getBoundingClientRect();
    if (card && card.width > 0 && card.left - left > w * 0.45) {
      cw = card.left - left;
      cx = cw / 2;
    }
    const k = Math.min(cw / (maxX - minX + 220), h / (maxY - minY + 300), zoomCap);
    const cam = camRef.current;
    cam.tk = k;
    cam.tx = cx - ((minX + maxX) / 2) * k;
    cam.ty = cy - ((minY + maxY) / 2) * k;
  };

  /* Reconcile rebuilt graphs into the running simulations: keep old nodes, birth new ones next to their parent. */
  useEffect(() => {
    for (const input of props.clusters) {
      const live = liveRef.current.get(input.id);
      if (!live || live.graph === input.graph) continue;
      const now = performance.now();
      const nodes: GNode[] = input.graph.nodes.map((n) => {
        const prev = live.byId.get(n.id);
        if (prev) {
          prev.r = n.r;
          prev.label = n.label;
          prev.topicId = n.topicId;
          return prev;
        }
        const parent = n.topicId ? live.byId.get(n.topicId) : null;
        const a = Math.random() * Math.PI * 2;
        const d = parent ? parent.r + 34 : 40;
        n.x = (parent?.x ?? live.anchor.x) + Math.cos(a) * d;
        n.y = (parent?.y ?? live.anchor.y) + Math.sin(a) * d;
        n.vx = 0;
        n.vy = 0;
        bornRef.current.set(n.id, now + 60);
        return n;
      });
      const byId = new Map(nodes.map((n) => [n.id, n] as const));
      const links: GLink[] = input.graph.links.map((l) => ({ kind: l.kind, source: byId.get(l.source.id)!, target: byId.get(l.target.id)! }));
      live.graph = input.graph;
      live.nodes = nodes;
      live.links = links;
      live.byId = byId;
      live.sim.nodes(nodes);
      (live.sim.force("link") as ForceLink<GNode, GLink>).links(links);
      live.sim.alpha(Math.max(live.sim.alpha(), 0.45));
    }
  }, [props.clusters]);

  /* Focus: glide the camera to a node and drop a locating pulse. */
  useEffect(() => {
    const f = props.focus;
    if (!f) return;
    const hit = findNode(f.id);
    if (!hit) return;
    const node = hit.node;
    const cam = camRef.current;
    const { w, h, left, top } = sizeRef.current;
    let cx = w / 2;
    let cy = h / 2;
    const card = props.cardRef.current?.getBoundingClientRect();
    if (card && card.width > 0) {
      const cl = card.left - left;
      const ct = card.top - top;
      if (cl > w * 0.45) cx = cl / 2;
      else if (ct > h * 0.35) cy = ct / 2;
    }
    const k = f.zoom ?? Math.max(cam.tk, 1.25);
    cam.tk = k;
    cam.tx = cx - (node.x ?? 0) * k;
    cam.ty = cy - (node.y ?? 0) * k;
    pulsesRef.current.push({ id: f.id, t0: performance.now(), color: f.color ?? "#ffffff" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.focus?.nonce]);

  /* Fit: frame one brain or both. */
  useEffect(() => {
    const f = props.fit;
    if (!f) return;
    const nodes: GNode[] = [];
    for (const l of liveRef.current.values()) if (f.brain === "all" || l.id === f.brain) nodes.push(...l.nodes);
    fitTo(nodes, f.brain === "all" ? 1.15 : 1.35);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.fit?.nonce]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rootStyle = getComputedStyle(document.documentElement);
    const serif = rootStyle.getPropertyValue("--font-fraunces").trim() || "Georgia, serif";
    const sans = rootStyle.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif";

    /* ── Build clusters ──────────────────────────────────────────── */
    const lives = new Map<BrainId, Live>();
    const mount = performance.now();
    let stagger = 0;
    for (const input of propsRef.current.clusters) {
      const nodes = input.graph.nodes.slice();
      const links = input.graph.links.slice();
      const anchor = { x: input.anchor.x, y: input.anchor.y, vx: 0, vy: 0 };
      for (const n of nodes) {
        n.x = (n.x ?? 0) + anchor.x;
        n.y = (n.y ?? 0) + anchor.y;
      }
      const live: Live = {
        id: input.id,
        graph: input.graph,
        nodes,
        links,
        byId: new Map(nodes.map((n) => [n.id, n] as const)),
        sim: forceSimulation<GNode, GLink>(nodes).stop(),
        color: input.color,
        personality: input.personality,
        anchor,
        centroid: { x: anchor.x, y: anchor.y },
        envelope: 200,
        hull: [],
      };
      const gravity = (alpha: number) => {
        for (const n of live.nodes) {
          const k = n.kind === "identity" ? 0.9 : live.personality === "playful" ? 0.035 : 0.028;
          n.vx = (n.vx ?? 0) + (live.anchor.x - (n.x ?? 0)) * k * alpha;
          n.vy = (n.vy ?? 0) + (live.anchor.y - (n.y ?? 0)) * k * alpha;
        }
      };
      const orbit = () => {
        const core = live.nodes.find((n) => n.kind === "identity");
        if (!core) return;
        for (const n of live.nodes) {
          if (!n.orbit) continue;
          const dx = (n.x ?? 0) - (core.x ?? 0);
          const dy = (n.y ?? 0) - (core.y ?? 0);
          const d = Math.hypot(dx, dy) || 1;
          const ux = dx / d, uy = dy / d;
          n.vx = (n.vx ?? 0) + ux * (SKILL_ORBIT - d) * 0.08 - uy * 0.055;
          n.vy = (n.vy ?? 0) + uy * (SKILL_ORBIT - d) * 0.08 + ux * 0.055;
        }
      };
      live.sim
        .force("link", forceLink<GNode, GLink>(links).distance(linkDistance).strength(linkStrength))
        .force("charge", forceManyBody<GNode>().strength(charge).distanceMax(650))
        .force("collide", forceCollide<GNode>().radius((n) => n.r + collidePad(n)).strength(0.85))
        .force("gravity", gravity)
        .velocityDecay(0.42);
      if (nodes.some((n) => n.orbit)) live.sim.force("orbit", orbit);
      live.sim.alpha(1);
      for (let i = 0; i < 320; i++) live.sim.tick();
      live.sim.alpha(0.35).alphaTarget(BASE_ALPHA);
      lives.set(input.id, live);

      // birth stagger: big nodes first
      const order = nodes.slice().sort((a, b) => b.r - a.r);
      for (const n of order) bornRef.current.set(n.id, mount + 120 + stagger++ * 22);
    }
    liveRef.current = lives;
    if (process.env.NODE_ENV === "development") {
      const w = window as unknown as { __brain?: unknown; __cam?: unknown };
      w.__brain = lives;
      w.__cam = camRef.current;
    }

    /* ── Sizing ──────────────────────────────────────────────────── */
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      sizeRef.current = { w: rect.width, h: rect.height, dpr, left: rect.left, top: rect.top };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    {
      const all: GNode[] = [];
      for (const l of lives.values()) all.push(...l.nodes);
      fitTo(all, 1.15);
      const cam = camRef.current;
      cam.k = cam.tk * 0.6;
      cam.x = cam.tx + (sizeRef.current.w / 2) * (1 - 0.6);
      cam.y = cam.ty + (sizeRef.current.h / 2) * (1 - 0.6);
    }

    /* ── Helpers ─────────────────────────────────────────────────── */
    const toWorld = (sx: number, sy: number) => {
      const c = camRef.current;
      return { x: (sx - c.x) / c.k, y: (sy - c.y) / c.k };
    };
    const pick = (sx: number, sy: number): { node: GNode; live: Live } | null => {
      const { x, y } = toWorld(sx, sy);
      const slack = 5 / camRef.current.k;
      let best: { node: GNode; live: Live } | null = null;
      let bestD = Infinity;
      for (const live of lives.values()) {
        for (const n of live.nodes) {
          const d = Math.hypot((n.x ?? 0) - x, (n.y ?? 0) - y) - n.r - slack;
          if (d < 0 && d < bestD) {
            bestD = d;
            best = { node: n, live };
          }
        }
      }
      return best;
    };
    const pickHull = (sx: number, sy: number): Live | null => {
      const p = toWorld(sx, sy);
      for (const live of lives.values()) if (live.hull.length > 2 && inPolygon(p, live.hull)) return live;
      return null;
    };
    /* ── Pointer ─────────────────────────────────────────────────── */
    let down: { sx: number; sy: number; cx: number; cy: number; node: GNode | null; live: Live | null; hull: Live | null; moved: boolean; lastX: number; lastY: number } | null = null;
    const touches = new Map<number, { x: number; y: number }>();
    let pinch: { d0: number; k0: number; wx: number; wy: number } | null = null;
    const endDrag = () => {
      if (!down) return;
      if (down.node && down.live) {
        down.node.fx = null;
        down.node.fy = null;
        down.live.sim.alphaTarget(BASE_ALPHA);
      }
      down = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic or already-released pointer */
      }
      const sx = e.clientX - sizeRef.current.left;
      const sy = e.clientY - sizeRef.current.top;
      if (e.pointerType === "touch") {
        touches.set(e.pointerId, { x: sx, y: sy });
        if (touches.size === 2) {
          // second finger: whatever was happening becomes a pinch
          endDrag();
          const [a, b] = [...touches.values()];
          const cam = camRef.current;
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          // remember the world point under the fingers; it stays under them for the whole gesture
          pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, k0: cam.k, wx: (mx - cam.x) / cam.k, wy: (my - cam.y) / cam.k };
          canvas.style.cursor = "grabbing";
          return;
        }
        if (touches.size > 2) return;
      }
      const hit = pick(sx, sy);
      const hull = hit ? null : pickHull(sx, sy);
      down = { sx, sy, cx: camRef.current.x, cy: camRef.current.y, node: hit?.node ?? null, live: hit?.live ?? null, hull, moved: false, lastX: sx, lastY: sy };
      if (hit) {
        hit.node.fx = hit.node.x;
        hit.node.fy = hit.node.y;
        hit.live.sim.alphaTarget(0.3);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const sx = e.clientX - sizeRef.current.left;
      const sy = e.clientY - sizeRef.current.top;
      if (e.pointerType === "touch" && touches.has(e.pointerId)) touches.set(e.pointerId, { x: sx, y: sy });
      if (pinch && touches.size >= 2) {
        const [a, b] = [...touches.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const cam = camRef.current;
        const k = Math.min(MAX_K, Math.max(MIN_K, pinch.k0 * (d / pinch.d0)));
        cam.k = cam.tk = k;
        cam.x = cam.tx = mx - pinch.wx * k;
        cam.y = cam.ty = my - pinch.wy * k;
        return;
      }
      if (down) {
        if (!down.moved && Math.hypot(sx - down.sx, sy - down.sy) > 4) down.moved = true;
        if (down.node) {
          const w = toWorld(sx, sy);
          down.node.fx = w.x;
          down.node.fy = w.y;
          canvas.style.cursor = "grabbing";
        } else if (down.hull && down.moved) {
          const k = camRef.current.k;
          const dx = (sx - down.lastX) / k;
          const dy = (sy - down.lastY) / k;
          const l = down.hull;
          l.anchor.x += dx;
          l.anchor.y += dy;
          l.anchor.vx = 0;
          l.anchor.vy = 0;
          for (const n of l.nodes) {
            n.x = (n.x ?? 0) + dx;
            n.y = (n.y ?? 0) + dy;
          }
          canvas.style.cursor = "grabbing";
        } else if (down.moved) {
          const cam = camRef.current;
          cam.x = cam.tx = down.cx + (sx - down.sx);
          cam.y = cam.ty = down.cy + (sy - down.sy);
          canvas.style.cursor = "grabbing";
        }
        down.lastX = sx;
        down.lastY = sy;
        return;
      }
      const hit = pick(sx, sy);
      const id = hit?.node.id ?? null;
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        propsRef.current.onHover(id);
      }
      canvas.style.cursor = hit ? "pointer" : pickHull(sx, sy) ? "move" : "grab";
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        touches.delete(e.pointerId);
        if (pinch) {
          if (touches.size < 2) pinch = null;
          try {
            canvas.releasePointerCapture(e.pointerId);
          } catch {
            /* already released */
          }
          return;
        }
      }
      if (!down) return;
      const { node, live, moved } = down;
      down = null;
      canvas.style.cursor = node ? "pointer" : "grab";
      if (node && live) {
        node.fx = null;
        node.fy = null;
        live.sim.alphaTarget(BASE_ALPHA);
      }
      if (!moved) propsRef.current.onSelect(node ? node.id : null);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const cam = camRef.current;
      const sx = e.clientX - sizeRef.current.left;
      const sy = e.clientY - sizeRef.current.top;
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0016));
      const k = Math.min(MAX_K, Math.max(MIN_K, cam.tk * factor));
      const wx = (sx - cam.tx) / cam.tk;
      const wy = (sy - cam.ty) / cam.tk;
      cam.tk = k;
      cam.tx = sx - wx * k;
      cam.ty = sy - wy * k;
    };
    const onLeave = () => {
      if (hoverRef.current) {
        hoverRef.current = null;
        propsRef.current.onHover(null);
      }
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.style.cursor = "grab";

    /* ── Drawing helpers ─────────────────────────────────────────── */
    const textWidthCache = new Map<string, number>();
    const measure = (text: string, font: string) => {
      const key = font + "|" + text;
      let w = textWidthCache.get(key);
      if (w === undefined) {
        ctx.font = font;
        w = ctx.measureText(text).width;
        textWidthCache.set(key, w);
      }
      return w;
    };

    /** A shaded sphere — the "physical object" look. */
    const orb = (x: number, y: number, r0: number, color: string, A: number, lift: number, opts: { hollow?: boolean; dashed?: boolean; fillAlpha?: number } = {}) => {
      const r = Math.max(0.8, r0);
      if (lift > 0.01) {
        ctx.save();
        ctx.shadowColor = rgba(color, 0.55 * lift * A);
        ctx.shadowBlur = 22 * lift;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(color, 0.001);
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      if (opts.hollow) {
        ctx.fillStyle = `rgba(6,6,8,${0.92 * A})`;
        ctx.fill();
        if (opts.dashed) ctx.setLineDash([3, 3.5]);
        ctx.strokeStyle = rgba(color, 0.8 * A);
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }
      const fa = opts.fillAlpha ?? 1;
      const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.4, r * 0.08, x, y, r * 1.15);
      g.addColorStop(0, shade(color, 0.55, fa * A));
      g.addColorStop(0.45, shade(color, 0.05, fa * A));
      g.addColorStop(1, shade(color, -0.45, fa * A));
      ctx.fillStyle = g;
      ctx.fill();
      // rim light
      ctx.beginPath();
      ctx.arc(x, y, r - 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${0.22 * A})`;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      // outer edge
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = shade(color, -0.25, 0.9 * A);
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const glow = (x: number, y: number, r0: number, r1: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
      g.addColorStop(0, rgba(color, a));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r1, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawEdge = (l: GLink, t: number, alpha: number, highlighted: boolean, va: NodeVisual, vb: NodeVisual) => {
      const a = l.source, b = l.target;
      const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      const arrow = l.kind === "prereq";
      const sx = ax + ux * (a.r + 2), sy = ay + uy * (a.r + 2);
      const ex = bx - ux * (b.r + (arrow ? 9 : 3)), ey = by - uy * (b.r + (arrow ? 9 : 3));
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      const bendK = l.kind === "prereq" ? 0.22 : l.kind === "skill" ? 0.08 : l.kind === "tree" ? 0.12 : 0.16;
      const bend = (a.phase > b.phase ? 1 : -1) * bendK * len;
      const cx = mx - uy * bend, cy = my + ux * bend;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);

      if (arrow) {
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, rgba(va.color, alpha));
        g.addColorStop(1, rgba(vb.color, alpha));
        ctx.strokeStyle = g;
        ctx.lineWidth = highlighted ? 2.2 : 1.4;
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = -((t * 26) % 14);
        ctx.stroke();
        ctx.setLineDash([]);
        const tx = ex - cx, ty = ey - cy;
        const tl = Math.hypot(tx, ty) || 1;
        const nx = tx / tl, ny = ty / tl;
        const size = highlighted ? 8 : 6.5;
        ctx.beginPath();
        ctx.moveTo(ex + nx * 2, ey + ny * 2);
        ctx.lineTo(ex - nx * size - ny * size * 0.55, ey - ny * size + nx * size * 0.55);
        ctx.lineTo(ex - nx * size + ny * size * 0.55, ey - ny * size - nx * size * 0.55);
        ctx.closePath();
        ctx.fillStyle = rgba(vb.color, Math.min(1, alpha * 1.4));
        ctx.fill();
      } else if (l.kind === "learning") {
        ctx.strokeStyle = rgba(vb.color, alpha);
        ctx.lineWidth = highlighted ? 1.6 : 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (l.kind === "skill") {
        ctx.strokeStyle = rgba(va.color, alpha);
        ctx.lineWidth = 1;
        ctx.setLineDash([1.5, 4]);
        ctx.lineDashOffset = -((t * 12) % 5.5);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (l.kind === "tree") {
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, rgba(va.color, alpha * 0.9));
        g.addColorStop(1, rgba(vb.color, alpha));
        ctx.strokeStyle = g;
        ctx.lineWidth = highlighted ? 2 : b.kind === "hub" ? 1.6 : 1.1;
        ctx.stroke();
      } else {
        ctx.strokeStyle = rgba(va.color, alpha);
        ctx.lineWidth = highlighted ? 1.8 : 1;
        ctx.stroke();
      }
    };

    /* ── Cluster bookkeeping ─────────────────────────────────────── */
    const updateCluster = (live: Live) => {
      let sx = 0, sy = 0;
      for (const n of live.nodes) {
        sx += n.x ?? 0;
        sy += n.y ?? 0;
      }
      live.centroid = { x: sx / live.nodes.length, y: sy / live.nodes.length };
      const ds = live.nodes.map((n) => Math.hypot((n.x ?? 0) - live.centroid.x, (n.y ?? 0) - live.centroid.y) + n.r).sort((a, b) => a - b);
      live.envelope = ds[Math.floor(ds.length * 0.9)] ?? 100;
      const pts: Pt[] = [];
      for (const n of live.nodes) {
        const rr = n.r + HULL_PAD;
        const x = n.x ?? 0, y = n.y ?? 0;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + n.phase;
          pts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr });
        }
      }
      live.hull = chaikin(convexHull(pts), 2);
    };

    /* ── Frame ───────────────────────────────────────────────────── */
    let raf = 0;
    let last = performance.now();

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;
      const t = now / 1000;
      const { visuals, selectedId, dimBrain, cardRef } = propsRef.current;
      const hoverId = hoverRef.current;
      const { w, h, dpr, left, top } = sizeRef.current;
      const cam = camRef.current;

      const ease = 1 - Math.pow(0.001, dt / 1000);
      cam.x += (cam.tx - cam.x) * ease;
      cam.y += (cam.ty - cam.y) * ease;
      cam.k += (cam.tk - cam.k) * ease;

      /* physics */
      for (const live of lives.values()) {
        for (const n of live.nodes) {
          if (n.fx != null) continue;
          if (live.personality === "playful") {
            const amp = n.kind === "skill" ? 0.05 : n.kind === "identity" ? 0.03 : 0.12;
            n.vx = (n.vx ?? 0) + Math.sin(t * 1.3 + n.phase * 2.1) * amp;
            n.vy = (n.vy ?? 0) + Math.cos(t * 1.1 + n.phase) * amp;
          } else {
            const amp = n.kind === "topic" ? 0.05 : 0.09;
            n.vx = (n.vx ?? 0) + Math.sin(t * 0.55 + n.phase) * amp;
            n.vy = (n.vy ?? 0) + Math.cos(t * 0.41 + n.phase * 1.7) * amp;
          }
        }
        updateCluster(live);
      }
      for (const live of lives.values()) live.sim.tick();

      /* active neighbourhood */
      const activeId = selectedId ?? hoverId;
      const activeHit = findNode(activeId);
      const hood = activeHit ? activeHit.live.graph.neighbors.get(activeId!) : null;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.k, cam.k);
      ctx.lineCap = "round";

      const brainA = (b: BrainId) => (dimBrain && dimBrain === b ? 0.16 : 1);

      /* territories */
      for (const live of lives.values()) {
        if (live.hull.length < 3) continue;
        const BA = brainA(live.id);
        const breathe = live.personality === "playful" ? 1 + 0.012 * Math.sin(t * 0.9) : 1 + 0.005 * Math.sin(t * 0.5);
        ctx.save();
        ctx.translate(live.centroid.x, live.centroid.y);
        ctx.scale(breathe, breathe);
        ctx.translate(-live.centroid.x, -live.centroid.y);
        ctx.beginPath();
        live.hull.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.closePath();
        const g = ctx.createRadialGradient(live.centroid.x, live.centroid.y, live.envelope * 0.2, live.centroid.x, live.centroid.y, live.envelope + HULL_PAD + 40);
        g.addColorStop(0, rgba(live.color, 0.055 * BA));
        g.addColorStop(1, rgba(live.color, 0.015 * BA));
        ctx.fillStyle = g;
        ctx.fill();
        ctx.shadowColor = rgba(live.color, 0.4 * BA);
        ctx.shadowBlur = 28;
        ctx.strokeStyle = rgba(live.color, 0.16 * BA);
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();
      }

      /* constellation ring (dev) */
      for (const live of lives.values()) {
        const core = live.nodes.find((n) => n.kind === "identity");
        if (!core) continue;
        const BA = brainA(live.id);
        const cx = core.x ?? 0, cy = core.y ?? 0;
        ctx.beginPath();
        ctx.arc(cx, cy, SKILL_ORBIT, 0, Math.PI * 2);
        ctx.setLineDash([2, 7]);
        ctx.lineDashOffset = -((t * 6) % 9);
        ctx.strokeStyle = rgba("#d9b98f", 0.14 * BA);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        const skills = live.nodes.filter((n) => n.orbit).sort((a, b) => Math.atan2((a.y ?? 0) - cy, (a.x ?? 0) - cx) - Math.atan2((b.y ?? 0) - cy, (b.x ?? 0) - cx));
        ctx.beginPath();
        skills.forEach((n, i) => (i ? ctx.lineTo(n.x ?? 0, n.y ?? 0) : ctx.moveTo(n.x ?? 0, n.y ?? 0)));
        ctx.closePath();
        ctx.strokeStyle = rgba("#d9b98f", 0.1 * BA);
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      /* edges */
      for (const live of lives.values()) {
        const BA = brainA(live.id);
        for (const l of live.links) {
          const va = visuals.get(l.source.id);
          const vb = visuals.get(l.target.id);
          if (!va || !vb) continue;
          const related = !!activeId && (l.source.id === activeId || l.target.id === activeId);
          if (l.kind === "skill" && !related) continue;
          const dimmed = va.dim || vb.dim || (!!selectedId && !related);
          const base = l.kind === "prereq" ? 0.42 : l.kind === "tree" ? 0.3 : l.kind === "learning" ? 0.35 : l.kind === "skill" ? 0.55 : 0.2;
          let alpha = (related ? 0.85 : dimmed ? base * 0.18 : base) * BA;
          const bb = Math.max(bornRef.current.get(l.source.id) ?? 0, bornRef.current.get(l.target.id) ?? 0);
          const age = (now - bb) / 700;
          if (age < 0) continue;
          if (age < 1) alpha *= easeOutCubic(age);
          drawEdge(l, t, alpha, related, va, vb);
        }
      }

      /* nodes */
      for (const live of lives.values()) {
        const BA = brainA(live.id);
        for (const n of live.nodes) {
          const v = visuals.get(n.id);
          if (!v) continue;
          const born = bornRef.current.get(n.id) ?? 0;
          const age = (now - born) / 650;
          if (age < 0) continue;
          const scale = age < 1 ? easeOutBack(age) : 1;
          const isSel = n.id === selectedId;
          const isHover = n.id === hoverId;
          const inHood = !!hood && hood.has(n.id);
          const dim = v.dim || (!!selectedId && !isSel && !inHood);
          const A = (dim ? 0.22 : 1) * BA;

          const liftPrev = liftRef.current.get(n.id) ?? 0;
          const lift = liftPrev + ((isHover || isSel ? 1 : 0) - liftPrev) * 0.18;
          liftRef.current.set(n.id, lift);

          const x = n.x ?? 0;
          const y = n.y ?? 0;
          const r = n.r * scale * (1 + 0.09 * lift);

          if (n.brain === "dsa") {
            /* ── DSA rendering (unchanged language, polished body) ── */
            const due = v.status === "due";
            const nag = due ? 0.55 + 0.45 * Math.sin(t * (2.2 + Math.min(3, v.overdueDays ?? 0) * 0.6) + n.phase) : 0;
            const glowR = r * (n.kind === "topic" ? 2.4 : 2.6) + (due ? nag * 6 : 0) + lift * 8;
            const glowA = (v.status === "locked" ? 0.06 : n.kind === "topic" ? 0.28 : 0.22) + (due ? 0.28 * nag : 0) + lift * 0.15;
            if (v.status !== "pending") glow(x, y, r * 0.4, glowR, v.color, glowA * A);
            if (due) {
              const period = (v.overdueDays ?? 0) > 2 ? 1.15 : 1.7;
              for (let i = 0; i < 2; i++) {
                const f = ((t + n.phase) / period + i * 0.5) % 1;
                ctx.beginPath();
                ctx.arc(x, y, r + 4 + f * 26, 0, Math.PI * 2);
                ctx.strokeStyle = rgba(v.color, (1 - f) * 0.55 * A);
                ctx.lineWidth = 1.5 * (1 - f) + 0.4;
                ctx.stroke();
              }
            }
            if (n.kind === "topic") {
              if (lift > 0.01) {
                ctx.save();
                ctx.shadowColor = rgba(v.color, 0.5 * lift * A);
                ctx.shadowBlur = 24 * lift;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = rgba(v.color, 0.001);
                ctx.fill();
                ctx.restore();
              }
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              if (v.status === "locked") ctx.fillStyle = rgba("#1a1e28", 0.95 * A);
              else {
                const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
                g.addColorStop(0, rgba(v.color, 0.3 * A));
                g.addColorStop(1, rgba(v.color, 0.1 * A));
                ctx.fillStyle = g;
              }
              ctx.fill();
              ctx.strokeStyle = rgba(v.color, (v.status === "locked" ? 0.55 : 0.95) * A);
              ctx.lineWidth = 1.6;
              if (v.status === "next") {
                ctx.setLineDash([4, 5]);
                ctx.lineDashOffset = -((t * 12) % 9);
              }
              ctx.stroke();
              ctx.setLineDash([]);
              orb(x, y, r * 0.34, v.status === "locked" ? "#3a3f4c" : v.color, A, 0);
              if (v.status === "next") {
                const oa = t * 1.4 + n.phase;
                ctx.beginPath();
                ctx.arc(x + Math.cos(oa) * (r + 7), y + Math.sin(oa) * (r + 7), 2.4, 0, Math.PI * 2);
                ctx.fillStyle = rgba(v.color, 0.95 * A);
                ctx.fill();
              }
              if (v.status === "locked") {
                ctx.strokeStyle = rgba("#9aa1b3", 0.6 * A);
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.arc(x, y - 2.5, 3, Math.PI, 0);
                ctx.stroke();
                ctx.fillStyle = rgba("#9aa1b3", 0.6 * A);
                ctx.fillRect(x - 4.2, y - 2.5, 8.4, 6);
              }
              if (v.mastery !== undefined) {
                const rr = r + 5;
                ctx.beginPath();
                ctx.arc(x, y, rr, 0, Math.PI * 2);
                ctx.strokeStyle = rgba("#ffffff", 0.08 * A);
                ctx.lineWidth = 3;
                ctx.stroke();
                if (v.mastery > 0) {
                  ctx.beginPath();
                  ctx.arc(x, y, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * v.mastery);
                  ctx.strokeStyle = rgba(v.color, 0.9 * A);
                  ctx.lineWidth = 3;
                  ctx.stroke();
                }
              }
            } else {
              if (v.status === "pending") orb(x, y, r, v.color, A, lift, { hollow: true, dashed: true });
              else orb(x, y, r, v.color, A, lift);
              if (v.difficulty) {
                ctx.beginPath();
                ctx.arc(x, y, r + 3.2, 0, Math.PI * 2);
                ctx.strokeStyle = rgba(DIFFICULTY_COLOR[v.difficulty], (v.difficulty === "hard" ? 1 : 0.85) * A);
                ctx.lineWidth = v.difficulty === "hard" ? 2 : v.difficulty === "medium" ? 1.4 : 1;
                if (v.difficulty === "hard") {
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.arc(x, y, r + 6.2, 0, Math.PI * 2);
                  ctx.lineWidth = 0.8;
                  ctx.strokeStyle = rgba(DIFFICULTY_COLOR.hard, 0.55 * A);
                }
                ctx.stroke();
              }
            }
          } else {
            /* ── Dev rendering: same language as the DSA brain ── */
            const ringNode = n.kind === "identity" || n.kind === "hub";
            if (ringNode) {
              const learning = n.group === "learning";
              const glowR = r * (n.kind === "identity" ? 2.6 : 2.4) + lift * 8;
              glow(x, y, r * 0.4, glowR, v.color, (learning ? 0.08 : n.kind === "identity" ? 0.3 : 0.26) * A + lift * 0.15 * A);
              if (lift > 0.01) {
                ctx.save();
                ctx.shadowColor = rgba(v.color, 0.5 * lift * A);
                ctx.shadowBlur = 24 * lift;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = rgba(v.color, 0.001);
                ctx.fill();
                ctx.restore();
              }
              ctx.beginPath();
              ctx.arc(x, y, r, 0, Math.PI * 2);
              if (learning) ctx.fillStyle = rgba("#1a1e28", 0.95 * A);
              else {
                const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.1);
                g.addColorStop(0, rgba(v.color, 0.3 * A));
                g.addColorStop(1, rgba(v.color, 0.1 * A));
                ctx.fillStyle = g;
              }
              ctx.fill();
              ctx.strokeStyle = rgba(v.color, (learning ? 0.55 : 0.95) * A);
              ctx.lineWidth = 1.6;
              if (learning) ctx.setLineDash([4, 5]);
              ctx.stroke();
              ctx.setLineDash([]);
              orb(x, y, r * 0.34, learning ? "#3a3f4c" : v.color, A, 0);
              if (n.kind === "identity") {
                // slow orbit ring — the constellation's rail
                ctx.beginPath();
                ctx.arc(x, y, r + 6, 0, Math.PI * 2);
                ctx.strokeStyle = rgba(v.color, 0.35 * A);
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            } else if (n.kind === "learning") {
              orb(x, y, r, v.color, A, lift, { hollow: true, dashed: true });
            } else {
              const crownGlow = n.crown ? 0.5 + 0.5 * Math.sin(t * 1.6 + n.phase) : 0;
              glow(x, y, r * 0.4, r * (n.kind === "sub" || n.kind === "skill" ? 2.2 : 2.6) + lift * 8 + crownGlow * 6, n.crown ? "#e8c574" : v.color, ((n.kind === "sub" || n.kind === "skill" ? 0.16 : 0.22) + crownGlow * 0.22 + lift * 0.15) * A);
              orb(x, y, r, v.color, A * (n.kind === "sub" ? 0.9 : 1), lift);
              if (n.crown) {
                ctx.beginPath();
                ctx.arc(x, y, r + 4.5, 0, Math.PI * 2);
                ctx.strokeStyle = rgba("#e8c574", 0.9 * A);
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(x, y, r + 8, 0, Math.PI * 2);
                ctx.strokeStyle = rgba("#e8c574", 0.35 * A);
                ctx.lineWidth = 0.8;
                ctx.stroke();
              }
            }
          }

          if (isSel || isHover) {
            const rr = r + (n.kind === "topic" || n.kind === "identity" || n.kind === "hub" ? 10 : 8) + (isSel ? 1.5 * Math.sin(t * 3) : 0);
            ctx.beginPath();
            ctx.arc(x, y, rr, 0, Math.PI * 2);
            ctx.strokeStyle = rgba("#ffffff", (isSel ? 0.85 : 0.45) * BA);
            ctx.lineWidth = isSel ? 1.4 : 1;
            ctx.stroke();
          }
        }
      }

      /* particles */
      particlesRef.current = particlesRef.current.filter((p) => p.life < p.max);
      for (const p of particlesRef.current) {
        p.life += dt;
        const f = p.life / p.max;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.kind === "confetti" ? 0.06 : -0.01;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.rot += p.spin;
        const a = (1 - f) * (p.kind === "spark" ? 0.9 : 1);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = rgba(p.color, a);
        if (p.kind === "confetti") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * (1 - f * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      /* locating pulses */
      pulsesRef.current = pulsesRef.current.filter((p) => now - p.t0 < 1500);
      for (const p of pulsesRef.current) {
        const hit = findNode(p.id);
        if (!hit) continue;
        const n = hit.node;
        const age = (now - p.t0) / 1500;
        for (let i = 0; i < 3; i++) {
          const f = age - i * 0.14;
          if (f < 0 || f > 1) continue;
          ctx.beginPath();
          ctx.arc(n.x ?? 0, n.y ?? 0, n.r + 6 + easeOutCubic(f) * 70, 0, Math.PI * 2);
          ctx.strokeStyle = rgba(p.color, (1 - f) * 0.7);
          ctx.lineWidth = 2 * (1 - f) + 0.3;
          ctx.stroke();
        }
      }

      /* ── labels: screen space, collision-aware, zoom-faded ── */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      interface Cand { id: string; text: string; x: number; y: number; font: string; size: number; pri: number; target: number; color: string; serif: boolean }
      const cands: Cand[] = [];
      const k = cam.k;
      for (const live of lives.values()) {
        const BA = brainA(live.id);
        for (const n of live.nodes) {
          const v = visuals.get(n.id);
          if (!v) continue;
          const born = bornRef.current.get(n.id) ?? 0;
          const age = (now - born - 200) / 500;
          if (age < 0) continue;
          const isSel = n.id === selectedId;
          const isHover = n.id === hoverId;
          const inHood = !!hood && hood.has(n.id);
          const dim = v.dim || (!!selectedId && !isSel && !inHood);
          const forced = isSel || isHover;
          const sx = (n.x ?? 0) * k + cam.x;
          const sy = (n.y ?? 0) * k + cam.y + (n.r * (1 + 0.09 * (liftRef.current.get(n.id) ?? 0)) + (n.kind === "skill" || n.kind === "sub" ? 5 : 8)) * k;
          if (sx < -160 || sx > w + 160 || sy < -40 || sy > h + 40) continue;

          let target = 0;
          let pri = 0;
          let size = 11;
          let serifFont = false;
          let color = "#c6ccdb";
          switch (n.kind) {
            case "topic":
              target = v.status === "locked" ? 0.6 : 0.92;
              pri = 80;
              size = 13.5;
              serifFont = true;
              color = "#eef1f8";
              break;
            case "problem":
              target = forced || inHood || v.status === "due" ? 0.9 : fade(k, 0.75, 1.2) * 0.7;
              pri = v.status === "due" ? 55 : 30;
              color = v.status === "due" ? "#ffd58a" : "#c6ccdb";
              break;
            case "identity":
              target = 0.95;
              pri = 100;
              size = 15;
              serifFont = true;
              color = "#eef1f8";
              break;
            case "hub":
              target = n.group === "learning" ? 0.6 : 0.92;
              pri = 80;
              size = 13.5;
              serifFont = true;
              color = "#eef1f8";
              break;
            case "item":
              target = n.crown ? 0.95 : forced || inHood ? 0.9 : fade(k, 0.55, 0.9) * 0.8;
              pri = n.crown ? 70 : 60;
              size = n.crown ? 12 : 11;
              color = n.crown ? "#f3dfae" : "#c6ccdb";
              break;
            case "sub":
              target = forced || inHood ? 0.85 : fade(k, 1.0, 1.5) * 0.7;
              pri = 25;
              size = 10;
              color = "#aab1c0";
              break;
            case "learning":
              target = forced || inHood ? 0.8 : fade(k, 0.6, 0.95) * 0.65;
              pri = 40;
              size = 10.5;
              color = "#9aa1b3";
              break;
            case "skill":
              target = forced || inHood ? 0.9 : fade(k, 0.95, 1.4) * 0.75;
              pri = 20;
              size = 10;
              color = "#d9c7a8";
              break;
          }
          if (forced) {
            pri = 200;
            target = Math.max(target, 0.95);
            size += 1;
          }
          target *= (dim ? 0.28 : 1) * BA * Math.min(1, age);
          const weight = serifFont ? 500 : 500;
          const font = `${weight} ${size}px ${serifFont ? serif : sans}`;
          cands.push({ id: n.id, text: n.label, x: sx, y: sy, font, size, pri, target, color, serif: serifFont });
        }
      }
      cands.sort((a, b) => b.pri - a.pri || b.target - a.target);
      const placed: { x: number; y: number; w: number; h: number; id?: string }[] = [];
      // node bodies are obstacles too — a label never sits on top of someone else's node
      for (const live of lives.values()) {
        for (const n of live.nodes) {
          const rs = n.r * k;
          if (rs < 5) continue;
          const sx = (n.x ?? 0) * k + cam.x;
          const sy = (n.y ?? 0) * k + cam.y;
          if (sx < -60 || sx > w + 60 || sy < -60 || sy > h + 60) continue;
          placed.push({ x: sx - rs, y: sy - rs, w: rs * 2, h: rs * 2, id: n.id });
        }
      }
      const shown = new Set<string>();
      for (const c of cands) {
        if (c.target < 0.03) continue;
        const tw = measure(c.text, c.font);
        const rect = { x: c.x - tw / 2 - 4, y: c.y + 1, w: tw + 8, h: c.size * 1.3 + 5 };
        let ok = true;
        for (const p of placed) {
          if (p.id === c.id) continue;
          // headline labels (topics, hubs, the core) may sit over small node bodies; only other labels and big nodes block them
          if (p.id !== undefined && c.pri >= 70 && p.w < 26) continue;
          if (rect.x < p.x + p.w && rect.x + rect.w > p.x && rect.y < p.y + p.h && rect.y + rect.h > p.y) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        placed.push(rect);
        shown.add(c.id);
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.lineJoin = "round";
      for (const c of cands) {
        const prev = labelAlphaRef.current.get(c.id) ?? 0;
        const goal = shown.has(c.id) ? c.target : 0;
        const a = prev + (goal - prev) * 0.2;
        labelAlphaRef.current.set(c.id, a);
        if (a < 0.02) continue;
        ctx.font = c.font;
        ctx.strokeStyle = `rgba(0,0,0,${0.85 * a})`;
        ctx.lineWidth = 3.2;
        ctx.strokeText(c.text, c.x, c.y + 3);
        ctx.fillStyle = rgba(c.color, a);
        ctx.fillText(c.text, c.x, c.y + 3);
      }

      /* tether from selected node to the card */
      const selHit = findNode(selectedId);
      const card = selHit ? cardRef.current?.getBoundingClientRect() : null;
      if (selHit && card && card.width > 0) {
        const selNode = selHit.node;
        const v = visuals.get(selNode.id)!;
        const nx = (selNode.x ?? 0) * cam.k + cam.x;
        const ny = (selNode.y ?? 0) * cam.k + cam.y;
        const cl = card.left - left, ct = card.top - top, cr = cl + card.width, cb = ct + card.height;
        let ex: number, ey: number;
        if (nx < cl) { ex = cl; ey = Math.min(cb - 24, Math.max(ct + 24, ny)); }
        else if (nx > cr) { ex = cr; ey = Math.min(cb - 24, Math.max(ct + 24, ny)); }
        else if (ny < ct) { ex = Math.min(cr - 24, Math.max(cl + 24, nx)); ey = ct; }
        else { ex = nx; ey = ny; }
        if (ex !== nx || ey !== ny) {
          const dx = ex - nx, dy = ey - ny;
          const d = Math.hypot(dx, dy) || 1;
          const off = (selNode.r + 12) * cam.k;
          const sx = nx + (dx / d) * off, sy = ny + (dy / d) * off;
          if (d > off + 8) {
            const g = ctx.createLinearGradient(sx, sy, ex, ey);
            g.addColorStop(0, rgba(v.color, 0.75));
            g.addColorStop(1, rgba(v.color, 0.2));
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = g;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 5]);
            ctx.lineDashOffset = -((t * 20) % 8);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = rgba(v.color, 0.8);
            ctx.fill();
          }
        }
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      for (const l of lives.values()) l.sim.stop();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none select-none">
      <canvas ref={canvasRef} className="block" aria-label="Knowledge graph" role="img" />
    </div>
  );
}
