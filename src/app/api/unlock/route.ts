import { NextResponse } from "next/server";
import { AUTH_COOKIE, COOKIE_MAX_AGE, SITE_PASSWORD, safeEqual, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  let password: unknown;
  try {
    ({ password } = await req.json());
  } catch {
    /* fall through */
  }
  if (typeof password !== "string" || !safeEqual(password, SITE_PASSWORD)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
