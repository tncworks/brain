import { DIFFICULTY_COLOR, STATUS_COLOR } from "@/lib/graph";

export default function Legend() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-4 z-10 hidden items-center gap-4 text-[10.5px] uppercase tracking-[0.12em] text-mist/45 md:flex">
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.done }} />done</span>
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.due, boxShadow: `0 0 8px ${STATUS_COLOR.due}` }} />redo due</span>
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.progress }} />in play</span>
      <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR.locked }} />locked</span>
      <span className="mx-1 h-3 w-px bg-white/10" />
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border" style={{ borderColor: DIFFICULTY_COLOR.easy }} />easy</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-[1.5px]" style={{ borderColor: DIFFICULTY_COLOR.medium }} />med</span>
      <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: DIFFICULTY_COLOR.hard }} />hard</span>
      <span className="mx-1 h-3 w-px bg-white/10" />
      <span className="normal-case tracking-normal text-mist/35">drag · scroll to zoom · / to search</span>
    </div>
  );
}
