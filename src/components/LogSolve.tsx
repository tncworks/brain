"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { REDO_LADDER, topics, type Difficulty, type Problem, type TopicId } from "@/lib/data";
import { DIFFICULTY_COLOR, STATUS_COLOR, topicVisualStatus } from "@/lib/graph";
import { slugify, todayISO } from "@/lib/schedule";

interface Props {
  initialTitle?: string;
  suggestedTopic?: TopicId | null;
  onClose: () => void;
  onSubmit: (p: Problem) => void;
}

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

export default function LogSolve({ initialTitle = "", suggestedTopic, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [lc, setLc] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [picked, setPicked] = useState<TopicId[]>(suggestedTopic ? [suggestedTopic] : []);
  const [date, setDate] = useState(todayISO);
  const [note, setNote] = useState("");
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const valid = title.trim().length > 0 && picked.length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const firstRedo = useMemo(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d + REDO_LADDER[0]);
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [date]);

  const toggle = (id: TopicId) => setPicked((cur) => (cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id]));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const num = lc.trim() ? Number(lc.trim().replace(/^lc\s*/i, "")) : NaN;
    const t = title.trim();
    onSubmit({
      id: `u-${Date.now().toString(36)}`,
      lc: Number.isFinite(num) && num > 0 ? num : null,
      title: t,
      slug: Number.isFinite(num) && num > 0 ? slugify(t) : undefined,
      difficulty,
      topics: picked,
      solvedDate: date,
      redoDate: null,
      redoStatus: "tracked",
      note: note.trim() || undefined,
      custom: true,
    });
  };

  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-black/55 p-3 backdrop-blur-[2px] animate-fade" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} className="glass w-full max-w-[460px] rounded-3xl p-6 animate-rise" onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && valid && submit(e)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium tracking-[0.12em] text-mist/45">NEW SOLVE</div>
            <h2 className="mt-0.5 font-serif text-[24px] leading-tight text-white">Log a problem</h2>
          </div>
          <button type="button" onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-mist/50 transition hover:bg-white/10 hover:text-white" aria-label="Close">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none">
              <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-5 flex gap-2">
          <label className="w-[92px] shrink-0">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">LC #</span>
            <input value={lc} onChange={(e) => setLc(e.target.value)} inputMode="numeric" placeholder="—" className="field" />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Title</span>
            <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Two Sum" className="field" required />
          </label>
        </div>

        <div className="mt-4">
          <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Difficulty</span>
          <div className="flex gap-1 rounded-full border border-white/8 bg-white/[0.03] p-1">
            {DIFFS.map((d) => {
              const on = difficulty === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] capitalize transition ${on ? "bg-white/10 text-white" : "text-mist/55 hover:text-white"}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full border-[1.5px]" style={{ borderColor: DIFFICULTY_COLOR[d], background: on ? `${DIFFICULTY_COLOR[d]}33` : "transparent" }} />
                  {d}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Topics</span>
            <span className="text-[11px] text-mist/40">{picked.length ? `first pick is primary` : "pick at least one"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.map((t) => {
              const i = picked.indexOf(t.id);
              const on = i >= 0;
              const c = STATUS_COLOR[topicVisualStatus(t)];
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition ${on ? "border-white/40 bg-white/10 text-white" : "border-white/8 text-mist/60 hover:border-white/20 hover:text-white"}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: c }} />
                  {t.short}
                  {i === 0 && picked.length > 1 && <span className="text-[9px] uppercase tracking-wider text-mist/50">primary</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <label className="w-[160px] shrink-0">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Solved on</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field [color-scheme:dark]" required />
          </label>
          <label className="min-w-0 flex-1">
            <span className="mb-1.5 block text-[10.5px] uppercase tracking-[0.14em] text-mist/45">Note</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="the trick, in one line" className="field" />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <p className="min-w-0 flex-1 text-[12px] leading-snug text-mist/55">
            First redo lands <span className="text-due">{firstRedo ? `on ${firstRedo}` : "in 3 days"}</span>, then every {REDO_LADDER.slice(1).join(", ")} days.
          </p>
          <button type="submit" disabled={!valid} className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-[13px] font-medium text-ink transition enabled:hover:bg-done disabled:opacity-30">
            Log solve <kbd className="rounded border border-black/15 px-1 text-[10px] opacity-60">⌘↵</kbd>
          </button>
        </div>
      </form>
    </div>
  );
}
