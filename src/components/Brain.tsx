"use client";

import { useEffect, useRef } from "react";
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
} from "d3-force";
import type { Difficulty } from "@/lib/data";
import { DIFFICULTY_COLOR, type GLink, type GNode, type Graph, type VisualStatus } from "@/lib/graph";

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
}

export interface FocusRequest {
  id: string;
  nonce: number;
  /** Colour of the locating pulse. */
  color?: string;
  zoom?: number;
}

export interface BrainProps {
  graph: Graph;
  visuals: Map<string, NodeVisual>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  focus: FocusRequest | null;
  /** The detail card — used to keep the focused node clear of it and to draw the tether. */
  cardRef: React.RefObject<HTMLElement | null>;
}

/* ── Internals ─────────────────────────────────────────────────────────── */

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

const BASE_ALPHA = 0.02;
const MIN_K = 0.3;
const MAX_K = 3.2;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgbCache = new Map<string, [number, number, number]>();
function rgba(hex: string, a: number) {
  let c = rgbCache.get(hex);
  if (!c) {
    c = hexToRgb(hex);
    rgbCache.set(hex, c);
  }
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

function easeOutBack(t: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function Brain(props: BrainProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const camRef = useRef<Camera>({ x: 0, y: 0, k: 1, tx: 0, ty: 0, tk: 1 });
  const pulsesRef = useRef<Pulse[]>([]);
  const sizeRef = useRef({ w: 1, h: 1, dpr: 1, left: 0, top: 0 });
  const hoverRef = useRef<string | null>(null);
  const simRef = useRef<Simulation<GNode, GLink> | null>(null);
  const bornRef = useRef<Map<string, number>>(new Map());

  /* Focus: glide the camera to a node and drop a locating pulse. */
  useEffect(() => {
    const f = props.focus;
    if (!f) return;
    const node = props.graph.byId.get(f.id);
    if (!node) return;
    const cam = camRef.current;
    const { w, h, left, top } = sizeRef.current;

    // Keep the node clear of the detail card.
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

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { graph } = propsRef.current;
    const { nodes, links } = graph;

    /* Fonts — read the next/font family names off the root element. */
    const rootStyle = getComputedStyle(document.documentElement);
    const serif = rootStyle.getPropertyValue("--font-fraunces").trim() || "Georgia, serif";
    const sans = rootStyle.getPropertyValue("--font-inter").trim() || "system-ui, sans-serif";

    /* Simulation */
    const sim = forceSimulation<GNode, GLink>(nodes)
      .force(
        "link",
        forceLink<GNode, GLink>(links)
          .distance((l) => (l.kind === "prereq" ? 170 : 38 + l.source.r + l.target.r + 12))
          .strength((l) => (l.kind === "prereq" ? 0.22 : 0.75)),
      )
      .force(
        "charge",
        forceManyBody<GNode>()
          .strength((n) => (n.kind === "topic" ? -560 : -80))
          .distanceMax(650),
      )
      .force(
        "collide",
        forceCollide<GNode>()
          .radius((n) => n.r + (n.kind === "topic" ? 24 : 11))
          .strength(0.85),
      )
      .force("x", forceX<GNode>(0).strength(0.028))
      .force("y", forceY<GNode>(0).strength(0.028))
      .velocityDecay(0.42)
      .stop();
    simRef.current = sim;

    // Settle offscreen so the brain is born already shaped, then keep it breathing.
    sim.alpha(1);
    for (let i = 0; i < 320; i++) sim.tick();
    sim.alpha(0.35).alphaTarget(BASE_ALPHA);

    /* Birth stagger */
    const mount = performance.now();
    bornRef.current.clear();
    let ti = 0;
    let pi = 0;
    for (const n of nodes) {
      if (n.kind === "topic") bornRef.current.set(n.id, mount + 120 + ti++ * 55);
      else bornRef.current.set(n.id, mount + 700 + pi++ * 28);
    }

    /* Sizing */
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

    /* Fit the whole brain into view on first paint. */
    {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const n of nodes) {
        minX = Math.min(minX, (n.x ?? 0) - n.r);
        maxX = Math.max(maxX, (n.x ?? 0) + n.r);
        minY = Math.min(minY, (n.y ?? 0) - n.r);
        maxY = Math.max(maxY, (n.y ?? 0) + n.r);
      }
      const { w, h } = sizeRef.current;
      const k = Math.min(w / (maxX - minX + 240), h / (maxY - minY + 300), 1.15);
      const cam = camRef.current;
      cam.k = k * 0.6; // zoom in from slightly further away — the "waking up" motion
      cam.tk = k;
      cam.x = w / 2 - ((minX + maxX) / 2) * cam.k;
      cam.y = h / 2 - 10 - ((minY + maxY) / 2) * cam.k;
      cam.tx = w / 2 - ((minX + maxX) / 2) * k;
      cam.ty = h / 2 - 10 - ((minY + maxY) / 2) * k;
    }

    /* Coordinate helpers */
    const toWorld = (sx: number, sy: number) => {
      const c = camRef.current;
      return { x: (sx - c.x) / c.k, y: (sy - c.y) / c.k };
    };
    const pick = (sx: number, sy: number): GNode | null => {
      const { x, y } = toWorld(sx, sy);
      const slack = 5 / camRef.current.k;
      let best: GNode | null = null;
      let bestD = Infinity;
      for (const n of nodes) {
        const dx = (n.x ?? 0) - x;
        const dy = (n.y ?? 0) - y;
        const d = Math.hypot(dx, dy) - n.r - slack;
        if (d < 0 && d < bestD) {
          bestD = d;
          best = n;
        }
      }
      return best;
    };

    /* Pointer interaction */
    let down: { sx: number; sy: number; cx: number; cy: number; node: GNode | null; moved: boolean } | null = null;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      canvas.setPointerCapture(e.pointerId);
      const sx = e.clientX - sizeRef.current.left;
      const sy = e.clientY - sizeRef.current.top;
      const node = pick(sx, sy);
      down = { sx, sy, cx: camRef.current.x, cy: camRef.current.y, node, moved: false };
      if (node) {
        node.fx = node.x;
        node.fy = node.y;
        sim.alphaTarget(0.3);
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      const sx = e.clientX - sizeRef.current.left;
      const sy = e.clientY - sizeRef.current.top;
      if (down) {
        if (!down.moved && Math.hypot(sx - down.sx, sy - down.sy) > 4) down.moved = true;
        if (down.node) {
          const w = toWorld(sx, sy);
          down.node.fx = w.x;
          down.node.fy = w.y;
          canvas.style.cursor = "grabbing";
        } else if (down.moved) {
          const cam = camRef.current;
          cam.x = cam.tx = down.cx + (sx - down.sx);
          cam.y = cam.ty = down.cy + (sy - down.sy);
          canvas.style.cursor = "grabbing";
        }
        return;
      }
      const hit = pick(sx, sy);
      const id = hit?.id ?? null;
      if (id !== hoverRef.current) {
        hoverRef.current = id;
        propsRef.current.onHover(id);
      }
      canvas.style.cursor = hit ? "pointer" : "grab";
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!down) return;
      const { node, moved } = down;
      down = null;
      canvas.style.cursor = node ? "pointer" : "grab";
      if (node) {
        node.fx = null;
        node.fy = null;
        sim.alphaTarget(BASE_ALPHA);
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
      // zoom about the cursor using the *target* camera so wheel bursts feel continuous
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

    /* ── Render loop ─────────────────────────────────────────────────── */
    let raf = 0;
    let last = performance.now();

    const drawEdge = (l: GLink, t: number, alpha: number, highlighted: boolean, va: NodeVisual, vb: NodeVisual) => {
      const a = l.source;
      const b = l.target;
      const ax = a.x ?? 0, ay = a.y ?? 0, bx = b.x ?? 0, by = b.y ?? 0;
      const dx = bx - ax, dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;
      // trim to node boundaries
      const sx = ax + ux * (a.r + 2), sy = ay + uy * (a.r + 2);
      const ex = bx - ux * (b.r + (l.kind === "prereq" ? 9 : 3)), ey = by - uy * (b.r + (l.kind === "prereq" ? 9 : 3));
      const mx = (sx + ex) / 2, my = (sy + ey) / 2;
      const bend = (a.phase > b.phase ? 1 : -1) * (l.kind === "prereq" ? 0.22 : 0.16) * len;
      const cx = mx - uy * bend, cy = my + ux * bend;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx, cy, ex, ey);

      if (l.kind === "prereq") {
        const g = ctx.createLinearGradient(sx, sy, ex, ey);
        g.addColorStop(0, rgba(va.color, alpha));
        g.addColorStop(1, rgba(vb.color, alpha));
        ctx.strokeStyle = g;
        ctx.lineWidth = highlighted ? 2.2 : 1.4;
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = -((t * 26) % 14);
        ctx.stroke();
        ctx.setLineDash([]);
        // arrowhead, tangent at end of the quadratic = (end - control)
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
      } else {
        ctx.strokeStyle = rgba(va.color, alpha);
        ctx.lineWidth = highlighted ? 1.8 : 1;
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(64, now - last);
      last = now;
      const t = now / 1000;
      const { visuals, selectedId, graph, cardRef } = propsRef.current;
      const hoverId = hoverRef.current;
      const { w, h, dpr, left, top } = sizeRef.current;
      const cam = camRef.current;

      /* camera glide */
      const ease = 1 - Math.pow(0.001, dt / 1000); // frame-rate independent
      cam.x += (cam.tx - cam.x) * ease;
      cam.y += (cam.ty - cam.y) * ease;
      cam.k += (cam.tk - cam.k) * ease;

      /* ambient drift — the brain never fully sleeps */
      for (const n of nodes) {
        if (n.fx != null) continue;
        const amp = n.kind === "topic" ? 0.05 : 0.09;
        n.vx = (n.vx ?? 0) + Math.sin(t * 0.55 + n.phase) * amp;
        n.vy = (n.vy ?? 0) + Math.cos(t * 0.41 + n.phase * 1.7) * amp;
      }
      sim.tick();

      /* neighbourhood of the active node */
      const activeId = selectedId ?? hoverId;
      const hood = activeId ? graph.neighbors.get(activeId) : null;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.k, cam.k);
      ctx.lineCap = "round";

      /* edges */
      for (const l of links) {
        const va = visuals.get(l.source.id);
        const vb = visuals.get(l.target.id);
        if (!va || !vb) continue;
        const related = !!activeId && (l.source.id === activeId || l.target.id === activeId);
        const dimmed = va.dim || vb.dim || (!!activeId && !related && !!selectedId);
        const base = l.kind === "prereq" ? 0.42 : 0.2;
        let alpha = related ? 0.85 : dimmed ? base * 0.18 : base;
        // birth fade
        const bb = Math.max(bornRef.current.get(l.source.id) ?? 0, bornRef.current.get(l.target.id) ?? 0);
        const age = (now - bb) / 700;
        if (age < 0) continue;
        if (age < 1) alpha *= easeOutCubic(age);
        drawEdge(l, t, alpha, related, va, vb);
      }

      /* nodes */
      for (const n of nodes) {
        const v = visuals.get(n.id);
        if (!v) continue;
        const born = bornRef.current.get(n.id) ?? 0;
        const age = (now - born) / 650;
        if (age < 0) continue;
        const scale = age < 1 ? easeOutBack(age) : 1;
        const x = n.x ?? 0, y = n.y ?? 0;
        const r = n.r * scale;
        const isSel = n.id === selectedId;
        const isHover = n.id === hoverId;
        const inHood = !!hood && hood.has(n.id);
        const dim = v.dim || (!!selectedId && !isSel && !inHood);
        const A = dim ? 0.22 : 1;

        /* glow */
        const due = v.status === "due";
        const nag = due ? 0.55 + 0.45 * Math.sin(t * (2.2 + Math.min(3, v.overdueDays ?? 0) * 0.6) + n.phase) : 0;
        const glowR = r * (n.kind === "topic" ? 2.4 : 2.6) + (due ? nag * 6 : 0);
        const glowA = (v.status === "locked" ? 0.06 : n.kind === "topic" ? 0.28 : 0.22) + (due ? 0.28 * nag : 0);
        if (v.status !== "pending") {
          const g = ctx.createRadialGradient(x, y, r * 0.4, x, y, glowR);
          g.addColorStop(0, rgba(v.color, glowA * A));
          g.addColorStop(1, rgba(v.color, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        /* due: expanding nag rings */
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
          /* body */
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = v.status === "locked" ? rgba("#1a1e28", 0.95 * A) : rgba(v.color, 0.16 * A);
          ctx.fill();
          ctx.strokeStyle = rgba(v.color, (v.status === "locked" ? 0.55 : 0.95) * A);
          ctx.lineWidth = 1.6;
          if (v.status === "next") {
            ctx.setLineDash([4, 5]);
            ctx.lineDashOffset = -((t * 12) % 9);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          // inner core
          ctx.beginPath();
          ctx.arc(x, y, r * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = rgba(v.color, (v.status === "locked" ? 0.25 : 0.8) * A);
          ctx.fill();
          // orbiting "up next" satellite
          if (v.status === "next") {
            const oa = t * 1.4 + n.phase;
            ctx.beginPath();
            ctx.arc(x + Math.cos(oa) * (r + 7), y + Math.sin(oa) * (r + 7), 2.4, 0, Math.PI * 2);
            ctx.fillStyle = rgba(v.color, 0.95 * A);
            ctx.fill();
          }
          // locked glyph
          if (v.status === "locked") {
            ctx.strokeStyle = rgba("#9aa1b3", 0.6 * A);
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.arc(x, y - 2.5, 3, Math.PI, 0);
            ctx.stroke();
            ctx.fillStyle = rgba("#9aa1b3", 0.6 * A);
            ctx.fillRect(x - 4.2, y - 2.5, 8.4, 6);
          }
          /* mastery ring */
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
          /* problem body */
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          if (v.status === "pending") {
            ctx.fillStyle = rgba("#0d1018", 0.9 * A);
            ctx.fill();
            ctx.setLineDash([2.5, 3]);
            ctx.strokeStyle = rgba(v.color, 0.9 * A);
            ctx.lineWidth = 1.3;
            ctx.stroke();
            ctx.setLineDash([]);
          } else {
            ctx.fillStyle = rgba(v.color, A);
            ctx.fill();
            // specular
            ctx.beginPath();
            ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = rgba("#ffffff", 0.35 * A);
            ctx.fill();
          }
          /* difficulty ring */
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

        /* hover / selection */
        if (isSel || isHover) {
          const rr = r + (n.kind === "topic" ? 10 : 8) + (isSel ? 1.5 * Math.sin(t * 3) : 0);
          ctx.beginPath();
          ctx.arc(x, y, rr, 0, Math.PI * 2);
          ctx.strokeStyle = rgba("#ffffff", isSel ? 0.85 : 0.4);
          ctx.lineWidth = isSel ? 1.4 : 1;
          ctx.stroke();
        }
      }

      /* locating pulses */
      pulsesRef.current = pulsesRef.current.filter((p) => now - p.t0 < 1500);
      for (const p of pulsesRef.current) {
        const n = graph.byId.get(p.id);
        if (!n) continue;
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

      /* labels — screen space so type stays crisp */
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const kLabel = Math.min(1, Math.max(0, (cam.k - 0.75) / 0.45)); // problem labels fade in as you zoom
      for (const n of nodes) {
        const v = visuals.get(n.id);
        if (!v) continue;
        const born = bornRef.current.get(n.id) ?? 0;
        const age = (now - born - 200) / 500;
        if (age < 0) continue;
        const isSel = n.id === selectedId;
        const isHover = n.id === hoverId;
        const inHood = !!hood && hood.has(n.id);
        const dim = v.dim || (!!selectedId && !isSel && !inHood);
        const sx = (n.x ?? 0) * cam.k + cam.x;
        const sy = (n.y ?? 0) * cam.k + cam.y + (n.r + (n.kind === "topic" ? 9 : 6)) * cam.k;
        if (sx < -120 || sx > w + 120 || sy < -40 || sy > h + 40) continue;

        let alpha: number;
        if (n.kind === "topic") {
          alpha = dim ? 0.25 : v.status === "locked" ? 0.6 : 0.92;
          ctx.font = `500 ${isSel ? 15 : 13.5}px ${serif}`;
        } else {
          const forced = isSel || isHover || inHood || v.status === "due";
          alpha = forced ? (dim ? 0.3 : 0.9) : dim ? 0 : kLabel * 0.7;
          if (alpha <= 0.01) continue;
          ctx.font = `500 ${isSel ? 12 : 11}px ${sans}`;
        }
        alpha *= Math.min(1, age);
        const text = n.label;
        ctx.fillStyle = rgba("#070910", alpha * 0.85);
        ctx.fillText(text, sx + 0.8, sy + 3.8);
        ctx.fillStyle = rgba(n.kind === "topic" ? "#eef1f8" : v.status === "due" ? "#ffd58a" : "#c6ccdb", alpha);
        ctx.fillText(text, sx, sy + 3);
      }

      /* tether from selected node to the card */
      const selNode = selectedId ? graph.byId.get(selectedId) : null;
      const card = selNode ? cardRef.current?.getBoundingClientRect() : null;
      if (selNode && card && card.width > 0) {
        const v = visuals.get(selNode.id)!;
        const nx = (selNode.x ?? 0) * cam.k + cam.x;
        const ny = (selNode.y ?? 0) * cam.k + cam.y;
        const cl = card.left - left, ct = card.top - top, cr = cl + card.width, cb = ct + card.height;
        // nearest point on the card edge
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
      sim.stop();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 touch-none select-none">
      <canvas ref={canvasRef} className="block" aria-label="DSA knowledge graph" role="img" />
    </div>
  );
}
