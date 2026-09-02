/**
 * The reminder mail. Short, rude on purpose (the recipient asked for it),
 * one random due problem in the spotlight, one cat.
 */
import { topicById } from "./graph";
import type { DerivedProblem } from "./schedule";

export const CATS = ["/cats/cat-1.jpg", "/cats/cat-2.jpg", "/cats/cat-3.jpg"];

const pickOne = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];

const SUBJECTS = [
  "{n} redos rotting rn and you're on your phone 💀",
  "not you ghosting {short} again",
  "{short} said 'he forgot me' 😭",
  "the redo queue is {n} deep. it's giving allergic to effort",
  "your brain is buffering. {n} due. L + ratio",
  "daily reminder {short} is beating you 1-0",
  "bestie the synapses are LEAVING ({n} due)",
];

const OPENERS = ["yo. real talk.", "hey loser 🫵", "it's the redo cat again.", "checking in on your unemployment arc.", "sup. bad news."];

const ROASTS = [
  "{title} has been sitting there {days}. it's not gonna solve itself bestie.",
  "you solved {title} once and thought that was it? that's not mastery that's a situationship.",
  "{title}: {days}. the cat has done more today than you.",
  "your motivation window slid shut apparently. {title}. now.",
  "your synapses for {title} are cooked. skill issue. fix it.",
  "{title} is {days} and you're 'gonna do it later'. later is a myth.",
];

const CLOSERS = ["no cap, 10 minutes and it's done.", "touch grass AFTER the redo.", "the cat is judging you. rightfully.", "be so fr rn.", "lock in. or don't. the cat will know."];

const CAPTIONS = ["the cat when you open leetcode: 👍", "pov: the cat sees your redo queue", "certified 'do the redo' cat", "this cat has more retention than you"];

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
  <p style="font-size:15px;line-height:1.5;margin:14px 0 4px;color:#fff">${esc(opener)}</p>
  <p style="font-size:15px;line-height:1.5;margin:0 0 18px">${esc(roast)}</p>

  <a href="${problemUrl}" style="display:block;text-decoration:none;background:#0b0b0d;border:1px solid rgba(245,181,63,.35);border-radius:16px;padding:16px 18px;margin:0 0 18px">
    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#f5b53f">${esc(daysText(pick))}</div>
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.2;color:#fff;margin-top:4px">${esc(pick.title)}</div>
    <div style="font-size:12px;color:#8b95b0;margin-top:6px">${pick.lc ? `LC ${pick.lc} · ` : ""}${esc(pick.difficulty)} · ${esc(topic)} · pass ${pick.redos.length + 1}</div>
  </a>

  <img src="${siteUrl}${cat}" alt="cat" width="320" style="display:block;width:100%;max-width:320px;border-radius:14px;margin:0 auto">
  <p style="text-align:center;font-size:12px;color:#8b95b0;margin:8px 0 18px">${esc(caption)}</p>

  ${
    others.length
      ? `<div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8b95b0;margin-bottom:6px">also rotting</div>
  <ul style="margin:0 0 18px;padding-left:18px;font-size:13px;line-height:1.7;color:#c6ccdb">${others
    .map((p) => `<li>${p.lc ? `LC ${p.lc} · ` : ""}${esc(p.title)} <span style="color:#f5b53f">· ${esc(daysText(p))}</span></li>`)
    .join("")}${more > 0 ? `<li style="color:#8b95b0">+${more} more. yikes.</li>` : ""}</ul>`
      : ""
  }

  <p style="font-size:15px;line-height:1.5;color:#fff;margin:0 0 18px">${esc(closer)}</p>
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
