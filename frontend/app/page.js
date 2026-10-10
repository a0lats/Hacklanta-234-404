"use client"; // runs on the phone: camera, audio and downloads

import { useEffect, useRef, useState } from "react";
import { STRINGS, VOICE_FOR } from "@/lib/strings";
import { SAMPLE_FIELDS } from "@/lib/fake";
import { DEMO, readNotice, checkNotice, explainNotice, speak, getDefenses, makeAnswer, getLegalAid, closedLabel } from "@/lib/api";
import { Shell, BigButton, Loading, CheckCard, Field, inputClass, ErrorNote } from "@/components/ui";

// Screens: 0 Home → 1 Check the details → 2 Deadline → 3 Answer → 4 Help.
// Everything lives in memory. Refreshing the page erases it. Nothing is saved.
export default function SevenDays() {
  const [place, setPlace] = useState("atlanta"); // "atlanta" | "lagos"
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState(0);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [fields, setFields] = useState(null);
  const [unclear, setUnclear] = useState([]);
  const [readFailed, setReadFailed] = useState(false);
  const [extras, setExtras] = useState({ monthly_rent: null, locked_out: false, utilities_cut: false, rent_period: null });
  const [result, setResult] = useState(null);
  const [defenses, setDefenses] = useState([]);
  const [picked, setPicked] = useState([]);
  const [ownWords, setOwnWords] = useState("");
  const [phone, setPhone] = useState("");
  const [pdfUrl, setPdfUrl] = useState(null);
  const [places, setPlaces] = useState([]);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const t = STRINGS[lang];
  const isLagos = place === "lagos";

  function choosePlace(p) {
    setPlace(p);
    setLang("en");
  }

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

  // ---------- actions ----------

  function onPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoUrl(URL.createObjectURL(file));
    run(t.reading, async () => {
      const r = await readNotice(file, place);
      setFields({ ...r.fields, jurisdiction: place });
      setUnclear(r.unclear || []);
      setReadFailed(r.source === "manual");
      setStep(1);
    });
  }

  function useSample() {
    setPhotoUrl(null);
    setFields({ ...SAMPLE_FIELDS[place] });
    setUnclear([]);
    setReadFailed(false);
    if (place === "lagos") setExtras((x) => ({ ...x, rent_period: "yearly" }));
    setStep(1);
  }

  const canConfirm = isLagos
    ? fields?.notice_date && fields?.vacate_by && extras.rent_period
    : Boolean(fields?.served_on);

  function confirmFields() {
    run(t.checking, async () => {
      setResult(await checkNotice(fields, extras));
      setStep(2);
    });
  }

  function toAnswer() {
    run(null, async () => {
      if (!isLagos && defenses.length === 0) setDefenses(await getDefenses());
      setStep(3);
    });
  }

  function download() {
    run(t.makingPdf, async () => {
      const blob = await makeAnswer({
        fields,
        extras,
        tenant: { phone: phone || null },
        selected_defenses: picked,
        own_words: ownWords,
      });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = isLagos ? "reply-letter-draft.pdf" : "answer-draft.pdf";
      a.click();
    });
  }

  function toHelp() {
    run(null, async () => {
      setPlaces((await getLegalAid(place)).places);
      setStep(4);
    });
  }

  function startOver() {
    setStep(0);
    setPhotoUrl(null);
    setFields(null);
    setResult(null);
    setPicked([]);
    setOwnWords("");
    setPhone("");
    setPdfUrl(null);
    setError(null);
    setExtras({ monthly_rent: null, locked_out: false, utilities_cut: false, rent_period: null });
  }

  const shell = { t, lang, setLang, place, step, demo: DEMO };

  // ---------- screens ----------

  if (busy) {
    return (
      <Shell {...shell}>
        <Loading message={busy} />
      </Shell>
    );
  }

  // 0. Home
  if (step === 0) {
    return (
      <Shell
        {...shell}
        footer={
          <div className="space-y-3">
            <BigButton as="label">
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={onPhoto} />
              {t.takePhoto}
            </BigButton>
            <BigButton variant="secondary" onClick={useSample}>{t.useSample}</BigButton>
          </div>
        }
      >
        <fieldset>
          <legend className="text-sm font-semibold text-ink-soft">{t.whereIsHome}</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[["atlanta", t.atlanta], ["lagos", t.lagos]].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => choosePlace(value)}
                aria-pressed={place === value}
                className={`rounded-xl border-2 px-3 py-3 text-base font-semibold ${
                  place === value ? "border-ink bg-ink text-white" : "border-line text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <h1 className="mt-8 text-[2rem] leading-[1.1] font-extrabold tracking-tight text-ink">
          {isLagos ? t.homeTitleLagos : t.homeTitle}
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink">{isLagos ? t.homeBodyLagos : t.homeBody}</p>
        <p className="mt-6 text-sm leading-relaxed text-ink-soft">{t.privacy}</p>
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 1. Check the details
  if (step === 1) {
    const set = (k) => (e) => setFields((f) => ({ ...f, [k]: e.target.value || null }));
    const flag = (k) => unclear.includes(k);
    return (
      <Shell
        {...shell}
        footer={
          <>
            {!canConfirm && <p className="mb-2 text-center text-sm text-ink-soft">{isLagos ? t.needLagosDates : t.needServedDate}</p>}
            <BigButton onClick={confirmFields} disabled={!canConfirm}>{t.confirm}</BigButton>
          </>
        }
      >
        <h1 className="text-2xl font-extrabold tracking-tight">{t.confirmTitle}</h1>
        <p className="mt-2 text-ink-soft">{readFailed ? t.couldNotRead : t.confirmBody}</p>

        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="mt-4 max-h-56 w-full rounded-xl border border-line object-contain bg-page" />
        )}

        <div className="mt-6 space-y-5">
          {isLagos ? (
            <>
              <Field label={t.fields.notice_date} flagged={flag("notice_date")} flagText={t.unsure}>
                <input type="date" className={inputClass} value={fields.notice_date ?? ""} onChange={set("notice_date")} />
              </Field>
              <Field label={t.fields.vacate_by} flagged={flag("vacate_by")} flagText={t.unsure}>
                <input type="date" className={inputClass} value={fields.vacate_by ?? ""} onChange={set("vacate_by")} />
              </Field>
              <Field label={t.fields.rent_period}>
                <select
                  className={inputClass}
                  value={extras.rent_period ?? ""}
                  onChange={(e) => setExtras((x) => ({ ...x, rent_period: e.target.value || null }))}
                >
                  <option value="">—</option>
                  {Object.entries(t.rentPeriods).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label={t.fields.landlord_name} flagged={flag("landlord_name")} flagText={t.unsure}>
                <input className={inputClass} value={fields.landlord_name ?? ""} onChange={set("landlord_name")} />
              </Field>
            </>
          ) : (
            <>
              <Field label={t.fields.served_on} hint={t.fields.served_on_hint} flagged={flag("served_on")} flagText={t.unsure}>
                <input type="date" className={`${inputClass} ${!fields.served_on ? "border-mark" : ""}`} value={fields.served_on ?? ""} onChange={set("served_on")} />
              </Field>
              <Field label={t.fields.landlord_name} flagged={flag("landlord_name")} flagText={t.unsure}>
                <input className={inputClass} value={fields.landlord_name ?? ""} onChange={set("landlord_name")} />
              </Field>
              <Field label={t.fields.amount_claimed} flagged={flag("amount_claimed")} flagText={t.unsure}>
                <input
                  inputMode="decimal"
                  className={inputClass}
                  value={fields.amount_claimed ?? ""}
                  onChange={(e) => setFields((f) => ({ ...f, amount_claimed: e.target.value === "" ? null : Number(e.target.value) }))}
                />
              </Field>
              <Field label={t.fields.court} flagged={flag("court")} flagText={t.unsure}>
                <input className={inputClass} value={fields.court ?? ""} onChange={set("court")} />
              </Field>
              <Field label={t.fields.case_number} flagged={flag("case_number")} flagText={t.unsure}>
                <input className={inputClass} value={fields.case_number ?? ""} onChange={set("case_number")} />
              </Field>

              <div className="border-t border-line pt-5">
                <p className="text-sm font-semibold text-ink-soft">{t.quickQuestions}</p>
                <div className="mt-4 space-y-5">
                  <Field label={t.monthlyRent}>
                    <input
                      inputMode="decimal"
                      className={inputClass}
                      value={extras.monthly_rent ?? ""}
                      onChange={(e) => setExtras((x) => ({ ...x, monthly_rent: e.target.value === "" ? null : Number(e.target.value) }))}
                    />
                  </Field>
                  <YesNo
                    label={t.lockedOut}
                    yes={t.yes}
                    no={t.no}
                    value={extras.locked_out}
                    onChange={(v) => setExtras((x) => ({ ...x, locked_out: v, utilities_cut: v }))}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 2. Deadline
  if (step === 2 && result) {
    return (
      <Shell
        {...shell}
        footer={<BigButton onClick={toAnswer}>{isLagos ? t.startReply : t.startAnswer}</BigButton>}
      >
        {isLagos ? <LagosVerdict t={t} check={result.notice_check} /> : <Countdown t={t} d={result.deadline} lang={lang} />}

        <Listen key={lang} t={t} fields={fields} extras={extras} lang={lang} />

        <h2 className="mt-9 text-lg font-bold">{t.thingsToCheck}</h2>
        <ul className="mt-3 space-y-3">
          {[...result.cards]
            .sort((a, b) => ({ red: 0, amber: 1, info: 2 }[a.level] - { red: 0, amber: 1, info: 2 }[b.level]))
            .map((c) => <CheckCard key={c.id} card={c} />)}
        </ul>
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 3. Answer
  if (step === 3) {
    return (
      <Shell
        {...shell}
        footer={
          <div className="space-y-3">
            <BigButton onClick={download}>{isLagos ? t.downloadReply : t.downloadAnswer}</BigButton>
            {pdfUrl && <BigButton variant="help" onClick={toHelp}>{t.next}</BigButton>}
          </div>
        }
      >
        <h1 className="text-2xl font-extrabold tracking-tight">{isLagos ? t.startReply : t.answerTitle}</h1>
        {!isLagos && (
          <>
            <p className="mt-2 text-ink-soft">{t.answerBody}</p>
            <ul className="mt-5 space-y-2">
              {defenses.map((d) => {
                const on = picked.includes(d.id);
                return (
                  <li key={d.id}>
                    <label className={`flex cursor-pointer gap-3 rounded-xl border-2 px-3.5 py-3 ${on ? "border-ink bg-page" : "border-line"}`}>
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5 shrink-0 accent-[#15233f]"
                        checked={on}
                        onChange={() => setPicked((p) => (on ? p.filter((x) => x !== d.id) : [...p, d.id]))}
                      />
                      <span className="text-[15px] leading-snug">{d.text}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="mt-6 space-y-5">
              <Field label={t.ownWords}>
                <textarea rows={3} className={inputClass} value={ownWords} onChange={(e) => setOwnWords(e.target.value)} />
              </Field>
              <Field label={t.yourPhone}>
                <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Field>
            </div>
          </>
        )}
        <p className="mt-6 rounded-xl bg-page px-4 py-3 text-[15px] leading-relaxed">{t.answerNote}</p>
        <ErrorNote message={error} />
      </Shell>
    );
  }

  // 4. Help
  return (
    <Shell {...shell} footer={<BigButton variant="secondary" onClick={startOver}>{t.startOver}</BigButton>}>
      <h1 className="text-2xl font-extrabold tracking-tight">{t.helpTitle}</h1>
      {!isLagos && result?.deadline && (
        <p className="mt-3 text-lg">
          {t.answerBy} <span className="highlight font-bold">{longDate(result.deadline.deadline, lang)}, {result.deadline.deadline_time}</span>
        </p>
      )}
      <p className="mt-2 text-ink-soft">{t.helpBody}</p>
      <ul className="mt-6 space-y-3">
        {places.map((p) => (
          <li key={p.name} className="rounded-xl border-2 border-help-soft px-4 py-4">
            <p className="font-bold text-ink">{p.name}</p>
            {p.address && <p className="mt-1 text-[15px]">{p.address}</p>}
            {p.phone && (
              <a href={`tel:${p.phone}`} className="mt-1 block font-semibold text-help underline">{p.phone}</a>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-help underline">
                {t.visitSite}
              </a>
            )}
            {p.verify && <p className="mt-2 text-xs text-ink-soft">{t.checkDetails}</p>}
          </li>
        ))}
      </ul>
      {!isLagos && <p className="mt-6 text-[15px] leading-relaxed">{t.fileWhere}</p>}
      <ErrorNote message={error} />
    </Shell>
  );
}

// ---------- pieces used above ----------

function YesNo({ label, yes, no, value, onChange }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {[[true, yes], [false, no]].map(([v, l]) => (
          <button
            key={l}
            type="button"
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`rounded-xl border-2 py-2.5 font-semibold ${value === v ? "border-ink bg-ink text-white" : "border-line"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const LOCALE = { en: "en-US", es: "es-US", pcm: "en-NG" };
function longDate(isoDate, lang) {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(LOCALE[lang] || "en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

// The big number with the highlighter swipe, then the date, then the 7-day strip.
function Countdown({ t, d, lang }) {
  if (!d) return null;
  const urgent = d.status !== "open";
  return (
    <section aria-live="polite">
      {d.status === "missed" ? (
        <h1 className="text-3xl leading-tight font-extrabold text-urgent">{t.missed}</h1>
      ) : (
        <h1 className="flex items-baseline gap-3">
          <span className={`highlight text-[7.5rem] leading-none font-extrabold tracking-tighter tabular-nums ${urgent ? "text-urgent" : "text-ink"}`}>
            {d.days_left}
          </span>
          <span className="text-2xl font-bold">{d.status === "due_today" ? t.dueToday : t.daysLeft(d.days_left)}</span>
        </h1>
      )}
      <p className="mt-4 text-xl leading-snug">
        {t.answerBy} <strong>{longDate(d.deadline, lang)}</strong>, {d.deadline_time}
      </p>
      <DayStrip t={t} d={d} lang={lang} />
    </section>
  );
}

// Every day from service to deadline. Shows that weekends count, and why the
// deadline moved when day 7 lands on a closed day.
function DayStrip({ t, d, lang }) {
  const days = [];
  const start = new Date(`${d.served_on}T00:00:00Z`);
  const end = new Date(`${d.deadline}T00:00:00Z`);
  for (let x = start; x <= end; x = new Date(x.getTime() + 86400000)) days.push(x);
  if (days.length > 14) return null;
  const fmt = (x, o) => x.toLocaleDateString(LOCALE[lang] || "en-US", { ...o, timeZone: "UTC" });
  return (
    <ol className="mt-6 grid grid-cols-7 gap-1" aria-label="Days from service to deadline">
      {days.map((x, i) => {
        const iso = x.toISOString().slice(0, 10);
        const isDue = iso === d.deadline;
        const isServed = i === 0;
        const afterSeven = iso > d.seventh_day;
        const closed = !isServed && !isDue && (afterSeven || iso === d.seventh_day) && closedLabel(iso);
        return (
          <li
            key={iso}
            title={closed ? `${t.closedDay}: ${closed}` : undefined}
            className={`flex flex-col items-center rounded-lg py-1.5 text-center ${
              isDue ? "bg-mark font-bold" : closed ? "bg-page text-ink-soft line-through" : isServed ? "bg-ink text-white" : "bg-page"
            }`}
          >
            <span className="text-[10px]">{fmt(x, { weekday: "short" })}</span>
            <span className="text-base tabular-nums">{fmt(x, { day: "numeric" })}</span>
            <span className="text-[9px] leading-tight">{isServed ? t.servedOn : isDue ? t.dueLabel : i <= 7 ? `${i}` : ""}</span>
          </li>
        );
      })}
    </ol>
  );
}

function LagosVerdict({ t, check }) {
  if (!check) return null;
  return (
    <section aria-live="polite">
      <h1 className="flex items-baseline gap-3">
        <span className={`highlight text-[7.5rem] leading-none font-extrabold tracking-tighter tabular-nums ${check.ok === false ? "text-urgent" : "text-ink"}`}>
          {check.given_days}
        </span>
        <span className="text-2xl font-bold">{t.days}</span>
      </h1>
      <p className="mt-4 text-xl leading-snug">
        {check.ok === false ? t.lagosNoticeTitle(check.given_days, check.required_days) : t.lagosLooksOk}
      </p>
    </section>
  );
}

// Fetches the plain-language script, shows it as captions, and plays it.
function Listen({ t, fields, extras, lang }) {
  const [state, setState] = useState("idle"); // idle | loading | playing
  const [text, setText] = useState(null);
  const [noAudio, setNoAudio] = useState(false);
  const audio = useRef(null);

  useEffect(() => () => audio.current?.pause(), []);

  async function toggle() {
    if (state === "playing") {
      audio.current?.pause();
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const ex = await explainNotice(fields, extras, lang);
      setText(ex.text);
      const blob = await speak(ex.text, VOICE_FOR[lang]);
      if (!blob) return setState("idle");
      audio.current = new Audio(URL.createObjectURL(blob));
      audio.current.onended = () => setState("idle");
      await audio.current.play();
      setState("playing");
    } catch (e) {
      console.warn(e);
      setNoAudio(true);
      setState("idle");
    }
  }

  return (
    <div className="mt-7">
      <BigButton variant="secondary" onClick={toggle} disabled={state === "loading"}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          {state === "playing" ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
        {state === "loading" ? t.listening : state === "playing" ? t.stop : t.listen}
      </BigButton>
      {noAudio && <p className="mt-3 text-sm text-ink-soft">{t.noAudio}</p>}
      {text && <p className="mt-3 rounded-xl bg-page px-4 py-3 text-[15px] leading-relaxed">{text}</p>}
    </div>
  );
}
