/**
 * The reminder mail. Short, rude on purpose (the recipient asked for it),
 * one random due problem in the spotlight, one cat.
 */
import { topics, type Problem, type TopicId } from "./data";
import { topicById } from "./graph";
import type { DerivedProblem } from "./schedule";
import { SUGGESTIONS, type Suggestion } from "./suggestions";

export const CATS = ["/cats/cat-1.jpg", "/cats/cat-2.jpg", "/cats/cat-3.jpg", "/cats/cat-4.jpg", "/cats/cat-5.jpg", "/cats/cat-6.jpg"];

const pickOne = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

const SUBJECTS = [
  "{n} redos rotting and you're on your phone 💀",
  "not you ghosting {short} again, unemployed unc",
  "{short} said 'he forgot me' 😭",
  "the redo queue is {n} deep. it's giving jobless",
  "your brain is buffering. {n} due. L + ratio + unemployed",
  "daily reminder {short} is beating you 1-0",
  "bestie the synapses are LEAVING ({n} due)",
  "recruiters can smell the {n} redos on you",
  "{short} is still due. HR said 'we'll keep your resume on file' 💀",
  "unc. the queue. now.",
];

const OPENERS = [
  "yo. real talk.",
  "hey loser 🫵",
  "it's the redo cat again.",
  "checking in on your unemployment arc.",
  "sup, unemployed unc.",
  "breaking news: you fell off.",
  "dear future 'open to work' badge,",
  "pov: your interviewer is reading this too.",
];

const ROASTS = [
  "{title} has been sitting there {days}. it's not gonna solve itself and neither is your career.",
  "you solved {title} once and thought that was it? that's not mastery that's a situationship. you'll stay unemployed like this.",
  "{title}: {days}. the cat has done more today than you. the cat also has a job.",
  "your motivation window slid shut apparently. {title}. now. before the recruiter's does too.",
  "your synapses for {title} are cooked. skill issue. fix it or enjoy the unemployment speedrun.",
  "{title} is {days} and you're 'gonna do it later'. later is where jobless people live.",
  "{n} redos due. that's {n} reasons you'd fold in a phone screen. {title} first.",
  "imagine bombing {title} in an interview after solving it once. couldn't be you. oh wait. it would.",
  "{title}, {days}. even the FAANG rejection bot is disappointed in you.",
  "the gap between you and employed is exactly {title}. close it, unc.",
];

const CLOSERS = [
  "no cap, 10 minutes and it's done.",
  "touch grass AFTER the redo.",
  "the cat is judging you. rightfully.",
  "be so fr rn.",
  "lock in. or don't. the cat will know.",
  "do it or stay unemployed. your call, unc.",
  "your future self is begging. your current self is scrolling.",
  "one redo a day keeps the 'unfortunately' email away.",
  "you're not cooked yet. you're just marinating. move.",
];

const CAPTIONS = [
  "the cat when you open leetcode: 👍",
  "pov: the cat sees your redo queue",
  "certified 'do the redo' cat",
  "this cat has more retention than you",
  "the cat when you say 'i'll do it tomorrow'",
  "cat has a 9-5. what's your excuse",
  "the hiring manager (cat) reviewing your queue",
  "he's not mad. just disappointed. ok he's mad.",
];

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

