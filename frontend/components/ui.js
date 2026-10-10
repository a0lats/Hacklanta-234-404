// Building blocks shared by every screen.
import { LANGS } from "@/lib/strings";

// The frame: header (name, privacy note, language), progress, content on a
// white "paper" sheet, and a sticky bottom area for the main button.
export function Shell({ t, lang, setLang, place, step, footer, demo, children }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <span className="text-xl font-extrabold tracking-tight text-ink">{t.appName}</span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
            <LockIcon /> {t.neverSaved}
          </span>
          <LangToggle options={LANGS[place]} lang={lang} setLang={setLang} />
        </div>
      </header>
      {step > 0 && <Progress step={step} labels={t.steps} />}
      <main className="flex-1 rounded-t-3xl bg-paper px-5 pt-6 pb-8">
        {demo && (
          <p className="mb-4 inline-block rounded-md bg-page px-2 py-1 text-xs text-ink-soft">{t.demoNote}</p>
        )}
        {children}
        <p className="mt-10 text-xs leading-relaxed text-ink-soft">{t.notAdvice}</p>
      </main>
      {footer && (
        <div className="sticky bottom-0 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function LangToggle({ options, lang, setLang }) {
  return (
    <div className="flex rounded-full bg-paper p-0.5" role="group" aria-label="Language">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${lang === value ? "bg-ink text-white" : "text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// 4 steps: Check, Deadline, Answer, Help. step is 1–4.
function Progress({ step, labels }) {
  return (
    <ol className="flex gap-1.5 px-5 pb-4" aria-label="Progress">
      {labels.map((label, i) => (
        <li key={label} className="flex-1">
          <div className={`h-1.5 rounded-full ${i < step ? "bg-ink" : "bg-line"}`} />
          <span className={`mt-1.5 block text-[11px] ${i === step - 1 ? "font-semibold text-ink" : "text-ink-soft"}`}>
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}

// The big bottom button. as="label" wraps a hidden camera input.
export function BigButton({ children, onClick, disabled, variant = "primary", as = "button", ...rest }) {
  const styles = {
    primary: "bg-ink text-white active:bg-ink/85",
    secondary: "border-2 border-ink text-ink bg-paper active:bg-page",
    help: "bg-help text-white active:bg-help/85",
  };
  const className = `flex min-h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 text-lg font-semibold transition ${
    styles[variant]
  } ${disabled ? "pointer-events-none opacity-40" : ""}`;
  if (as === "label") return <label className={className} {...rest}>{children}</label>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  );
}

export function Loading({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center" role="status">
      <div className="mb-5 h-2 w-32 overflow-hidden rounded-full bg-page">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-mark" />
      </div>
      <p className="text-xl font-semibold text-ink">{message}</p>
    </div>
  );
}

// A "thing to check": a tinted row with a colored edge. Red is urgent, amber is
// "you may have an option", info is neutral.
export function CheckCard({ card }) {
  const styles = {
    red: "border-urgent bg-urgent-soft",
    amber: "border-caution bg-caution-soft",
    info: "border-line bg-page",
  };
  return (
    <li className={`rounded-r-xl border-l-4 px-4 py-3 ${styles[card.level] ?? styles.info}`}>
      <p className={`font-semibold ${card.level === "red" ? "text-urgent" : card.level === "amber" ? "text-caution" : "text-ink"}`}>
        {card.title}
      </p>
      <p className="mt-1 text-[15px] leading-relaxed text-ink">{card.body}</p>
    </li>
  );
}

export function Field({ label, hint, flagged, flagText, children }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-ink">
        {label}
        {flagged && <span className="rounded bg-mark px-1.5 py-0.5 text-[11px] font-semibold text-ink">{flagText}</span>}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

export const inputClass =
  "w-full rounded-xl border-2 border-line bg-paper px-3.5 py-3 text-base text-ink focus:border-ink focus:outline-none";

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="mt-4 rounded-xl bg-urgent-soft px-4 py-3 text-sm text-urgent" role="alert">
      {message}
    </p>
  );
}
