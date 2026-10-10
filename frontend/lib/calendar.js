// Builds a calendar file (.ics) on the phone. Nothing goes to a server.
// The event sits at 4–5 PM Atlanta time on the deadline day, with reminders
// 2 days and 1 day before, plus one on the morning of the deadline.

const pad = (n) => String(n).padStart(2, "0");
const stamp = (d) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
// Text in .ics must escape commas, semicolons and new lines.
const esc = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

// US Eastern time rules, so every calendar app shows 5 PM Atlanta time.
const EASTERN = [
  "BEGIN:VTIMEZONE",
  "TZID:America/New_York",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

function alarm(trigger, text) {
  return ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(text)}`, `TRIGGER:${trigger}`, "END:VALARM"];
}

// deadline: "YYYY-MM-DD". title/notes come from strings.js in the chosen language.
export function deadlineIcs({ deadline, title, notes, reminder }) {
  const day = deadline.replace(/-/g, "");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//7 Days//Hacklanta 2026//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...EASTERN,
    "BEGIN:VEVENT",
    `UID:7days-${day}-${Math.random().toString(36).slice(2)}@7days`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=America/New_York:${day}T160000`,
    `DTEND;TZID=America/New_York:${day}T170000`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(notes)}`,
    ...alarm("-P2D", reminder),
    ...alarm("-P1D", reminder),
    ...alarm("-PT7H", reminder), // 9 AM on the day
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // .ics lines end with CRLF and are folded at 75 characters.
  const fold = (l) => l.match(/.{1,74}/g).join("\r\n ");
  return new Blob([lines.map(fold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
