/**
 * Server-only access to the shared brain document in Upstash Redis.
 * Used by /api/state (the app's sync) and /api/nag (the reminder mails).
 */
import { Redis } from "@upstash/redis";
import type { Problem } from "./data";
import type { RedoLog } from "./schedule";

export const STATE_KEY = "dsa-brain:state:v1";

export interface CloudState {
  redos: RedoLog;
  problems: Problem[];
  updatedAt: number;
}

export interface CloudStore {
  backend: "redis" | "memory";
  get(): Promise<CloudState | null>;
  set(s: CloudState): Promise<void>;
  /** Small scratch values (e.g. the last-nag timestamp). */
  getMeta(key: string): Promise<string | null>;
  setMeta(key: string, value: string): Promise<void>;
}

/* Upstash Redis, provisioned from the Vercel dashboard (Storage → Upstash).
   The integration injects either KV_* or UPSTASH_* names depending on the prefix you pick. */
export function cloudStore(): CloudStore | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (url && token) {
    const redis = new Redis({ url, token });
    return {
      backend: "redis",
      get: () => redis.get<CloudState>(STATE_KEY),
      set: async (s) => {
        await redis.set(STATE_KEY, s);
      },
      getMeta: (k) => redis.get<string>(`dsa-brain:meta:${k}`),
      setMeta: async (k, v) => {
        await redis.set(`dsa-brain:meta:${k}`, v);
      },
    };
  }
  if (process.env.NODE_ENV === "development") {
    // Process-local store so `npm run dev` exercises the sync path without a database.
    const g = globalThis as unknown as { __brainMem?: CloudState | null; __brainMeta?: Map<string, string> };
    g.__brainMeta ??= new Map();
    return {
      backend: "memory",
      get: async () => g.__brainMem ?? null,
      set: async (s) => {
        g.__brainMem = s;
      },
      getMeta: async (k) => g.__brainMeta!.get(k) ?? null,
      setMeta: async (k, v) => {
        g.__brainMeta!.set(k, v);
      },
    };
  }
  return null;
}