function daysText(p: DerivedProblem) {
  if (p.overdueDays <= 0) return "due today";
  if (p.overdueDays === 1) return "1 day overdue";
  return `${p.overdueDays} days overdue`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export interface NagMail {
  subject: string;
  html: string;
  text: string;
  pick: DerivedProblem;
  cat: string;
}

export function buildNag(due: DerivedProblem[], siteUrl: string): NagMail {
  const pick = pickOne(due);
  const cat = pickOne(CATS);
  const label = pick.lc ? `LC ${pick.lc} ${pick.title}` : pick.title;
  const short = pick.lc ? `LC ${pick.lc}` : pick.title;
  const vars = { n: String(due.length), title: label, short, days: daysText(pick) };
  const subject = fill(pickOne(SUBJECTS), vars);
  const opener = pickOne(OPENERS);
  const roast = fill(pickOne(ROASTS), vars);
  const closer = pickOne(CLOSERS);
  const caption = pickOne(CAPTIONS);
  const others = due.filter((p) => p.id !== pick.id).slice(0, 5);
  const more = due.length - 1 - others.length;
  const topic = topicById.get(pick.topics[0])?.short ?? pick.topics[0];
  const problemUrl = pick.slug ? `https://leetcode.com/problems/${pick.slug}/` : siteUrl;

  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#c6ccdb;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
  <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#7fd9a6">DSA Brain · redo alert</div>
  <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;margin:14px 0 8px;color:#fff">${esc(opener)}</p>
  <p style="font-size:20px;line-height:1.4;font-weight:600;margin:0 0 20px;color:#fff">${esc(roast)}</p>

  <a href="${problemUrl}" style="display:block;text-decoration:none;background:#0b0b0d;border:1px solid rgba(245,181,63,.35);border-radius:16px;padding:16px 18px;margin:0 0 18px">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f5b53f">${esc(daysText(pick))}</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#fff;margin-top:4px">${esc(pick.title)}</div>
    <div style="font-size:12px;color:#8b95b0;margin-top:6px">${pick.lc ? `LC ${pick.lc} · ` : ""}${esc(pick.difficulty)} · ${esc(topic)} · pass ${pick.redos.length + 1}</div>
  </a>

  <img src="${siteUrl}${cat}" alt="cat" width="320" style="display:block;width:100%;max-width:320px;border-radius:14px;margin:0 auto">
  <p style="text-align:center;font-size:14px;color:#c6ccdb;margin:8px 0 20px">${esc(caption)}</p>

  ${
    others.length
      ? `<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b95b0;margin-bottom:6px">also rotting</div>
  <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.7;color:#c6ccdb">${others
    .map((p) => `<li>${p.lc ? `LC ${p.lc} · ` : ""}${esc(p.title)} <span style="color:#f5b53f">· ${esc(daysText(p))}</span></li>`)
    .join("")}${more > 0 ? `<li style="color:#8b95b0">+${more} more. yikes.</li>` : ""}</ul>`
      : ""
  }

  <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#fff;margin:0 0 18px">${esc(closer)}</p>
  <a href="${siteUrl}" style="display:inline-block;background:#f5b53f;color:#000;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:999px">open the brain →</a>
  <p style="font-size:11px;color:#5a6070;margin-top:26px;line-height:1.6">sent every 3 hours while redos exist. you know how to make it stop.</p>
</div></body></html>`;

  const text = [
    opener,
    roast,
    "",
    `→ ${label} · ${daysText(pick)} · ${topic}`,
    problemUrl,
    ...(others.length ? ["", "also rotting:", ...others.map((p) => `- ${p.lc ? `LC ${p.lc} ` : ""}${p.title} (${daysText(p)})`), ...(more > 0 ? [`- +${more} more`] : [])] : []),
    "",
    closer,
    siteUrl,
  ].join("\n");

  return { subject, html, text, pick, cat };
}

/* ── "Queue is empty" mode: go solve something new ─────────────────────── */

const FRESH_SUBJECTS = [
  "queue's empty. still unemployed tho",
  "no redos due. so why are you still jobless",
  "clean queue ≠ employed. do {short}",
  "new question dropped: {short}. don't be scared",
  "{topic} called. it wants a rematch",
  "{short} is free. unlike your future if you skip it",
  "zero redos. zero offers. see the pattern, unc?",
];

const FRESH_OPENERS = [
  "look at you. zero redos. cute.",
  "queue empty. brain empty. matching set.",
  "rest day? in this economy?",
  "the cat cleared its queue too. then it got a job.",
  "congrats on the empty queue, unemployed unc.",
  "nothing due. that's not a flex, that's a warning.",
];

const FRESH_ROASTS = [
  "you've 'covered' {topic}. cool. prove it: {title}. {difficulty}. no notes.",
  "{title} is a {difficulty} in {topic}. if that scares you, that's the diagnosis.",
  "you did {count} {topic} problems and think you're built. {title} says otherwise.",
  "an empty queue is just a queue you haven't filled yet. {title}. go.",
  "interviewers love {topic}. you love scrolling. {title} fixes one of those.",
  "{title}. {difficulty}. {topic}. the cat solved it in its head. you can't even open the tab.",
];

const FRESH_CLOSERS = [
  "log it in the brain when you're done. or don't, and stay jobless.",
  "solve it, log it, get roasted about it in 3 days. the cycle.",
  "one new problem a day keeps the 'unfortunately' email away.",
  "you're not cooked yet. you're just marinating. move.",
  "do it or stay unemployed. your call, unc.",
];

export interface FreshPick {
  topic: TopicId;
  problem: Suggestion;
  /** How many problems in this topic are already logged. */
  count: number;
}

/** Random covered topic, random problem from it that isn't already solved or logged. */
export function pickFresh(known: Problem[]): FreshPick | null {
  const knownLc = new Set(known.map((p) => p.lc).filter((n): n is number => n != null));
  const pool: FreshPick[] = [];
  for (const t of topics) {
    if (t.status === "locked") continue;
    const list = (SUGGESTIONS[t.id] ?? []).filter((s) => !knownLc.has(s.lc));
    const count = known.filter((p) => p.topics.includes(t.id)).length;
    for (const problem of list) pool.push({ topic: t.id, problem, count });
  }
  return pool.length ? pickOne(pool) : null;
}

export interface FreshMail {
  subject: string;
  html: string;
  text: string;
  pick: FreshPick;
  cat: string;
}

export function buildFresh(pick: FreshPick, siteUrl: string): FreshMail {
  const cat = pickOne(CATS);
  const t = topicById.get(pick.topic)!;
  const { problem } = pick;
  const short = `LC ${problem.lc}`;
  const label = `LC ${problem.lc} ${problem.title}`;
  const vars = { short, title: label, topic: t.short, difficulty: problem.difficulty, count: String(pick.count) };
  const subject = fill(pickOne(FRESH_SUBJECTS), vars);
  const opener = fill(pickOne(FRESH_OPENERS), vars);
  const roast = fill(pickOne(FRESH_ROASTS), vars);
  const closer = pickOne(FRESH_CLOSERS);
  const caption = pickOne(CAPTIONS);
  const problemUrl = `https://leetcode.com/problems/${problem.slug}/`;

  const html = `<!doctype html><html><body style="margin:0;background:#000;color:#c6ccdb;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif">
<div style="max-width:520px;margin:0 auto;padding:28px 20px">
  <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6ea6ff">DSA Brain · new problem</div>
  <p style="font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;margin:14px 0 8px;color:#fff">${esc(opener)}</p>
  <p style="font-size:20px;line-height:1.4;font-weight:600;margin:0 0 20px;color:#fff">${esc(roast)}</p>

  <a href="${problemUrl}" style="display:block;text-decoration:none;background:#0b0b0d;border:1px solid rgba(110,166,255,.4);border-radius:16px;padding:16px 18px;margin:0 0 18px">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6ea6ff">suggested · ${esc(t.short)}</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#fff;margin-top:4px">${esc(problem.title)}</div>
    <div style="font-size:12px;color:#8b95b0;margin-top:6px">LC ${problem.lc} · ${esc(problem.difficulty)} · you've logged ${pick.count} in ${esc(t.short)}</div>
    <div style="font-size:13px;color:#6ea6ff;margin-top:10px">open on leetcode →</div>
  </a>

  <img src="${siteUrl}${cat}" alt="cat" width="320" style="display:block;width:100%;max-width:320px;border-radius:14px;margin:0 auto">
  <p style="text-align:center;font-size:14px;color:#c6ccdb;margin:8px 0 20px">${esc(caption)}</p>

  <p style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;color:#fff;margin:0 0 18px">${esc(closer)}</p>
  <a href="${siteUrl}" style="display:inline-block;background:#6ea6ff;color:#000;text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:999px">log it in the brain →</a>
  <p style="font-size:11px;color:#5a6070;margin-top:26px;line-height:1.6">your redo queue is empty, so the cat picks a new one every 3 hours. solve and log it to change the subject.</p>
</div></body></html>`;

  const text = [opener, roast, "", `→ ${label} · ${problem.difficulty} · ${t.short}`, problemUrl, "", closer, siteUrl].join("\n");
  return { subject, html, text, pick, cat };
}
