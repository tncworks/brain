import { DEV_GROUP_COLOR, DEV_GROUP_LABEL, devNodes, type DevNodeDef } from "./data-dev";
import type { GLink, GNode, Graph, SearchDoc } from "./graph";

export const DEV_PREFIX = "dev:";
export const devId = (id: string) => `${DEV_PREFIX}${id}`;
export const devById = new Map(devNodes.map((d) => [devId(d.id), d]));

export function devRadius(d: DevNodeDef) {
  switch (d.kind) {
    case "identity":
      return 34;
    case "hub":
      return d.group === "learning" ? 16 : 22;
    case "item":
      return d.crown ? 17 : 12;
    case "learning":
      return 8;
    case "skill":
      return 5;
  }
}

/** Skills orbit the identity on this ring. */
export const SKILL_ORBIT = 118;

function seeded(s: number) {
  const x = Math.sin(s * 9999.1) * 10000;
  return x - Math.floor(x);
}

export function buildDevGraph(): Graph {
  const nodes: GNode[] = [];
  const byId = new Map<string, GNode>();
  const hubAngles = new Map<string, number>();
  const hubs = devNodes.filter((d) => d.kind === "hub");
  hubs.forEach((h, i) => hubAngles.set(h.id, -Math.PI / 2 + (i / hubs.length) * Math.PI * 2));
  const skills = devNodes.filter((d) => d.kind === "skill");

  devNodes.forEach((d, i) => {
    let x = 0;
    let y = 0;
    if (d.kind === "hub") {
      const a = hubAngles.get(d.id)!;
      x = Math.cos(a) * 210;
      y = Math.sin(a) * 210;
    } else if (d.kind === "item" || d.kind === "learning") {
      const a = (hubAngles.get(d.parent ?? "") ?? 0) + (seeded(i) - 0.5) * 1.4;
      const dist = 210 + 75 + seeded(i + 40) * 30;
      x = Math.cos(a) * dist;
      y = Math.sin(a) * dist;
    } else if (d.kind === "skill") {
      const k = skills.indexOf(d);
      const a = (k / skills.length) * Math.PI * 2;
      x = Math.cos(a) * SKILL_ORBIT;
      y = Math.sin(a) * SKILL_ORBIT;
    }
    const n: GNode = {
      id: devId(d.id),
      brain: "dev",
      kind: d.kind,
      label: d.label,
      emoji: d.emoji,
      r: devRadius(d),
      phase: seeded(i + 11) * Math.PI * 2,
      group: d.group,
      crown: d.crown,
      orbit: d.kind === "skill",
      x,
      y,
    };
    nodes.push(n);
    byId.set(n.id, n);
  });

  const links: GLink[] = [];
  for (const d of devNodes) {
    if (d.parent) {
      const source = byId.get(devId(d.parent));
      const target = byId.get(devId(d.id));
      if (source && target) links.push({ kind: d.kind === "learning" || d.group === "learning" ? "learning" : "tree", source, target });
    }
    for (const s of d.skills ?? []) {
      const source = byId.get(devId(s));
      const target = byId.get(devId(d.id));
      if (source && target) links.push({ kind: "skill", source, target });
    }
  }

  const neighbors = new Map<string, Set<string>>();
  for (const n of nodes) neighbors.set(n.id, new Set());
  for (const l of links) {
    neighbors.get(l.source.id)!.add(l.target.id);
    neighbors.get(l.target.id)!.add(l.source.id);
  }
  // the constellation belongs to the core: hovering Ayush lights up every skill
  const core = nodes.find((n) => n.kind === "identity");
  if (core) {
    for (const n of nodes) {
      if (!n.orbit) continue;
      neighbors.get(core.id)!.add(n.id);
      neighbors.get(n.id)!.add(core.id);
    }
  }
  return { nodes, links, byId, neighbors };
}

export function devColor(d: DevNodeDef) {
  return DEV_GROUP_COLOR[d.group];
}

export const devSearchDocs: SearchDoc[] = devNodes.map((d) => ({
  id: devId(d.id),
  kind: "dev",
  primary: `${d.emoji} ${d.label}`,
  secondary: `${DEV_GROUP_LABEL[d.group]}${d.meta ? ` · ${d.meta}` : ""}`,
  haystack: `${d.label} ${d.group} ${d.meta ?? ""} ${(d.skills ?? []).join(" ")} ${d.blurb ?? ""}`.toLowerCase(),
}));
