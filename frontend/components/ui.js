// Building blocks shared by every screen.
import { useEffect, useRef } from "react";
import { LANGS } from "@/lib/strings";

// The frame: header (name, privacy note, language), progress, content on a
// white "paper" sheet, the disclaimer, and a sticky bottom area for actions.
export function Shell({ t, lang, setLang, place, step, footer, demo, onBack, children }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-4">
        <span className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight whitespace-nowrap text-ink">
          <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-mark text-ink">
            <Icon name="calendar" className="h-[1.1rem] w-[1.1rem]" />
          </span>
          {t.appName}
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-help-soft px-2.5 py-1 text-xs font-semibold text-help">
            <Icon name="lock" className="h-3.5 w-3.5" /> {t.neverSaved}
          </span>
          <LangToggle options={LANGS[place]} lang={lang} setLang={setLang} />
        </div>
      </header>
      {step > 0 && onBack && (
        <div className="-mt-1 px-3 pb-2">
          <button
            type="button"
            onClick={onBack}
            className="press inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-[15px] font-semibold text-ink hover:bg-paper"
          >
            <Icon name="arrow" className="h-5 w-5 rotate-180" /> {t.back}
          </button>
        </div>
      )}
      {step > 0 && <Progress t={t} step={step} />}
      <main className="flex min-w-0 flex-1 flex-col rounded-t-3xl border-t border-line bg-paper px-5 pt-6 pb-8">
        {demo && (
          <p className="mb-5 inline-flex items-center gap-1.5 self-start rounded-full bg-caution-soft px-2.5 py-1 text-xs font-semibold text-caution">
            <span aria-hidden="true" className="pulse-dot h-1.5 w-1.5 rounded-full bg-caution" /> {t.demoNote}
          </p>
        )}
        {/* key={step} replays the entrance animation every time the screen changes */}
        <div key={step} className="screen-in min-w-0 flex-1">{children}</div>
        <p className="mt-12 text-xs leading-relaxed text-ink-soft">{t.notAdvice}</p>
      </main>
      {footer && (
        <div className="sticky bottom-0 border-t border-line bg-paper/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}

export function Icon({ name, className = "h-5 w-5" }) {
  const paths = {
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
    alert: <><path d="M12 3 2 20h20L12 3z" /><path d="M12 10v4" /><path d="M12 17h.01" /></>,
    option: <><circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    check: <path d="m5 12 4.5 4.5L19 7" />,
    speaker: <><path d="M4 9v6h4l5 4V5L8 9H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /></>,
    pause: <><path d="M8 5v14" /><path d="M16 5v14" /></>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    file: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 17h4" /></>,
    pin: <><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
    calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></>,
    download: <><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function LangToggle({ options, lang, setLang }) {
  return (
    <div className="flex rounded-full border border-line bg-paper p-0.5" role="group" aria-label="Language">
      {options.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={`min-h-8 rounded-full px-3 text-xs font-semibold ${lang === value ? "bg-ink text-white" : "text-ink"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// 4 steps, each named. Done steps get a tick and the current one is bold, so
// the state never depends on color alone. Steps are not clickable on purpose.
function Progress({ t, step }) {
  const labels = t.steps;
  return (
    <nav aria-label={t.stepOf(step, labels.length)} className="px-5 pb-4">
      <p className="sr-only">
        {t.stepOf(step, labels.length)}: {labels[step - 1]}
      </p>
      <ol className="flex gap-1.5">
        {labels.map((label, i) => {
          const state = i < step - 1 ? "done" : i === step - 1 ? "current" : "next";
          return (
            <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={state === "current" ? "step" : undefined}>
              <span className={`h-1.5 rounded-full transition-colors duration-500 ${state === "next" ? "bg-line" : "bg-ink"}`} />
              <span
                className={`flex items-center gap-1 truncate text-xs ${
                  state === "current" ? "font-bold text-ink" : state === "done" ? "font-medium text-ink" : "text-ink-soft"
                }`}
              >
                {state === "done" && <Icon name="check" className="pop h-3 w-3 shrink-0 text-help" />}
                {label}
                {state === "done" && <span className="sr-only">: {t.done}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// The big bottom button. as="label" wraps a hidden camera input.
// icon: a leading icon name. arrow: a trailing arrow that nudges on hover,
// used on buttons that move you to the next step.
export function BigButton({ children, onClick, disabled, variant = "primary", as = "button", icon, arrow, ...rest }) {
  const styles = {
    primary: "bg-ink text-white hover:bg-ink-hover",
    secondary: "border-2 border-ink text-ink bg-paper hover:bg-mark-soft",
    help: "bg-help text-white hover:bg-help/90",
    quiet: "text-ink underline underline-offset-4 hover:bg-page",
  };
  const className = `press flex min-h-14 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl px-4 text-lg font-semibold ${
    styles[variant]
  } ${disabled ? "pointer-events-none cursor-not-allowed opacity-40" : ""}`;
  const inner = (
    <>
      {icon && <Icon name={icon} className="h-5 w-5 shrink-0" />}
      {children}
      {arrow && <Icon name="arrow" className="nudge h-5 w-5 shrink-0" />}
    </>
  );
  if (as === "label") return <label className={className} {...rest}>{inner}</label>;
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-disabled={disabled || undefined} className={className} {...rest}>
      {inner}
    </button>
  );
}

// Calm waiting state: a slow bar (no fake percentage) and a line saying what's happening.
export function Loading({ message, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center" role="status" aria-live="polite">
      <div className="mb-6 h-2 w-36 overflow-hidden rounded-full bg-page">
        <div className="loading-bar h-full w-1/3 rounded-full bg-ink" />
      </div>
      <p className="text-xl font-semibold text-ink">{message}</p>
      {sub && <p className="mt-2 max-w-xs text-[15px] text-ink-soft">{sub}</p>}
    </div>
  );
}

// A "thing to check". Urgent = red + warning icon, option = amber + circle icon,
// info = grey + info icon. The icon and wording carry the meaning, not just color.
export function CheckCard({ title, body, level, index = 0 }) {
  const look = {
    red: { box: "border-urgent bg-urgent-soft", head: "text-urgent", icon: "alert" },
    amber: { box: "border-caution bg-caution-soft", head: "text-caution", icon: "option" },
    info: { box: "border-line bg-page", head: "text-ink", icon: "info" },
  }[level] ?? { box: "border-line bg-page", head: "text-ink", icon: "info" };
  return (
    <li className={`stagger flex gap-3 rounded-r-xl border-l-4 px-4 py-3.5 ${look.box}`} style={{ "--i": index }}>
      <span className={`mt-0.5 shrink-0 ${look.head}`}>
        <Icon name={look.icon} />
      </span>
      <div>
        <p className={`font-semibold leading-snug ${look.head}`}>{title}</p>
        <p className="mt-1 text-[15px] leading-relaxed text-ink">{body}</p>
      </div>
    </li>
  );
}

// A labelled form field. Pass id so the hint and error are tied to the input.
export function Field({ id, label, hint, optional, flagged, flagText, error, children }) {
  return (
    <div>
      <label htmlFor={id} className="flex flex-wrap items-center justify-between gap-2 text-[15px] font-semibold text-ink">
        <span>
          {label}
          {optional && <span className="font-normal text-ink-soft"> ({optional})</span>}
        </span>
        {flagged && (
          <span className="inline-flex items-center gap-1 rounded bg-mark px-1.5 py-0.5 text-xs font-semibold text-ink">
            <Icon name="option" className="h-3.5 w-3.5" /> {flagText}
          </span>
        )}
      </label>
      {hint && <p id={`${id}-hint`} className="mt-0.5 text-sm text-ink-soft">{hint}</p>}
      <div className="mt-1.5">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-urgent">
          <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "block min-h-12 w-full rounded-xl border-2 border-line bg-paper px-3.5 py-2.5 text-base text-ink placeholder:text-ink-soft/80 transition-colors hover:border-ink-soft focus:border-ink focus:outline-none";

// Errors keep the person's work and offer a retry.
export function ErrorNote({ message, onRetry, retryLabel }) {
  const ref = useRef(null);
  // Bring the error into view so it's never hidden below the fold.
  useEffect(() => {
    if (message) ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [message]);
  if (!message) return null;
  return (
    <div ref={ref} className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-urgent-soft px-4 py-3" role="alert">
      <p className="flex items-start gap-2 text-[15px] text-urgent">
        <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" /> {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="min-h-11 rounded-xl border-2 border-urgent px-4 font-semibold text-urgent">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
