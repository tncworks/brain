"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Brain, { type FocusRequest, type NodeVisual } from "./Brain";
import TopBar from "./TopBar";
import NodeCard from "./NodeCard";
import RedoTray from "./RedoTray";
import Legend from "./Legend";
import Toast from "./Toast";
import LogSolve from "./LogSolve";
import { CURRENT_TOPIC, problems as seedProblems, topics, type Problem, type TopicId } from "@/lib/data";
import { STATUS_COLOR, buildGraph, buildSearchDocs, groupByTopic, problemVisualStatus, topicById, topicVisualStatus } from "@/lib/graph";
import {
  deriveProblem,
  formatDate,
  loadCustomProblems,
  loadRedoLog,
  saveCustomProblems,
  saveRedoLog,
  todayISO,
  type DerivedProblem,
  type RedoLog,
} from "@/lib/schedule";

export type StatusFilter = "all" | "done" | "due" | "play" | "locked";

export interface ToastState {
  key: number;
  text: string;
  undo?: () => void;
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [today, setToday] = useState("2000-01-01");
  const [log, setLog] = useState<RedoLog>({});
  const [custom, setCustom] = useState<Problem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [focus, setFocus] = useState<FocusRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [topicFilter, setTopicFilter] = useState<TopicId | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [logging, setLogging] = useState<{ title: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nonce = useRef(0);

  useEffect(() => {
    setToday(todayISO());
    setLog(loadRedoLog());
    setCustom(loadCustomProblems());
    setMounted(true);
  }, []);

  /* ── Derived data ────────────────────────────────────────────────── */
  const allProblems = useMemo(() => [...seedProblems, ...custom], [custom]);
  const graph = useMemo(() => buildGraph(allProblems), [allProblems]);
  const byTopic = useMemo(() => groupByTopic(allProblems), [allProblems]);
  const docs = useMemo(() => buildSearchDocs(allProblems), [allProblems]);

  const derived = useMemo(() => {
    const m = new Map<string, DerivedProblem>();
    for (const p of allProblems) m.set(p.id, deriveProblem(p, log[p.id] ?? [], today));
    return m;
  }, [allProblems, log, today]);

  const due = useMemo(
    () => [...derived.values()].filter((p) => p.state === "due").sort((a, b) => b.overdueDays - a.overdueDays),
    [derived],
  );
  const nextScheduled = useMemo(() => {
    const s = [...derived.values()].filter((p) => p.state === "scheduled").sort((a, b) => a.nextDue!.localeCompare(b.nextDue!));
    return s[0] ?? null;
  }, [derived]);

  const stats = useMemo(() => {
    const all = [...derived.values()];
    const solved = all.filter((p) => p.state !== "pending");
    const retained = solved.filter((p) => p.redos.length > 0 && p.state !== "due");
    return {
      solved: solved.length,
      due: due.length,
      retained: retained.length,
      topicsDone: topics.filter((t) => t.status === "done").length,
      topicsTotal: topics.length,
      currentTopic: topicById.get(CURRENT_TOPIC)!,
    };
  }, [derived, due]);

  /* ── Filters ─────────────────────────────────────────────────────── */
  const passes = useCallback(
    (id: string): boolean => {
      const node = graph.byId.get(id);
      if (!node) return true;
      if (topicFilter) {
        if (node.kind === "topic" && node.id !== topicFilter) return false;
        if (node.kind === "problem" && !derived.get(id)!.topics.includes(topicFilter)) return false;
      }
      if (statusFilter === "all") return true;
      if (node.kind === "topic") {
        const t = topicById.get(node.topicId)!;
        const ids = byTopic.get(t.id) ?? [];
        switch (statusFilter) {
          case "done":
            return t.status === "done";
          case "due":
            return ids.some((pid) => derived.get(pid)!.state === "due");
          case "play":
            return t.status === "next" || t.status === "in-progress" || ids.some((pid) => derived.get(pid)!.state === "pending");
          case "locked":
            return t.status === "locked";
        }
      }
      const p = derived.get(id)!;
      switch (statusFilter) {
        case "done":
          return p.state === "scheduled" || p.state === "untracked";
        case "due":
          return p.state === "due";
        case "play":
          return p.state === "pending";
        case "locked":
          return false;
      }
    },
    [graph, byTopic, derived, statusFilter, topicFilter],
  );

  const visuals = useMemo(() => {
    const m = new Map<string, NodeVisual>();
    for (const t of topics) {
      const ids = byTopic.get(t.id) ?? [];
      let mastery: number | undefined;
      if (ids.length) {
        const solved = ids.filter((id) => derived.get(id)!.state !== "pending");
        const retained = ids.filter((id) => {
          const p = derived.get(id)!;
          return p.redos.length > 0 && p.state !== "due";
        });
        mastery = solved.length ? retained.length / ids.length : 0;
      }
      const status = topicVisualStatus(t);
      m.set(t.id, { status, color: STATUS_COLOR[status], mastery, dim: !passes(t.id) });
    }
    for (const p of derived.values()) {
      const status = problemVisualStatus(p);
      m.set(p.id, {
        status,
        color: STATUS_COLOR[status],
        difficulty: p.difficulty,
        overdueDays: p.state === "due" ? p.overdueDays : undefined,
        dim: !passes(p.id),
      });
    }
    return m;
  }, [byTopic, derived, passes]);

  /* ── Actions ─────────────────────────────────────────────────────── */
  const select = useCallback(
    (id: string | null, opts: { color?: string; zoom?: number } = {}) => {
      setSelectedId(id);
      if (id) {
        const v = visuals.get(id);
        setFocus({ id, nonce: ++nonce.current, color: opts.color ?? v?.color, zoom: opts.zoom });
      }
    },
    [visuals],
  );

  const markRedone = useCallback(
    (id: string) => {
      const before = log;
      const next: RedoLog = { ...log, [id]: Array.from(new Set([...(log[id] ?? []), today])).sort() };
      setLog(next);
      saveRedoLog(next);
      const after = deriveProblem(derived.get(id)!, next[id], today);
      const label = after.lc ? `LC ${after.lc}` : after.title;
      setToast({
        key: Date.now(),
        text: `${label} redone · next pass ${formatDate(after.nextDue)}`,
        undo: () => {
          setLog(before);
          saveRedoLog(before);
          setToast(null);
        },
      });
      setSelectedId(id);
      setFocus({ id, nonce: ++nonce.current, color: STATUS_COLOR.done });
    },
    [log, today, derived],
  );

  const addProblem = useCallback(
    (p: Problem) => {
      const next = [...custom, p];
      setCustom(next);
      saveCustomProblems(next);
      setLogging(null);
      setSelectedId(p.id);
      setFocus({ id: p.id, nonce: ++nonce.current, color: STATUS_COLOR.done, zoom: 1.5 });
      const d = deriveProblem(p, [], today);
      setToast({ key: Date.now(), text: `${p.lc ? `LC ${p.lc}` : p.title} logged · first redo ${formatDate(d.nextDue)}` });
    },
    [custom, today],
  );

  const deleteProblem = useCallback(
    (id: string) => {
      const removed = custom.find((p) => p.id === id);
      if (!removed) return;
      const next = custom.filter((p) => p.id !== id);
      const nextLog = { ...log };
      const removedLog = nextLog[id];
      delete nextLog[id];
      setCustom(next);
      saveCustomProblems(next);
      setLog(nextLog);
      saveRedoLog(nextLog);
      setSelectedId(null);
      setToast({
        key: Date.now(),
        text: `${removed.lc ? `LC ${removed.lc}` : removed.title} deleted`,
        undo: () => {
          const restored = [...next, removed];
          setCustom(restored);
          saveCustomProblems(restored);
          if (removedLog) {
            const l = { ...nextLog, [id]: removedLog };
            setLog(l);
            saveRedoLog(l);
          }
          setToast(null);
        },
      });
    },
    [custom, log],
  );

  const isolate = useCallback((id: TopicId | null) => {
    setTopicFilter((cur) => (cur === id ? null : id));
  }, []);

  const lock = useCallback(async () => {
    try {
      await fetch("/api/unlock", { method: "DELETE" });
    } finally {
      window.location.assign("/unlock");
    }
  }, []);

  /* ── Keyboard ────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("brain-search")?.focus();
        return;
      }
      if (typing || logging) return;
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("brain-search")?.focus();
      } else if (e.key === "n") {
        e.preventDefault();
        setLogging({ title: "" });
      } else if (e.key === "Escape") {
        if (selectedId) setSelectedId(null);
        else {
          setStatusFilter("all");
          setTopicFilter(null);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, logging]);

  useEffect(() => {
    if (!mounted) return;
    document.title = due.length ? `(${due.length}) DSA Brain` : "DSA Brain";
  }, [due.length, mounted]);

  const selectedNode = selectedId ? graph.byId.get(selectedId) ?? null : null;
  const hoverNode = hoverId ? graph.byId.get(hoverId) ?? null : null;
  const suggestedTopic: TopicId | null = selectedNode ? selectedNode.topicId : topicFilter;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-ink text-mist">
      <div className="backdrop" aria-hidden />
      {mounted ? (
        <Brain
          graph={graph}
          visuals={visuals}
          selectedId={selectedId}
          onSelect={(id) => select(id)}
          onHover={setHoverId}
          focus={focus}
          cardRef={cardRef}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center">
          <div className="font-serif text-xl italic text-mist/40 animate-pulse">waking up…</div>
        </div>
      )}
      <div className="grain" aria-hidden />

      <TopBar
        stats={stats}
        docs={docs}
        statusFilter={statusFilter}
        onStatusFilter={setStatusFilter}
        topicFilter={topicFilter}
        onTopicFilter={setTopicFilter}
        onPick={(id) => select(id, { zoom: 1.5 })}
        onCurrentTopic={() => select(CURRENT_TOPIC)}
        onLog={(title) => setLogging({ title: title ?? "" })}
        hoverLabel={
          hoverNode && hoverNode.id !== selectedId
            ? hoverNode.kind === "topic"
              ? topicById.get(hoverNode.topicId)!.name
              : derived.get(hoverNode.id)!.title
            : null
        }
      />

      {selectedNode && (
        <NodeCard
          key={selectedNode.id}
          cardRef={cardRef}
          node={selectedNode}
          derived={derived}
          byTopic={byTopic}
          today={today}
          topicFilter={topicFilter}
          onSelect={(id) => select(id)}
          onIsolate={isolate}
          onMarkRedone={markRedone}
          onDelete={deleteProblem}
          onClose={() => setSelectedId(null)}
        />
      )}

      {mounted && (
        <RedoTray
          due={due}
          nextScheduled={nextScheduled}
          selectedId={selectedId}
          onPick={(id) => select(id, { zoom: 1.6 })}
          onMarkRedone={markRedone}
        />
      )}

      <Legend onLock={lock} />

      {toast && <Toast toast={toast} onDone={() => setToast(null)} />}

      {logging && <LogSolve initialTitle={logging.title} suggestedTopic={suggestedTopic} onClose={() => setLogging(null)} onSubmit={addProblem} />}
    </div>
  );
}
