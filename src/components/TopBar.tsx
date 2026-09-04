"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BrainFocus, StatusFilter } from "./App";
import { topics, type Topic, type TopicId } from "@/lib/data";
import { search, type SearchDoc } from "@/lib/graph";
import type { SyncStatus } from "@/lib/store";

interface Stats {
  solved: number;
  due: number;
  retained: number;
  topicsDone: number;
  topicsTotal: number;
  currentTopic: Topic;
}

interface Props {
  stats: Stats;
  sync: SyncStatus;
  docs: SearchDoc[];
  statusFilter: StatusFilter;
  onStatusFilter: (f: StatusFilter) => void;
  topicFilter: TopicId | null;
  onTopicFilter: (t: TopicId | null) => void;
  onPick: (id: string) => void;
  onCurrentTopic: () => void;
  onLog: (title?: string) => void;
  brainFocus: BrainFocus;
  onBrainFocus: (b: BrainFocus) => void;
  hoverLabel: string | null;
}

const BRAINS: { id: BrainFocus; label: string; dot: string }[] = [
  { id: "both", label: "Both", dot: "bg-white" },
  { id: "dsa", label: "DSA", dot: "bg-done" },
  { id: "dev", label: "Dev", dot: "bg-[#ff9f43]" },
];

const CHIPS: { id: StatusFilter; label: string; dot?: string }[] = [
  { id: "all", label: "All" },
  { id: "done", label: "Done", dot: "bg-done" },
  { id: "due", label: "Redo due", dot: "bg-due" },
  { id: "play", label: "In play", dot: "bg-progress" },
  { id: "locked", label: "Locked", dot: "bg-locked" },
];

export default function TopBar({ stats, sync, docs, statusFilter, onStatusFilter, topicFilter, onTopicFilter, onPick, onCurrentTopic, onLog, brainFocus, onBrainFocus, hoverLabel }: Props) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Wordmark */}
        <div className="pointer-events-auto glass flex h-11 items-center gap-3 rounded-full pl-4 pr-4" title={SYNC_HINT[sync]}>
          <SyncDot sync={sync} />
          <span className="font-serif text-[19px] leading-none tracking-tight text-white">Brain</span>
          <span className={`-ml-1 text-[10px] uppercase tracking-[0.14em] ${SYNC_TONE[sync]}`}>{SYNC_LABEL[sync]}</span>
        </div>

        <Search docs={docs} onPick={onPick} onLog={onLog} />

        <button
          onClick={() => onLog()}
          className="pointer-events-auto ml-auto flex h-11 shrink-0 items-center gap-2 rounded-full bg-white pl-3.5 pr-4 sm:ml-0 text-[13px] font-medium text-ink shadow-[0_10px_30px_-12px_rgba(255,255,255,.5)] transition hover:bg-done active:scale-[0.98]"
          title="Log a new solve (n)"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Log solve
        </button>

        {/* Vitals */}
        <div className="pointer-events-auto glass hidden h-11 items-center divide-x divide-white/8 rounded-full px-1 md:flex">
          <Vital label="solved" value={stats.solved} />
          <Vital label="retained" value={stats.retained} sub={`/ ${stats.solved}`} />
          <button
            onClick={() => onStatusFilter(statusFilter === "due" ? "all" : "due")}
            className={`group flex h-full items-center gap-2 px-4 text-left transition ${stats.due ? "text-due" : "text-mist/70"}`}
            title="Filter to redos due"
          >
            <span className={`font-serif text-[22px] leading-none ${stats.due ? "animate-[nagtext_1.8s_ease-in-out_infinite]" : ""}`}>{stats.due}</span>
            <span className="text-[10.5px] uppercase tracking-[0.14em] opacity-70">due today</span>
          </button>
          <button onClick={onCurrentTopic} className="flex h-full items-center gap-2 px-4 text-left transition hover:text-white" title="Jump to current topic">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-mist/60">now</span>
            <span className="font-serif text-[15px] italic text-progress">{stats.currentTopic.name}</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
        <div className="pointer-events-auto glass flex h-9 shrink-0 items-center gap-0.5 rounded-full p-1" title="Focus a brain (1 / 2 / 3)">
          {BRAINS.map((b) => {
            const active = brainFocus === b.id;
            return (
              <button
                key={b.id}
                onClick={() => onBrainFocus(b.id)}
                className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] transition ${
                  active ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-mist/65 hover:text-white"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${b.dot}`} />
                {b.label}
              </button>
            );
          })}
        </div>
        <div className="pointer-events-auto glass flex h-9 shrink-0 items-center gap-0.5 rounded-full p-1">
          {CHIPS.map((c) => {
            const active = statusFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => onStatusFilter(c.id)}
                className={`flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[12px] transition ${
                  active ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-mist/65 hover:text-white"
                }`}
              >
                {c.dot && <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />}
                {c.label}
              </button>
            );
          })}
        </div>

        <div className="pointer-events-auto glass relative flex h-9 shrink-0 items-center rounded-full">
          <select
            value={topicFilter ?? ""}
            onChange={(e) => onTopicFilter((e.target.value || null) as TopicId | null)}
            className={`h-full cursor-pointer appearance-none rounded-full bg-transparent pl-3.5 pr-8 text-[12px] outline-none ${topicFilter ? "text-white" : "text-mist/65"}`}
          >
            <option value="" className="bg-ink-2">All topics</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id} className="bg-ink-2">
                {t.name}
              </option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 h-3 w-3 text-mist/50" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {topicFilter && (
            <button onClick={() => onTopicFilter(null)} className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[9px] text-ink" title="Clear topic filter">
              ✕
            </button>
          )}
        </div>

        {hoverLabel && (
          <div className="pointer-events-none hidden h-9 items-center rounded-full px-1 font-serif text-[14px] italic text-mist/60 animate-fade sm:flex">
            {hoverLabel}
          </div>
        )}
      </div>
    </header>
  );
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  booting: "",
  off: "local",
  syncing: "saving",
  synced: "synced",
  offline: "offline",
  dev: "dev store",
};
const SYNC_TONE: Record<SyncStatus, string> = {
  booting: "text-mist/40",
  off: "text-mist/40",
  syncing: "text-due",
  synced: "text-done/80",
  offline: "text-hard/80",
  dev: "text-progress/80",
};
const SYNC_HINT: Record<SyncStatus, string> = {
  booting: "Connecting…",
  off: "No database connected — everything is saved in this browser only. Add Upstash Redis on Vercel to sync across devices.",
  syncing: "Saving to the cloud…",
  synced: "Saved to the cloud. Your other devices pick it up when they next open or focus the tab.",
  offline: "Couldn't reach the server. Changes are safe here and will sync when you're back online.",
  dev: "Development in-memory store (no database configured).",
};

