"use client"; // runs on the phone: needed for the camera, GPS and crypto

import { useState } from "react";
import { STRINGS } from "@/lib/strings";
import { SHOTS, FAKE_CHECKS, FAKE_REPORT, SAMPLE_META } from "@/lib/fake";
import { checkPhoto, readReport, compare, writeLetter, speak, USE_FAKE } from "@/lib/api";
import { Shell, BigButton, Loading, PhotoWithBoxes, SeverityTag, ErrorNote } from "@/components/ui";

// Which photo to show as the thumbnail on each mismatch card
const SHOT_FOR_LINE = { date: "leak_point", cause: "leak_point", location: "wide", volume_barrels: "wide", area: "wide" };

// Screens: 0 Home → 1 Capture (3 shots) → 2 Report → 3 Mismatches → 4 Letter.
// Everything lives in memory only. Closing or refreshing the page erases it (Zero Data).
export default function Witness() {
  const [lang, setLang] = useState("english");
  const [step, setStep] = useState(0);
  const [shotIndex, setShotIndex] = useState(0);
  const [photos, setPhotos] = useState({}); // shot → { url, file, check, taken_at, gps, hash }
  const [report, setReport] = useState(null); // { url, file, data }
  const [mismatches, setMismatches] = useState([]);
  const [letter, setLetter] = useState(null);
  const [busy, setBusy] = useState(null); // loading message, or null
  const [error, setError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const t = STRINGS[lang];
  const shot = SHOTS[shotIndex];

  // Runs a backend call with a loading message and a friendly error.
  async function run(message, task) {
    setError(null);
    setBusy(message);
    try {
      await task();
    } catch (err) {
      console.error(err);
      setError(t.error);
    } finally {
      setBusy(null);
    }
  }

  // Photos in shot order, in the shape /compare and /letter expect.
  function photosForApi() {
    return SHOTS.filter((s) => photos[s]).map((s) => ({
      check: photos[s].check,
      taken_at: photos[s].taken_at,
      gps: photos[s].gps,
      hash: photos[s].hash,
    }));
  }

  // ---------- actions ----------

  function onShotPicked(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same photo be picked again after a retake
    if (!file) return;
    const url = URL.createObjectURL(file);
    // SATURDAY: record taken_at, get GPS with navigator.geolocation,
    // and hash the file with crypto.subtle.digest("SHA-256", ...) right here.
    run(t.checkingPhoto, async () => {
      const check = await checkPhoto(file, shot);
      setPhotos((prev) => ({ ...prev, [shot]: { url, file, check, taken_at: null, gps: null, hash: null } }));
    });
  }

  function nextShot() {
    if (shotIndex < SHOTS.length - 1) setShotIndex(shotIndex + 1);
    else setStep(2);
  }

  function onReportPicked(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    run(t.readingReport, async () => {
      const data = await readReport(file);
      setReport({ url, file, data });
    });
  }

  function findMismatches() {
    run(t.comparing, async () => {
      const result = await compare(report.data, photosForApi(), lang);
      setMismatches(result.mismatches);
      setStep(3);
    });
  }

  function makeLetter() {
    run(t.writingLetter, async () => {
      const result = await writeLetter(report.data, mismatches, photosForApi());
      setLetter(result);
      setStep(4);
    });
  }

  function listen() {
    const text = lang === "pidgin" ? letter.pidgin_summary : letter.letter_text;
    run(t.loadingAudio, async () => {
      const blob = await speak(text, lang);
      if (!blob) return; // faked until /speak is live
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      new Audio(url).play();
    });
  }

  function loadSampleCase() {
    // SATURDAY: put the sample photos in /public/sample/ and set url to e.g. "/sample/leak_point.jpg".
    const sample = {};
    for (const s of SHOTS) sample[s] = { url: null, file: null, check: FAKE_CHECKS[s], ...SAMPLE_META[s] };
    setPhotos(sample);
    setReport({ url: null, file: null, data: FAKE_REPORT });
    setShotIndex(0);
    setStep(1);
  }

  function startOver() {
    setStep(0);
    setShotIndex(0);
    setPhotos({});
    setReport(null);
    setMismatches([]);
    setLetter(null);
    setAudioUrl(null);
    setError(null);
  }

  const shellProps = { t, lang, setLang, step };

  // ---------- screens ----------

  if (busy) {
    return (
      <Shell {...shellProps}>
        <Loading message={busy} />
      </Shell>
    );
  }

  // 0. Home
  if (step === 0) {
    return (
      <Shell
        {...shellProps}
        footer={
          <div className="space-y-3">
            <BigButton onClick={() => setStep(1)}>{t.start}</BigButton>
            <button type="button" onClick={loadSampleCase} className="w-full py-1 text-sm text-ink/40">
              {t.sample}
            </button>
          </div>
        }
      >
        <h1 className="mt-10 text-4xl font-semibold leading-tight tracking-tight text-ink">{t.tagline}</h1>
        <ol className="mt-10 space-y-5">
          {t.howItWorks.map((line, i) => (
            <li key={line} className="flex items-center gap-4 text-lg">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-base font-semibold text-white">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ol>
      </Shell>
    );
  }

  // 1. Capture: one shot per screen
  if (step === 1) {
    const current = photos[shot];
    const usable = current?.check?.usable;
    const cameraInput = (
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onShotPicked} />
    );
    return (
      <Shell
        {...shellProps}
        footer={
          !current ? (
            <BigButton as="label">
              {cameraInput}
              {t.takePhoto}
            </BigButton>
          ) : (
            <div className="space-y-3">
              {usable && <BigButton onClick={nextShot}>{t.next}</BigButton>}
              <BigButton as="label" variant={usable ? "secondary" : "primary"}>
                {cameraInput}
                {t.retake}
              </BigButton>
            </div>
          )
        }
      >
        <p className="text-sm font-medium text-brand">{t.photoOf(shotIndex + 1)}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{t.shots[shot]}</h1>
        <p className="mt-2 text-lg text-ink/70">{t.shotHints[shot]}</p>

        {current && (
          <div className="mt-6 space-y-4">
            <PhotoWithBoxes url={current.url} boxes={current.check.boxes} label={t.shots[shot]} />
            <div className={`rounded-2xl p-4 ${usable ? "bg-brand-soft" : "bg-warn-soft"}`}>
              <p className={`font-semibold ${usable ? "text-brand" : "text-warn-dark"}`}>
                {usable ? t.usable : t.notUsable}
              </p>
              <p className="mt-1">{current.check.reason}</p>
              {usable && <p className="mt-2 text-ink/70">{current.check.damage_seen}</p>}
              {current.check.needs_expert_review && (
                <span className="mt-3 inline-block rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand">
                  {t.expertReview}
                </span>
              )}
            </div>
          </div>
        )}
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 2. Report photo
  if (step === 2) {
    const reportInput = (
      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onReportPicked} />
    );
    return (
      <Shell
        {...shellProps}
        footer={
          !report ? (
            <BigButton as="label">
              {reportInput}
              {t.snapReport}
            </BigButton>
          ) : (
            <div className="space-y-3">
              <BigButton onClick={findMismatches}>{t.findMismatches}</BigButton>
              <BigButton as="label" variant="secondary">
                {reportInput}
                {t.retake}
              </BigButton>
            </div>
          )
        }
      >
        <h1 className="text-3xl font-semibold tracking-tight">{t.reportTitle}</h1>
        <p className="mt-2 text-lg text-ink/70">{t.reportHint}</p>

        {report && (
          <div className="mt-6 space-y-4">
            <PhotoWithBoxes url={report.url} label={t.reportTitle} />
            <div className="rounded-2xl bg-brand-soft p-4">
              <p className="font-semibold text-brand">{t.reportFound}</p>
              <dl className="mt-3 space-y-2">
                {Object.entries(t.fields).map(([key, label]) => (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="text-ink/60">{label}</dt>
                    <dd className="text-right font-medium">{String(report.data[key] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 3. Mismatches
  if (step === 3) {
    return (
      <Shell {...shellProps} footer={<BigButton onClick={makeLetter}>{t.writeLetter}</BigButton>}>
        <h1 className="text-3xl font-semibold tracking-tight">{t.mismatchesTitle}</h1>
        <p className="mt-2 text-ink/60">{t.expertNote}</p>

        <div className="mt-6 space-y-5">
          {mismatches.map((m, i) => {
            const thumb = photos[SHOT_FOR_LINE[m.report_line]] ?? photos[SHOTS[0]];
            const line = report?.data?.lines?.[m.report_line] ?? String(report?.data?.[m.report_line] ?? "");
            return (
              <article key={i} className="rounded-2xl border-2 border-warn/60 bg-warn-soft/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">{m.title}</h2>
                  <SeverityTag severity={m.severity} labels={t.severity} />
                </div>
                <p className="mt-2 text-lg">{lang === "pidgin" ? m.pidgin : m.plain_english}</p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{t.officialSays}</p>
                    <p className="mt-1 font-medium">{m.official_says}</p>
                  </div>
                  <div className="rounded-xl border-2 border-warn bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-warn-dark">{t.evidenceShows}</p>
                    <p className="mt-1 font-medium">{m.evidence_shows}</p>
                  </div>
                </div>

                {thumb && (
                  <div className="mt-3 w-28">
                    <PhotoWithBoxes url={thumb.url} label={t.shots[thumb.check?.shot_type] ?? ""} />
                  </div>
                )}

                {line && (
                  <div className="mt-3 rounded-xl bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink/50">{t.fromReport}</p>
                    <p className="mt-1">
                      <mark className="rounded bg-warn/40 px-1 text-ink">{line}</mark>
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 4. Letter + Listen
  const shareText = encodeURIComponent(lang === "pidgin" ? letter.pidgin_summary : letter.letter_text);
  return (
    <Shell
      {...shellProps}
      footer={
        <div className="space-y-3">
          <BigButton as="a" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noreferrer">
            {t.shareWhatsApp}
          </BigButton>
          <div className="grid grid-cols-2 gap-3">
            {/* SATURDAY: build the PDF with jsPDF here */}
            <BigButton variant="secondary" disabled>
              {t.downloadPdf}
            </BigButton>
            <BigButton variant="secondary" onClick={listen} disabled={USE_FAKE.speak}>
              {t.listen}
            </BigButton>
          </div>
          <button type="button" onClick={startOver} className="w-full py-1 text-sm text-ink/40">
            {t.startOver}
          </button>
        </div>
      }
    >
      <h1 className="text-3xl font-semibold tracking-tight">{t.letterTitle}</h1>
      {USE_FAKE.speak && <p className="mt-1 text-sm text-ink/50">PDF · {t.listen}: {t.comingSoon}</p>}

      {lang === "pidgin" && (
        <p className="mt-4 rounded-2xl bg-brand-soft p-4 text-lg">{letter.pidgin_summary}</p>
      )}

      <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-brand-soft p-4 text-[15px] leading-relaxed">
        {letter.letter_text}
      </div>

      <h2 className="mt-6 text-lg font-semibold">{t.fingerprints}</h2>
      <ul className="mt-3 space-y-3">
        {SHOTS.filter((s) => photos[s]).map((s) => (
          <li key={s} className="rounded-xl bg-brand-soft p-3 text-sm">
            <p className="font-medium">{t.shots[s]}</p>
            <p className="mt-1 text-ink/70">
              {photos[s].taken_at ?? t.pending} · {photos[s].gps ? photos[s].gps.join(", ") : t.pending}
            </p>
            <p className="mt-1 break-all font-mono text-xs">SHA-256: {photos[s].hash ?? t.pending}</p>
          </li>
        ))}
      </ul>

      {audioUrl && <audio className="mt-4 w-full" controls src={audioUrl} />}
      <ErrorNote message={error} />
    </Shell>
  );
}
