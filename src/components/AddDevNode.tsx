"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DEV_GROUP_COLOR, DEV_GROUP_LABEL, type DevGroup, type DevKind, type DevNodeDef } from "@/lib/data-dev";

interface Props {
  all: DevNodeDef[];
  parent: string;
  onClose: () => void;
  onSubmit: (d: DevNodeDef) => void;
}

const KINDS: { id: DevKind; label: string; hint: string }[] = [
  { id: "item", label: "Item", hint: "a project, role, or thing you did" },
  { id: "sub", label: "Detail", hint: "a feature or fact under an item" },
  { id: "learning", label: "Next up", hint: "dashed, dim, not yet" },
  { id: "skill", label: "Skill", hint: "orbits the core" },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function AddDevNode({ all, parent, onClose, onSubmit }: Props) {
  const parents = useMemo(() => all.filter((d) => d.kind === "identity" || d.kind === "hub" || d.kind === "item"), [all]);
  const skillsList = useMemo(() => all.filter((d) => d.kind === "skill"), [all]);
  const [parentId, setParentId] = useState(parent);
  const [kind, setKind] = useState<DevKind>(() => (all.find((d) => d.id === parent)?.kind === "item" ? "sub" : "item"));
  const [label, setLabel] = useState("");
  const [meta, setMeta] = useState("");
  const [blurb, setBlurb] = useState("");
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<"" | "live" | "shipped" | "wip">("");
  const [picked, setPicked] = useState<string[]>([]);
  const labelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    labelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const parentDef = all.find((d) => d.id === parentId);
  const group: DevGroup = kind === "skill" ? "skills" : kind === "learning" ? "learning" : parentDef?.group === "identity" ? "projects" : (parentDef?.group ?? "projects");
  const valid = label.trim().length > 0 && (kind === "skill" || !!parentDef);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const base = slug(label) || "node";
    let id = base;
    let i = 2;
    while (all.some((d) => d.id === id)) id = `${base}-${i++}`;
    onSubmit({
      id,
      kind,
      group,
      label: label.trim(),
      parent: kind === "skill" ? undefined : parentId,
      meta: meta.trim() || undefined,
      blurb: blurb.trim() || undefined,
      url: url.trim() || undefined,
      status: status || undefined,
      skills: picked.length ? picked : undefined,
      custom: true,
    });
  };

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/55 p-3 backdrop-blur-[2px] animate-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="glass max-h-[92dvh] w-full max-w-[460px] overflow-y-auto rounded-3xl p-6 animate-rise" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && valid && submit(e)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium tracking-[0.12em] text-mist/45">DEV BRAIN</div>
            <h2 className="mt-0.5 font-serif text-[24px] leading-tight text-white">Add a node</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-mist/50 transition hover:bg-white/10 hover:text-white" aria-label="Close">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5">
          <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Kind</span>
          <div className="flex gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
            {KINDS.map((k) => (
              <button key={k.id} type="button" onClick={() => setKind(k.id)} title={k.hint} className={`h-8 flex-1 rounded-full text-[12.5px] transition ${kind === k.id ? "bg-white/10 text-white" : "text-mist/55 hover:text-white"}`}>
                {k.label}
              </button>
            ))}
          </div>
          <div className="mt-1.5 text-[11px] text-mist/40">{KINDS.find((k) => k.id === kind)?.hint}</div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Label</span>
          <input ref={labelRef} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="What is it called?" className="field" required />
        </label>

        {kind !== "skill" && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Hangs off</span>
            <div className="relative">
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="field cursor-pointer appearance-none pr-8">
                {parents.map((p) => (
                  <option key={p.id} value={p.id} className="bg-ink-2">
                    {p.label} · {p.kind === "identity" ? "core" : DEV_GROUP_LABEL[p.group]}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-mist/50" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-mist/40">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: DEV_GROUP_COLOR[group] }} />
              colours as {DEV_GROUP_LABEL[group].toLowerCase()}
            </div>
          </label>
        )}

        <div className="mt-4 flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">One-liner</span>
            <input value={meta} onChange={(e) => setMeta(e.target.value)} placeholder="role · event · year" className="field" />
          </label>
          {(kind === "item" || kind === "sub") && (
            <label className="w-[130px] shrink-0">
              <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Status</span>
              <div className="relative">
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="field cursor-pointer appearance-none pr-8">
                  <option value="" className="bg-ink-2">—</option>
                  <option value="live" className="bg-ink-2">live</option>
                  <option value="shipped" className="bg-ink-2">shipped</option>
                  <option value="wip" className="bg-ink-2">in progress</option>
                </select>
                <svg className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-mist/50" viewBox="0 0 12 12" fill="none">
                  <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </label>
          )}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Blurb</span>
          <textarea value={blurb} onChange={(e) => setBlurb(e.target.value)} placeholder="What it is, why it mattered." rows={2} className="field h-auto resize-none py-2.5" />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Link</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" className="field" />
        </label>

        {kind !== "skill" && skillsList.length > 0 && (
          <div className="mt-4">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Built with</span>
            <div className="flex flex-wrap gap-1.5">
              {skillsList.map((sk) => {
                const on = picked.includes(sk.id);
                return (
                  <button key={sk.id} type="button" onClick={() => setPicked((c) => (on ? c.filter((x) => x !== sk.id) : [...c, sk.id]))} className={`rounded-full border px-2.5 py-1 text-[11.5px] transition ${on ? "border-white/40 bg-white/10 text-white" : "border-white/8 text-mist/60 hover:border-white/20 hover:text-white"}`}>
                    {sk.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-[12px] leading-snug text-mist/45">Saved to the cloud, synced to every device.</p>
          <button type="submit" disabled={!valid} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-medium text-ink transition enabled:hover:bg-done disabled:opacity-30">
            Add node <kbd className="rounded border border-black/15 px-1 text-[10px] opacity-60">⌘↵</kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
