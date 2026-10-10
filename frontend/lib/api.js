// Every call to the Python backend lives in this file.
// Each endpoint has its own switch in USE_FAKE: while it's true, that call returns
// the contract's example data after a short pause. On Saturday, when a teammate says
// their endpoint is live on Render, flip its switch to false. Nothing else changes.

import { FAKE_CHECKS, FAKE_REPORT, FAKE_COMPARE, FAKE_LETTER } from "./fake";

export const USE_FAKE = {
  checkPhoto: true, // Travis: POST /check-photo
  readReport: true, // Jade:   POST /read-report
  compare: true,    // Jade:   POST /compare
  letter: true,     // Jade:   POST /letter
  speak: true,      // Olu:    POST /speak
};

// Set in Vercel: Settings → Environment Variables → NEXT_PUBLIC_API_URL = the Render URL
const API_URL = process.env.NEXT_PUBLIC_API_URL;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const copy = (obj) => JSON.parse(JSON.stringify(obj)); // so screens can't edit the fake data

// Photo uploads go as form data. Confirm the field names ("photo", "expected_shot") with the backend.
async function postForm(path, fields) {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  const res = await fetch(`${API_URL}${path}`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json();
}

// Everything else goes as JSON.
async function postJSON(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return res.json();
}

export async function checkPhoto(file, expectedShot) {
  if (USE_FAKE.checkPhoto) {
    await wait(1200);
    return copy(FAKE_CHECKS[expectedShot]);
  }
  return postForm("/check-photo", { photo: file, expected_shot: expectedShot });
}

export async function readReport(file) {
  if (USE_FAKE.readReport) {
    await wait(1500);
    return copy(FAKE_REPORT);
  }
  return postForm("/read-report", { photo: file });
}

// photos: [{ check, taken_at, gps, hash }] in shot order
export async function compare(report, photos, lang) {
  if (USE_FAKE.compare) {
    await wait(1800);
    return copy(FAKE_COMPARE);
  }
  return postJSON("/compare", { report, photos, lang });
}

export async function writeLetter(report, mismatches, photos) {
  if (USE_FAKE.letter) {
    await wait(1500);
    return copy(FAKE_LETTER);
  }
  return postJSON("/letter", { report, mismatches, photos });
}

// Returns an audio Blob (audio/mpeg), or null while faked.
export async function speak(text, lang) {
  if (USE_FAKE.speak) {
    await wait(800);
    return null;
  }
  const res = await fetch(`${API_URL}/speak`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, lang }),
  });
  if (!res.ok) throw new Error(`/speak failed (${res.status})`);
  return res.blob();
}
