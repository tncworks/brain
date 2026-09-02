import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, isAuthed } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // /api/nag carries its own bearer-or-cookie check; /cats are the meme images mails link to.
  if (pathname.startsWith("/api/unlock") || pathname.startsWith("/api/nag") || pathname.startsWith("/cats/")) return NextResponse.next();

  const authed = await isAuthed(req.cookies.get(AUTH_COOKIE)?.value);

  if (pathname === "/unlock") {
    if (!authed) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (authed) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|favicon.ico).*)"],
};
