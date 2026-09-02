"use client";

import { useEffect } from "react";
import type { ToastState } from "./App";

export default function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000);
    return () => clearTimeout(t);
  }, [toast.key, onDone]);

  return (
    <div key={toast.key} className="pointer-events-auto absolute bottom-14 left-1/2 z-40 -translate-x-1/2 animate-rise">
      <div className="glass flex h-11 items-center gap-3 rounded-full pl-4 pr-2 text-[13px] text-white shadow-[0_0_40px_-10px_rgba(127,217,166,.5)]">
        <span className="h-2 w-2 rounded-full bg-done" />
        {toast.text}
        {toast.undo && (
          <button onClick={toast.undo} className="rounded-full bg-white/10 px-3 py-1.5 text-[12px] text-mist/85 transition hover:bg-white/15 hover:text-white">
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
