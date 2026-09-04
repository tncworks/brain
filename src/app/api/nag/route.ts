import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import nodemailer from "nodemailer";
import { AUTH_COOKIE, isAuthed, safeEqual } from "@/lib/auth";
import { cloudStore } from "@/lib/cloud";
import { problems as seedProblems } from "@/lib/data";
import { buildFresh, buildNag, pickFresh } from "@/lib/nag";
import { deriveProblem, hourInTZ, todayISOInTZ, type DerivedProblem } from "@/lib/schedule";

export const dynamic = "force-dynamic";

const MIN_GAP_MS = 2 * 60 * 60 * 1000; // never two mails within 2h, whatever the cron does

function siteUrl(req: Request) {
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return process.env.NAG_SITE_URL ?? (prod ? `https://${prod}` : new URL(req.url).origin);
}

function quietHours(): [number, number] | null {
  const raw = process.env.NAG_QUIET_HOURS ?? "0-7";
  if (raw === "off" || raw === "") return null;
  const m = raw.match(/^(\d{1,2})-(\d{1,2})$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

async function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth.startsWith("Bearer ") && safeEqual(auth.slice(7), secret)) return "cron";
  if (await isAuthed((await cookies()).get(AUTH_COOKIE)?.value)) return "user";
  return null;
}

async function handle(req: Request) {
  const who = await authorized(req);
  if (!who) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const preview = url.searchParams.get("preview") === "1";
  const previewFresh = url.searchParams.get("fresh") === "1";
  const force = url.searchParams.get("force") === "1";
  const dry = url.searchParams.get("dry") === "1" || process.env.NAG_DRY_RUN === "1";

  const tz = process.env.NAG_TZ ?? "Asia/Kolkata";
  const today = todayISOInTZ(tz);
  const store = cloudStore();
  const state = store ? await store.get() : null;
  const all = [...seedProblems, ...(state?.problems ?? [])];
  const due: DerivedProblem[] = all
    .map((p) => deriveProblem(p, state?.redos[p.id] ?? [], today))
    .filter((p) => p.state === "due")
    .sort((a, b) => b.overdueDays - a.overdueDays);

  const site = siteUrl(req);

  // ?fresh=1 forces the "new problem" mail even while redos are due (testing / on demand).
  const fresh = !due.length || previewFresh;

  if (preview) {
    if (fresh) {
      const pick = pickFresh(all);
      if (!pick) return NextResponse.json({ error: "nothing left to suggest" }, { status: 404 });
      const mail = buildFresh(pick, site);
      return new NextResponse(mail.html, { headers: { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(mail.subject) } });
    }
    const mail = buildNag(due, site);
    return new NextResponse(mail.html, { headers: { "content-type": "text/html; charset=utf-8", "x-subject": encodeURIComponent(mail.subject) } });
  }

  const q = quietHours();
  const hour = hourInTZ(tz);
  if (q && !force && hour >= q[0] && hour < q[1]) return NextResponse.json({ sent: false, reason: `quiet hours (${q[0]}-${q[1]} ${tz})`, hour });

  const last = store ? Number((await store.getMeta("lastNagAt")) ?? 0) : 0;
  if (!force && Date.now() - last < MIN_GAP_MS) return NextResponse.json({ sent: false, reason: "sent recently", lastNagAt: last });

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const to = process.env.NAG_TO;
  if (!dry && (!user || !pass || !to)) return NextResponse.json({ sent: false, reason: "mail not configured (GMAIL_USER / GMAIL_APP_PASSWORD / NAG_TO)" }, { status: 503 });

  let mail: { subject: string; html: string; text: string; cat: string };
  let picked: string;
  if (fresh) {
    const pick = pickFresh(all);
    if (!pick) return NextResponse.json({ sent: false, reason: "queue empty and nothing left to suggest" });
    const m = buildFresh(pick, site);
    mail = m;
    picked = `LC ${pick.problem.lc} ${pick.problem.title} (${pick.topic})`;
  } else {
    const m = buildNag(due, site);
    mail = m;
    picked = m.pick.lc ? `LC ${m.pick.lc} ${m.pick.title}` : m.pick.title;
  }
  const transport = dry
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

  const info = await transport.sendMail({
    from: `"Brain" <${user ?? "brain@localhost"}>`,
    to: to ?? "dry-run@localhost",
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  if (!dry && store) await store.setMeta("lastNagAt", String(Date.now()));
  return NextResponse.json({
    sent: !dry,
    dry,
    by: who,
    kind: fresh ? "fresh" : "redo",
    due: due.length,
    picked,
    subject: mail.subject,
    cat: mail.cat,
    ...(dry ? { message: JSON.parse(String((info as { message?: unknown }).message ?? "{}")) } : { id: info.messageId }),
  });
}

export const GET = handle;
export const POST = handle;