function SyncDot({ sync }: { sync: SyncStatus }) {
  const color = sync === "synced" || sync === "dev" ? "bg-done" : sync === "syncing" ? "bg-due" : sync === "offline" ? "bg-hard" : "bg-mist/40";
  const ping = sync === "synced" || sync === "syncing";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {ping && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-40`} />}
      <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${color}`} />
    </span>
  );
}

function Vital({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="flex h-full items-center gap-2 px-4">
      <span className="font-serif text-[22px] leading-none text-white">{value}</span>
      {sub && <span className="-ml-1 text-[11px] text-mist/40">{sub}</span>}
      <span className="text-[10.5px] uppercase tracking-[0.14em] text-mist/55">{label}</span>
    </div>
  );
}

/* ── Fuzzy search ──────────────────────────────────────────────────────── */

function Search({ docs, onPick, onLog }: { docs: SearchDoc[]; onPick: (id: string) => void; onLog: (title?: string) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => search(q, docs), [q, docs]);

  useEffect(() => setCursor(0), [q]);

  const pick = (d: SearchDoc) => {
    onPick(d.id);
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };
  const logIt = () => {
    onLog(q.trim());
    setQ("");
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div className="pointer-events-auto relative order-last w-full sm:order-none sm:w-[300px]">
      <div className={`glass flex h-11 items-center gap-2 rounded-full pl-4 pr-3 transition ${open ? "ring-1 ring-white/20" : ""}`}>
        <svg className="h-4 w-4 shrink-0 text-mist/50" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <input
          id="brain-search"
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(results.length - 1, c + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(0, c - 1));
            } else if (e.key === "Enter") {
              if (results[cursor]) pick(results[cursor]);
              else if (q.trim()) logIt();
            } else if (e.key === "Escape") {
              setQ("");
              inputRef.current?.blur();
            }
          }}
          placeholder="Find a node…"
          className="w-full bg-transparent text-[13.5px] text-white placeholder:text-mist/40 outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd className="hidden shrink-0 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-sans text-[10px] text-mist/50 sm:block">⌘K</kbd>
      </div>
      {open && q.trim() && (
        <ul className="glass absolute left-0 right-0 top-[52px] overflow-hidden rounded-2xl p-1.5 animate-rise">
          {results.map((d, i) => (
            <li key={d.id}>
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(d)}
                onMouseEnter={() => setCursor(i)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${i === cursor ? "bg-white/10" : ""}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${d.kind === "topic" ? "bg-white" : "bg-mist/50"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-white">{d.primary}</span>
                  <span className="block truncate text-[11px] text-mist/50">{d.secondary}</span>
                </span>
                {i === cursor && <span className="text-[10px] text-mist/40">↵</span>}
              </button>
            </li>
          ))}
          <li className={results.length ? "mt-1 border-t border-white/6 pt-1" : ""}>
            <button onMouseDown={(e) => e.preventDefault()} onClick={logIt} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition hover:bg-white/10 ${results.length === 0 ? "bg-white/5" : ""}`}>
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white text-ink">
                <svg viewBox="0 0 16 16" className="h-2.5 w-2.5" fill="none">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-white">
                Log “{q.trim()}” as a new solve
              </span>
              {results.length === 0 && <span className="text-[10px] text-mist/40">↵</span>}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
