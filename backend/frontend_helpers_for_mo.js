// Witness — helpers for Mo's frontend (plain JavaScript, works in Next.js).
// 1) fingerprint + signed receipt at capture time   2) share the case to NOSDRA / an NGO
// Nothing here stores anything on a server.

const API = process.env.NEXT_PUBLIC_API_URL; // e.g. https://witness-backend.onrender.com

// ---------- 1. Fingerprint the photo and get a signed receipt ----------
export async function fingerprint(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function captureEvidence(file) {
  const takenAt = new Date().toISOString();
  const gps = await new Promise((resolve) =>
    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => resolve([p.coords.latitude, p.coords.longitude]),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        )
      : resolve(null)
  );
  const hash = await fingerprint(file);

  // Only the hash + time leave the phone — never the photo or the person's identity.
  let receipt = null;
  try {
    const r = await fetch(`${API}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hash, taken_at: takenAt }),
    });
    if (r.ok) receipt = await r.json(); // { receipt: {...}, signature: "..." }
  } catch {
    // Offline: keep going. Request the receipt again when back online (signed_at will show the later time).
  }
  return { file, hash, taken_at: takenAt, gps, receipt };
}

// ---------- 3. Share the case to NOSDRA / an NGO ----------
// Contacts: fill in real, verified addresses before the demo. Do not guess them.
export const RECIPIENTS = {
  nosdra_email: "",   // NOSDRA's official reporting email
  ngo_email: "",      // partner NGO / lawyer
};

export async function shareCase({ letterText, pidginSummary, pdfBlob }) {
  const text = `${letterText}\n\n---\n${pidginSummary}`;
  const pdf = pdfBlob ? new File([pdfBlob], "witness-case.pdf", { type: "application/pdf" }) : null;

  // Best option on phones: native share sheet (WhatsApp, email, etc.) with the PDF attached
  if (pdf && navigator.canShare && navigator.canShare({ files: [pdf] })) {
    await navigator.share({ title: "Witness spill evidence", text, files: [pdf] });
    return "shared";
  }
  if (navigator.share) {
    await navigator.share({ title: "Witness spill evidence", text });
    return "shared";
  }
  // Fallback: open WhatsApp with the letter text
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  return "whatsapp";
}

export function emailCase({ letterText, to = RECIPIENTS.nosdra_email }) {
  const subject = "Dispute of oil spill record — community evidence attached";
  window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letterText)}`;
}
