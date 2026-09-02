"use client";

import { useState } from "react";
import { STATUS_COLOR, topicById } from "@/lib/graph";
import { formatDate, type DerivedProblem } from "@/lib/schedule";

interface Props {
  due: DerivedProblem[];
  nextScheduled: DerivedProblem | null;
  selectedId: string | null;
  onPick: (id: string) => void;
  onMarkRedone: (id: string) => void;
}

export default function RedoTray({ due, nextScheduled, selectedId, onPick, onMarkRedone }: Props) {
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 640);
  const count = due.length;

  if (count === 0) {
    return (
      <div className="pointer-events-auto absolute bottom-3 left-3 z-20 hidden animate-rise sm:block">
        <div className="glass flex h-10 items-center gap-2.5 rounded-full pl-3 pr-4 text-[12.5px] text-mist/70">
          <span className="h-2 w-2 rounded-full bg-done shadow-[0_0_10px_rgba(127,217,166,.8)]" />
          Nothing due.
          {nextScheduled && (
            <button onClick={() => onPick(nextScheduled.id)} className="text-mist/50 transition hover:text-white">
              Next: <span className="text-mist/80">{nextScheduled.lc ? `LC ${nextScheduled.lc}` : nextScheduled.title}</span> on {formatDate(nextScheduled.nextDue)}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="pointer-events-auto absolute bottom-3 left-3 z-20 flex h-11 items-center gap-2.5 rounded-full bg-due pl-3 pr-4 text-[13px] font-medium text-ink animate-nag"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ink" />
        </span>
        {count} redo{count > 1 ? "s" : ""} waiting
        <span className="opacity-60">↑</span>
      </button>
    );
  }

  return (
    <section
      className="pointer-events-auto absolute bottom-3 left-3 z-20 w-[calc(100vw-1.5rem)] animate-rise sm:w-[440px]"
      aria-label="Redos due today"
    >
      <div className="glass overflow-hidden rounded-3xl border-due/25 animate-nag">
        <div className="relative flex items-center gap-3 px-4 pt-3.5 pb-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-due opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-due" />
          </span>
          <h3 className="whitespace-nowrap font-serif text-[17px] text-white">
            {count} redo{count > 1 ? "s" : ""} <span className="italic text-due">due today</span>
          </h3>
          <span className="ml-auto hidden whitespace-nowrap text-[10.5px] uppercase tracking-[0.14em] text-mist/40 sm:block">synapses fading</span>
          <span className="ml-auto sm:hidden" />
          <button onClick={() => setCollapsed(true)} className="grid h-7 w-7 place-items-center rounded-full text-mist/50 transition hover:bg-white/10 hover:text-white" aria-label="Collapse">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <ul className="max-h-[38dvh] overflow-y-auto px-2 pb-2">
          {due.map((p, i) => {
            const active = p.id === selectedId;
            return (
              <li key={p.id} className="animate-rise" style={{ animationDelay: `${i * 40}ms` }}>
                <div className={`group flex items-center gap-3 rounded-2xl px-2 py-1.5 transition ${active ? "bg-white/8" : "hover:bg-white/5"}`}>
                  <button onClick={() => onPick(p.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-due shadow-[0_0_12px_rgba(245,181,63,.9)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-white">
                        {p.lc && <span className="mr-1.5 text-mist/50">{p.lc}</span>}
                        {p.title}
                      </span>
                      <span className="block truncate text-[11px] text-mist/50">
                        {topicById.get(p.topics[0])!.short} · {p.difficulty} ·{" "}
                        <span style={{ color: p.overdueDays > 0 ? STATUS_COLOR.due : undefined }}>{p.overdueDays > 0 ? `${p.overdueDays}d overdue` : "due today"}</span>
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => onMarkRedone(p.id)}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-due/40 px-3 text-[12px] font-medium text-due transition hover:bg-due hover:text-ink active:scale-95"
                  >
                    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none">
                      <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Redone
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
