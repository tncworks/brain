import { NextResponse } from "next/server";
import { cloudStore, type CloudState } from "@/lib/cloud";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_000_000;

function isState(x: unknown): x is CloudState {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  if (typeof s.updatedAt !== "number" || !Array.isArray(s.problems) || !s.redos || typeof s.redos !== "object") return false;
  for (const v of Object.values(s.redos as Record<string, unknown>)) {
    if (!Array.isArray(v) || v.some((d) => typeof d !== "string")) return false;
  }
  return true;
}

export async function GET() {
  const s = cloudStore();
  if (!s) return NextResponse.json({ configured: false }, { status: 503 });
  const state = await s.get();
  return NextResponse.json({ configured: true, backend: s.backend, state });
}

export async function PUT(req: Request) {
  const s = cloudStore();
  if (!s) return NextResponse.json({ configured: false }, { status: 503 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!isState(body)) return NextResponse.json({ error: "bad shape" }, { status: 400 });

  const current = await s.get();
  if (current && current.updatedAt > body.updatedAt) {
    // Another device wrote something newer; hand it back so the client adopts it.
    return NextResponse.json({ ok: false, state: current }, { status: 409 });
  }
  await s.set(body);
  return NextResponse.json({ ok: true });
}
