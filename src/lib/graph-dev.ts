import { DEV_GROUP_LABEL, type DevNodeDef } from "./data-dev";
import type { GLink, GNode, Graph, SearchDoc } from "./graph";

export const DEV_PREFIX = "dev:";
export const devId = (id: string) => `${DEV_PREFIX}${id}`;

export function devIndex(list: DevNodeDef[]) {
  return new Map(list.map((d) => [devId(d.id), d]));
}

export function devRadius(d: DevNodeDef) {
  switch (d.kind) {
    case "identity":
      return 30;
    case "hub":
      return d.group === "learning" ? 15 : 20;
    case "item":
      return d.crown ? 12 : 9;
    case "sub":
      return 5.5;
    case "learning":
      return 7;
    case "skill":
      return 4.5;
  }
}

/** Skills orbit the identity on this ring. */
export const SKILL_ORBIT = 138;

function seeded(s: number) {
  const x = Math.sin(s * 9999.1) * 10000;
  return x - Math.floor(x);
}

export function buildDevGraph(list: DevNodeDef[]): Graph {
  const nodes: GNode[] = [];
  const byId = new Map<string, GNode>();
  const defById = new Map(list.map((d) => [d.id, d]));
  const hubs = list.filter((d) => d.kind === "hub");
  const hubAngles = new Map<string, number>();
  hubs.forEach((h, i) => hubAngles.set(h.id, -Math.PI / 2 + (i / hubs.length) * Math.PI * 2));
  const skills = list.filter((d) => d.kind === "skill");
  const hubOf = (d: DevNodeDef): string | undefined => {
    let cur: DevNodeDef | undefined = d;
    while (cur && cur.kind !== "hub") cur = cur.parent ? defById.get(cur.parent) : undefined;
    return cur?.id;
  };

  list.forEach((d, i) => {
    let x = 0;
    let y = 0;
    if (d.kind === "hub") {
      const a = hubAngles.get(d.id)!;
      x = Math.cos(a) * 240;
      y = Math.sin(a) * 240;
    } else if (d.kind === "skill") {
      const k = skills.indexOf(d);
      const a = (k / skills.length) * Math.PI * 2;
      x = Math.cos(a) * SKILL_ORBIT;
      y = Math.sin(a) * SKILL_ORBIT;
    } else if (d.kind !== "identity") {
      const a = (hubAngles.get(hubOf(d) ?? "") ?? 0) + (seeded(i) - 0.5) * 1.3;
      const dist = 240 + (d.kind === "sub" ? 120 : 80) + seeded(i + 40) * 30;
      x = Math.cos(a) * dist;
      y = Math.sin(a) * dist;
    }
    const n: GNode = {
      id: devId(d.id),
      brain: "dev",
      kind: d.kind,
      label: d.label,
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
  for (const d of list) {
    if (d.parent) {
      const source = byId.get(devId(d.parent));
      const target = byId.get(devId(d.id));
      if (source && target) links.push({ kind: d.group === "learning" ? "learning" : "tree", source, target });
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
  // the constellation belongs to the core: hovering it lights up every skill
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

export function buildDevSearchDocs(list: DevNodeDef[]): SearchDoc[] {
  return list.map((d) => ({
    id: devId(d.id),
    kind: "dev",
    primary: d.label,
    secondary: `${DEV_GROUP_LABEL[d.group]}${d.meta ? ` · ${d.meta}` : ""}`,
    haystack: `${d.label} ${d.group} ${d.meta ?? ""} ${(d.skills ?? []).join(" ")} ${d.blurb ?? ""}`.toLowerCase(),
  }));
}
