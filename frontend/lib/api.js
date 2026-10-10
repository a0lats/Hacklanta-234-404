// Every call to the Python backend lives in this file. Shapes: see CONTRACT.md.
//
// Set NEXT_PUBLIC_API_URL in Vercel (Settings → Environment Variables) to the Render URL.
// While it's empty, every call returns sample data so the screens still work (demo mode).
// The real deadline rules live in backend/deadline.py; the copy below is ONLY for demo mode.

import { SAMPLE_FIELDS, FAKE_DEFENSES, FAKE_LEGAL_AID } from "./fake";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
export const DEMO = !API_URL;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res;
}

async function getJSON(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json();
}

// Phone photos are 3–5 MB. Shrink to 1600px on the long side (still sharp
// enough to read a court form) so upload and reading are much faster.
async function shrinkPhoto(file, maxSide = 1600) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    return blob ? new File([blob], "notice.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file; // unsupported format (e.g. some HEIC): send the original
  }
}

// ---------- POST /read-notice ----------
export async function readNotice(file, jurisdiction) {
  if (DEMO) {
    await wait(1400);
    return { fields: { ...SAMPLE_FIELDS[jurisdiction] }, unclear: [], source: "demo" };
  }
  const form = new FormData();
  form.append("photo", await shrinkPhoto(file));
  const res = await fetch(`${API_URL}/read-notice`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`/read-notice failed (${res.status})`);
  return res.json();
}

// ---------- POST /check ----------
export async function checkNotice(fields, extras) {
  if (DEMO) {
    await wait(600);
    return demoCheck(fields, extras);
  }
  return (await postJSON("/check", { fields, extras })).json();
}

// ---------- POST /explain ----------
export async function explainNotice(fields, extras, lang) {
  if (DEMO) {
    await wait(400);
    return { lang, text: "Demo mode. Connect the backend to hear the explanation." };
  }
  return (await postJSON("/explain", { fields, extras, lang })).json();
}

// ---------- POST /speak (existing ElevenLabs endpoint) ----------
// Returns an audio Blob, or null in demo mode.
export async function speak(text, voiceLang) {
  if (DEMO) {
    await wait(500);
    return null;
  }
  const res = await postJSON("/speak", { text, lang: voiceLang });
  return res.blob();
}

// ---------- GET /defenses ----------
export async function getDefenses() {
  if (DEMO) return FAKE_DEFENSES;
  return getJSON("/defenses");
}

// ---------- POST /answer → PDF Blob ----------
export async function makeAnswer(body) {
  if (DEMO) {
    await wait(900);
    const file = body.fields.jurisdiction === "lagos" ? "/sample/lagos_reply_example.pdf" : "/sample/answer_draft_example.pdf";
    return (await fetch(file)).blob();
  }
  return (await postJSON("/answer", body)).blob();
}

// ---------- POST /summary → one-page PDF for legal aid ----------
export async function makeSummary(body) {
  if (DEMO) {
    await wait(700);
    const file = body.fields.jurisdiction === "lagos" ? "/sample/summary_lagos_example.pdf" : "/sample/summary_example.pdf";
    return (await fetch(file)).blob();
  }
  return (await postJSON("/summary", body)).blob();
}

// ---------- GET /legal-aid ----------
export async function getLegalAid(jurisdiction) {
  if (DEMO) return { places: FAKE_LEGAL_AID[jurisdiction] };
  return getJSON(`/legal-aid?jurisdiction=${jurisdiction}`);
}

// ---------- demo-mode copy of the rules (keep in sync with backend) ----------
const GA_HOLIDAYS_2026 = {
  "2026-01-01": "New Year's Day", "2026-01-19": "Martin Luther King Jr.'s Birthday",
  "2026-04-03": "State Holiday", "2026-05-25": "Memorial Day", "2026-06-19": "Juneteenth",
  "2026-07-03": "Independence Day (observed)", "2026-09-07": "Labor Day",
  "2026-10-12": "Columbus Day", "2026-11-11": "Veterans Day", "2026-11-26": "Thanksgiving Day",
  "2026-11-27": "State Holiday", "2026-12-24": "Washington's Birthday (observed)",
  "2026-12-25": "Christmas Day",
};
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const parse = (s) => new Date(`${s}T00:00:00Z`);
const closedReason = (d) =>
  GA_HOLIDAYS_2026[iso(d)] || (d.getUTCDay() === 6 ? "Saturday" : d.getUTCDay() === 0 ? "Sunday" : null);

