"use client";

import { useEffect, useRef, useState } from "react";

export default function UnlockForm() {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "checking" | "wrong" | "open">("idle");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value || state === "checking") return;
    setState("checking");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      if (res.ok) {
        setState("open");
        setTimeout(() => window.location.assign("/"), 650);
      } else {
        setState("wrong");
        setValue("");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    } catch {
      setState("wrong");
    }
  };

  const open = state === "open";

  return (
    <form onSubmit={submit} className="relative z-10 flex w-[min(92vw,380px)] flex-col items-center animate-rise">
      {/* a tiny brain: a core with four synapses that light up when the door opens */}
      <div className="relative mb-8 h-24 w-24">
        <svg viewBox="0 0 96 96" className="h-full w-full">
          <g stroke="#7fd9a6" strokeWidth="1.2" fill="none" className={`transition-opacity duration-700 ${open ? "opacity-90" : "opacity-25"}`}>
            <path d="M48 48 L26 32 M48 48 L70 28 M48 48 L30 70 M48 48 L68 66" />
          </g>
          {[
            [26, 32, "#7fd9a6"],
            [70, 28, "#6ea6ff"],
            [30, 70, "#f5b53f"],
            [68, 66, "#5a6070"],
          ].map(([x, y, c], i) => (
            <circle key={i} cx={x as number} cy={y as number} r={open ? 5 : 3.5} fill={c as string} className="transition-all duration-700" style={{ opacity: open ? 1 : 0.45 }} />
          ))}
          <circle cx="48" cy="48" r={open ? 12 : 9} fill="#7fd9a6" className="transition-all duration-700" style={{ filter: open ? "drop-shadow(0 0 14px rgba(127,217,166,.9))" : "drop-shadow(0 0 6px rgba(127,217,166,.5))" }} />
        </svg>
        <span className={`absolute inset-0 rounded-full ${open ? "" : "animate-ping"}`} style={{ background: "radial-gradient(circle, rgba(127,217,166,.18), transparent 60%)", animationDuration: "2.6s" }} />
      </div>

      <h1 className="font-serif text-[30px] leading-none tracking-tight text-white">Brain</h1>
      <p className="mt-2 text-[13px] text-mist/50">{open ? "Welcome back." : "This brain is private."}</p>

      <div
        className={`glass mt-8 flex h-12 w-full items-center gap-2 rounded-full pl-5 pr-1.5 transition ${state === "wrong" ? "animate-[shake_.4s_ease-in-out] border-hard/50" : ""} ${open ? "border-done/50" : ""}`}
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-mist/45" fill="none">
          <rect x="3" y="7" width="10" height="7" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d={open ? "M5.5 7V5a2.5 2.5 0 015 0" : "M5.5 7V5a2.5 2.5 0 015 0v2"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (state === "wrong") setState("idle");
          }}
          placeholder="Password"
          autoComplete="current-password"
          disabled={open}
          className="w-full bg-transparent text-[14px] text-white placeholder:text-mist/35 outline-none"
        />
        <button
          type="submit"
          disabled={!value || state === "checking" || open}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-ink transition enabled:hover:bg-done disabled:opacity-30"
          aria-label="Unlock"
        >
          <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none">
            <path d="M3 8h9M8.5 4.5L12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      <div className="mt-3 h-4 text-[12px] text-hard/90">{state === "wrong" ? "Not it. Try again." : ""}</div>
    </form>
  );
}
