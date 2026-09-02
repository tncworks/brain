"use client";

import { useState } from "react";
import { prerequisites, REDO_LADDER, type TopicId } from "@/lib/data";
import { DIFFICULTY_COLOR, STATUS_COLOR, STATUS_LABEL, problemVisualStatus, topicById, topicVisualStatus, type GNode } from "@/lib/graph";
import { formatDate, problemToDataLine, type DerivedProblem } from "@/lib/schedule";

interface Props {
  cardRef: React.RefObject<HTMLDivElement | null>;
  node: GNode;
  derived: Map<string, DerivedProblem>;
  byTopic: Map<TopicId, string[]>;
  today: string;
  topicFilter: TopicId | null;
  onSelect: (id: string) => void;
  onIsolate: (id: TopicId | null) => void;
  onMarkRedone: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export default function NodeCard(props: Props) {
  const { cardRef, node, onClose } = props;
  return (
    <aside
      ref={cardRef}
      className="glass absolute inset-x-3 bottom-3 z-30 max-h-[58dvh] overflow-y-auto rounded-3xl p-5 animate-rise sm:inset-x-auto sm:right-4 sm:top-[7.25rem] sm:bottom-auto sm:max-h-[calc(100dvh-9rem)] sm:w-[350px]"
      aria-label="Node details"
    >
      <button onClick={onClose} className="absolute right-3.5 top-3.5 grid h-7 w-7 place-items-center rounded-full text-mist/50 transition hover:bg-white/10 hover:text-white" aria-label="Close">
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
          <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {node.kind === "topic" ? <TopicBody {...props} /> : <ProblemBody {...props} />}
    </aside>
  );
}

/* ── Shared bits ───────────────────────────────────────────────────────── */

function Pill({ color, children, hollow }: { color: string; children: React.ReactNode; hollow?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide"
      style={hollow ? { border: `1px solid ${color}55`, color } : { background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}33` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 text-[10.5px] uppercase tracking-[0.14em] text-mist/45">{children}</div>;
}

/* ── Problem ───────────────────────────────────────────────────────────── */

function ProblemBody({ node, derived, onSelect, onMarkRedone, onDelete }: Props) {
  const p = derived.get(node.id)!;
  const [confirm, setConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(problemToDataLine(p, p.redos));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const status = problemVisualStatus(p);
  const color = STATUS_COLOR[status];
  const dcolor = DIFFICULTY_COLOR[p.difficulty];

  const stateText =
    p.state === "due"
      ? p.overdueDays === 0
        ? "Due today"
        : `${p.overdueDays}d overdue`
      : p.state === "scheduled"
        ? `Next redo ${formatDate(p.nextDue)} · in ${-p.overdueDays}d`
        : p.state === "untracked"
          ? "Solved earlier · not on the ladder"
          : "Queued — not solved yet";

  const timeline: { label: string; date: string | null; kind: "solved" | "redo" | "next" }[] = [];
  if (p.state !== "pending") timeline.push({ label: "Solved", date: p.solvedDate, kind: "solved" });
  p.redos.forEach((d, i) => timeline.push({ label: `Redo ${i + 1}`, date: d, kind: "redo" }));
  if (p.nextDue) timeline.push({ label: p.state === "due" ? "Due" : "Next", date: p.nextDue, kind: "next" });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-8">
        <Pill color={color}>{STATUS_LABEL[status]}</Pill>
        <Pill color={dcolor} hollow>
          {p.difficulty}
        </Pill>
        {p.custom && (
          <Pill color="#c6ccdb" hollow>
            logged here
          </Pill>
        )}
      </div>
      {p.lc && <div className="text-[11px] font-medium tracking-[0.12em] text-mist/45">LEETCODE {p.lc}</div>}
      <h2 className="mt-0.5 font-serif text-[24px] leading-[1.15] text-white">{p.title}</h2>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {p.topics.map((t) => {
          const topic = topicById.get(t)!;
          const c = STATUS_COLOR[topicVisualStatus(topic)];
          return (
            <button key={t} onClick={() => onSelect(t)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-mist/80 transition hover:border-white/25 hover:text-white">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: c }} />
              {topic.short}
            </button>
          );
        })}
      </div>

      <div className="mt-5 rounded-2xl border border-white/6 bg-white/[0.03] p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[13px]" style={{ color: p.state === "due" ? color : undefined }}>
            {stateText}
          </span>
          {p.state !== "pending" && p.state !== "untracked" && (
            <span className="text-[10.5px] uppercase tracking-[0.12em] text-mist/40">
              pass {Math.min(p.redos.length + 1, REDO_LADDER.length)} · {REDO_LADDER[p.rung]}d gap
            </span>
          )}
        </div>
        {timeline.length > 0 && (
          <ol className="mt-3 flex items-start gap-0">
            {timeline.map((s, i) => (
              <li key={i} className="relative flex min-w-0 flex-1 flex-col items-start">
                {i < timeline.length - 1 && <span className="absolute left-2 top-[5px] h-px w-full bg-white/10" />}
                <span
                  className="relative z-10 h-[11px] w-[11px] rounded-full border-2 border-ink-2"
                  style={{
                    background: s.kind === "next" ? (p.state === "due" ? color : "transparent") : STATUS_COLOR.done,
                    boxShadow: s.kind === "next" ? `0 0 0 1.5px ${p.state === "due" ? color : "rgba(255,255,255,.3)"}` : undefined,
                  }}
                />
                <span className="mt-1.5 text-[10.5px] text-mist/45">{s.label}</span>
                <span className="text-[12px] text-mist/85">{formatDate(s.date)}</span>
              </li>
            ))}
          </ol>
        )}
        {p.state === "untracked" && <p className="mt-2 text-[12px] leading-relaxed text-mist/55">Mark it redone to put it on the spaced ladder ({REDO_LADDER.join(" → ")} days).</p>}
        {p.note && <p className="mt-2 text-[12px] italic leading-relaxed text-mist/60">{p.note}</p>}
      </div>

      <div className="mt-4 flex gap-2">
        {p.state !== "pending" && (
          <button
            onClick={() => onMarkRedone(p.id)}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-full text-[13px] font-medium transition active:scale-[0.98] ${
              p.state === "due" ? "bg-due text-ink shadow-[0_8px_30px_-8px_rgba(245,181,63,.7)] hover:brightness-110" : "border border-white/12 text-white hover:bg-white/8"
            }`}
          >
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Mark redone
          </button>
        )}
        {p.slug && (
          <a
            href={`https://leetcode.com/problems/${p.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="flex h-10 items-center gap-1.5 rounded-full border border-white/12 px-4 text-[13px] text-mist/85 transition hover:bg-white/8 hover:text-white"
          >
            {p.state === "pending" ? "Solve" : "Open"}
            <span className="text-[11px] opacity-60">↗</span>
          </a>
        )}
      </div>

      {p.custom && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[11.5px]">
          <button onClick={copy} className="text-mist/50 transition hover:text-white" title="Copy a data.ts line so this survives a redeploy">
            {copied ? "Copied ✓" : "Copy for data.ts"}
          </button>
          {confirm ? (
            <span className="flex items-center gap-2">
              <span className="text-mist/50">Delete this problem?</span>
              <button onClick={() => onDelete(p.id)} className="rounded-full bg-hard/20 px-2.5 py-1 text-hard transition hover:bg-hard hover:text-ink">
                Delete
              </button>
              <button onClick={() => setConfirm(false)} className="text-mist/50 hover:text-white">
                Keep
              </button>
            </span>
          ) : (
            <button onClick={() => setConfirm(true)} className="text-mist/40 transition hover:text-hard">
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Topic ─────────────────────────────────────────────────────────────── */

function TopicBody({ node, derived, byTopic, topicFilter, onSelect, onIsolate }: Props) {
  const topic = topicById.get(node.topicId)!;
  const status = topicVisualStatus(topic);
  const color = STATUS_COLOR[status];
  const ids = byTopic.get(topic.id) ?? [];
  const ps = ids.map((id) => derived.get(id)!);
  const solved = ps.filter((p) => p.state !== "pending");
  const retained = ps.filter((p) => p.redos.length > 0 && p.state !== "due");
  const dueHere = ps.filter((p) => p.state === "due");
  const needs = prerequisites.filter(([, to]) => to === topic.id).map(([from]) => topicById.get(from)!);
  const unlocks = prerequisites.filter(([from]) => from === topic.id).map(([, to]) => topicById.get(to)!);
  const isolated = topicFilter === topic.id;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 pr-8">
        <Pill color={color}>{STATUS_LABEL[status]}</Pill>
        {dueHere.length > 0 && <Pill color={STATUS_COLOR.due}>{dueHere.length} redo{dueHere.length > 1 ? "s" : ""} due</Pill>}
      </div>
      <div className="text-[11px] font-medium tracking-[0.12em] text-mist/45">TOPIC</div>
      <h2 className="mt-0.5 font-serif text-[26px] leading-[1.1] text-white">{topic.name}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-mist/65">{topic.blurb}</p>

      {ids.length > 0 && (
        <div className="mt-5">
          <div className="flex items-baseline justify-between">
            <Label>Retention</Label>
            <span className="text-[11.5px] text-mist/60">
              {retained.length} of {ids.length} retained
            </span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {ps.map((p) => {
              const c = p.state === "pending" ? "rgba(255,255,255,.08)" : p.state === "due" ? STATUS_COLOR.due : p.redos.length ? STATUS_COLOR.done : "rgba(127,217,166,.3)";
              return <span key={p.id} className="flex-1" style={{ background: c }} />;
            })}
          </div>
          <div className="mt-1.5 text-[11px] text-mist/40">
            {solved.length} solved · {solved.length - retained.length - dueHere.length} awaiting first redo · {dueHere.length} due
          </div>
        </div>
      )}

      {(needs.length > 0 || unlocks.length > 0) && (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div>
            <Label>Needs</Label>
            <Chips list={needs} onSelect={onSelect} empty="Nothing" />
          </div>
          <div>
            <Label>Unlocks</Label>
            <Chips list={unlocks} onSelect={onSelect} empty="—" />
          </div>
        </div>
      )}

      {ps.length > 0 && (
        <div className="mt-5">
          <Label>Problems</Label>
          <ul className="-mx-2 flex flex-col">
            {ps.map((p) => {
              const s = problemVisualStatus(p);
              return (
                <li key={p.id}>
                  <button onClick={() => onSelect(p.id)} className="flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/6">
                    <span className="relative grid h-4 w-4 shrink-0 place-items-center">
                      <span className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${DIFFICULTY_COLOR[p.difficulty]}`, opacity: 0.8 }} />
                      <span className="h-2 w-2 rounded-full" style={{ background: s === "pending" ? "transparent" : STATUS_COLOR[s], border: s === "pending" ? `1px dashed ${STATUS_COLOR.pending}` : undefined }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-mist/90">
                        {p.lc ? <span className="mr-1.5 text-mist/45">{p.lc}</span> : null}
                        {p.title}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px]" style={{ color: s === "due" ? STATUS_COLOR.due : "rgba(198,204,219,.4)" }}>
                      {p.state === "due" ? (p.overdueDays ? `${p.overdueDays}d late` : "due") : p.state === "scheduled" ? formatDate(p.nextDue) : p.state === "pending" ? "queued" : "solved"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {ids.length > 0 && (
        <button
          onClick={() => onIsolate(topic.id)}
          className={`mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-full text-[13px] font-medium transition ${
            isolated ? "bg-white text-ink" : "border border-white/12 text-white hover:bg-white/8"
          }`}
        >
          {isolated ? "Show whole brain" : "Isolate this topic"}
        </button>
      )}
    </div>
  );
}

function Chips({ list, onSelect, empty }: { list: { id: TopicId; short: string; status: string }[]; onSelect: (id: string) => void; empty: string }) {
  if (!list.length) return <div className="text-[12px] text-mist/40">{empty}</div>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {list.map((t) => {
        const c = STATUS_COLOR[topicVisualStatus(topicById.get(t.id)!)];
        return (
          <button key={t.id} onClick={() => onSelect(t.id)} className="rounded-full border border-white/10 px-2.5 py-1 text-[11.5px] text-mist/80 transition hover:border-white/25 hover:text-white">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: c }} />
            {t.short}
          </button>
        );
      })}
    </div>
  );
}
