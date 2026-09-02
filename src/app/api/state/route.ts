import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const KEY = "dsa-brain:state:v1";
const MAX_BYTES = 1_000_000;

interface BrainState {
  redos: Record<string, string[]>;
  problems: unknown[];
  updatedAt: number;
}

interface Store {
  backend: "redis" | "memory";
  get(): Promise<BrainState | null>;
  set(s: BrainState): Promise<void>;
}

/* Upstash Redis, provisioned from the Vercel dashboard (Storage → Upstash).
   The integration injects either KV_* or UPSTASH_* names depending on the prefix you pick. */
function store(): Store | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    const redis = new Redis({ url, token });
    return {
      backend: "redis",
      get: () => redis.get<BrainState>(KEY),
      set: async (s) => {
        await redis.set(KEY, s);
      },
    };
  }
  if (process.env.NODE_ENV === "development") {
    // Process-local store so `npm run dev` exercises the sync path without a database.
    const g = globalThis as unknown as { __brainMem?: BrainState | null };
    return {
      backend: "memory",
      get: async () => g.__brainMem ?? null,
      set: async (s) => {
        g.__brainMem = s;
      },
    };
  }
  return null;
}

function isState(x: unknown): x is BrainState {
  if (!x || typeof x !== "object") return false;
  const s = x as Record<string, unknown>;
  if (typeof s.updatedAt !== "number" || !Array.isArray(s.problems) || !s.redos || typeof s.redos !== "object") return false;
  for (const v of Object.values(s.redos as Record<string, unknown>)) {
    if (!Array.isArray(v) || v.some((d) => typeof d !== "string")) return false;
  }
  return true;
}

export async function GET() {
  const s = store();
  if (!s) return NextResponse.json({ configured: false }, { status: 503 });
  const state = await s.get();
  return NextResponse.json({ configured: true, backend: s.backend, state });
}

export async function PUT(req: Request) {
  const s = store();
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