function demoCheck(fields, extras) {
  if (fields.jurisdiction === "lagos") {
    const MIN = { weekly: 7, monthly: 30, quarterly: 90, half_yearly: 90, yearly: 180 };
    const given = Math.round((parse(fields.vacate_by) - parse(fields.notice_date)) / 86400000);
    const required = MIN[extras.rent_period] ?? null;
    const ok = required == null ? null : given >= required;
    const cards = [];
    if (ok === false) cards.push({ id: "notice_too_short", level: "amber", title: "This notice may be too short", body: `It gives you ${given} days. For your rent period the law may require at least ${required} days, unless your tenancy agreement sets its own notice period. Ask a lawyer or legal aid to check.` });
    cards.push({ id: "lagos_unverified", level: "amber", title: "Rules not yet confirmed", body: "These Lagos notice periods are still being checked. Confirm with a lawyer before relying on them." });
    cards.push({ id: "court_order", level: "info", title: "Only a court can remove you", body: "A landlord should not force you out, change locks or remove your things without a court order. Keep every notice you receive." });
    return { jurisdiction: "lagos", notice_check: { ok, given_days: given, required_days: required, verified: false }, cards };
  }

  const served = parse(fields.served_on);
  const seventh = addDays(served, 7);
  let due = seventh;
  while (closedReason(due)) due = addDays(due, 1);
  const today = parse(iso(new Date()));
  const daysLeft = Math.round((due - today) / 86400000);
  const moved = iso(due) !== iso(seventh);
  const cards = [];
  if (daysLeft < 0) cards.push({ id: "deadline_missed", level: "red", title: "Your 7 days may have passed", body: "Contact legal aid or the court clerk today. Ask what options are still open. Do not wait." });
  if (daysLeft === 0) cards.push({ id: "due_today", level: "red", title: "Your answer is due TODAY by 5:00 PM", body: "File today: online, at the courthouse, or with help from legal aid." });
  if (extras.locked_out || extras.utilities_cut) cards.push({ id: "self_help", level: "red", title: "Lockouts and utility shut-offs", body: "In Georgia, a landlord must go through court to remove a tenant. Changing locks or cutting utilities without a court order is not allowed. Tell legal aid right away." });
  if (moved) cards.push({ id: "deadline_moved", level: "info", title: "Your deadline was moved", body: `Day 7 is a ${closedReason(seventh)}, so the deadline moves to the next business day.` });
  if (fields.reason === "nonpayment") cards.push({ id: "pay_to_end", level: "amber", title: "You may be able to pay to end this case", body: "In Georgia, a tenant may be able to stop a nonpayment case by paying all the rent owed plus court costs. There are limits on how often this can be used. Ask legal aid if this applies to you." });
  if (extras.monthly_rent && fields.amount_claimed > extras.monthly_rent * 1.5) cards.push({ id: "amount_high", level: "amber", title: "Check the amount they claim", body: `They claim $${fields.amount_claimed.toLocaleString()}, about ${(fields.amount_claimed / extras.monthly_rent).toFixed(1)} months of your rent. Compare every fee with your lease and your receipts.` });
  cards.push({ id: "answer_counts", level: "info", title: "Filing an answer gets you a hearing", body: "If you file an answer on time, the court sets a hearing date. If you don't, the landlord can ask the court to remove you without one." });
  return {
    jurisdiction: "atlanta",
    deadline: {
      served_on: fields.served_on, seventh_day: iso(seventh), deadline: iso(due), deadline_time: "5:00 PM",
      deadline_label: due.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }),
      days_left: daysLeft, status: daysLeft < 0 ? "missed" : daysLeft === 0 ? "due_today" : "open",
      moved, moved_reason: null, holiday_list_verified: due.getUTCFullYear() === 2026,
    },
    cards,
  };
}

// Used by the 7-day strip: why a given day is closed (weekend or 2026 GA holiday).
export function closedLabel(isoDate) {
  return closedReason(parse(isoDate));
}
