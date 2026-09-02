/**
 * Site gate. Server-only: imported by middleware and the unlock route handler,
 * never by client components, so the password does not ship in the browser bundle.
 *
 * Hard-coded for now; set DSA_BRAIN_PASSWORD on Vercel to override without a code change.
 */
export const SITE_PASSWORD = process.env.DSA_BRAIN_PASSWORD ?? "ikpassisopen";
export const AUTH_COOKIE = "dsa_brain_key";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // one year

/** The cookie value that proves the password was entered: sha256("dsa-brain::" + password). */
export async function sessionToken(): Promise<string> {
  const data = new TextEncoder().encode(`dsa-brain::${SITE_PASSWORD}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function isAuthed(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await sessionToken());
}
