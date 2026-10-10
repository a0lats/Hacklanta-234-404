// Reusable building blocks shared by every screen.

// The frame around every screen: header, lock badge, language switch, progress bar,
// and a bottom area for the big thumb-friendly button.
export function Shell({ t, lang, setLang, step, footer, children }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-white">
      <header className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <span className="text-xl font-semibold tracking-tight text-brand">Witness</span>
        <div className="flex items-center gap-2">
          <LockBadge label={t.nothingStored} />
          <LangToggle lang={lang} setLang={setLang} />
        </div>
      </header>
      {step > 0 && <Progress step={step} labels={t.steps} />}
      <main className="flex-1 px-5 pt-2 pb-6">{children}</main>
      {footer && (
        <div className="sticky bottom-0 border-t border-brand-soft bg-white/95 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur">
          {footer}
        </div>
      )}
    </div>
  );
}

export function LockBadge({ label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {label}
    </span>
  );
}

function LangToggle({ lang, setLang }) {
  const option = (value, label) => (
    <button
      type="button"
      onClick={() => setLang(value)}
      aria-pressed={lang === value}
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        lang === value ? "bg-brand text-white" : "text-brand"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="flex rounded-full border border-brand-soft p-0.5">
      {option("english", "EN")}
      {option("pidgin", "Pidgin")}
    </div>
  );
}

// 4 segments: Evidence, Report, Mismatches, Letter. step is 1–4.
function Progress({ step, labels }) {
  return (
    <div className="px-5 pb-4">
      <div className="flex gap-1.5">
        {labels.map((label, i) => (
          <div key={label} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-brand" : "bg-brand-soft"}`} />
        ))}
      </div>
      <p className="mt-2 text-sm text-ink/60">
        {step}/4 · {labels[step - 1]}
      </p>
    </div>
  );
}

// The big bottom button. Pass `as="label"` to wrap a hidden camera input.
export function BigButton({ children, onClick, disabled, variant = "primary", as = "button", ...rest }) {
  const styles = {
    primary: "bg-brand text-white active:bg-brand-dark",
    secondary: "border-2 border-brand text-brand bg-white active:bg-brand-soft",
  };
  const className = `flex h-14 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl text-lg font-semibold transition ${
    styles[variant]
  } ${disabled ? "pointer-events-none opacity-40" : ""}`;
  if (as === "label") {
    return (
      <label className={className} {...rest}>
        {children}
      </label>
    );
  }
  if (as === "a") {
    return (
      <a className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={className} {...rest}>
      {children}
    </button>
  );
}

// Calm loading state with words instead of a spinner.
export function Loading({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center" role="status">
      <div className="mb-5 h-1.5 w-32 overflow-hidden rounded-full bg-brand-soft">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-brand" />
      </div>
      <p className="text-xl font-medium text-ink">{message}</p>
    </div>
  );
}

// A photo with Gemini's boxes drawn on top.
// Boxes are [ymin, xmin, ymax, xmax] on a 0–1000 scale, so dividing by 10 gives a CSS percentage.
// With no url (sample case before its photos are added), it shows a placeholder of the same shape.
export function PhotoWithBoxes({ url, boxes = [], label }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-soft">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="block h-auto w-full" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center text-sm text-brand/70">{label}</div>
      )}
      {boxes.map(({ label: boxLabel, box: [ymin, xmin, ymax, xmax] }, i) => (
        <div
          key={i}
          className="absolute rounded-md border-[3px] border-warn"
          style={{
            top: `${ymin / 10}%`,
            left: `${xmin / 10}%`,
            height: `${(ymax - ymin) / 10}%`,
            width: `${(xmax - xmin) / 10}%`,
          }}
        >
          <span className="absolute -top-0.5 left-0 -translate-y-full rounded bg-warn px-1.5 py-0.5 text-xs font-semibold text-warn-dark">
            {boxLabel}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SeverityTag({ severity, labels }) {
  const styles = {
    high: "bg-warn text-warn-dark",
    medium: "bg-warn-soft text-warn-dark",
    low: "bg-brand-soft text-brand",
  };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[severity] ?? styles.low}`}>
      {labels[severity] ?? severity}
    </span>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <p className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn-dark" role="alert">
      {message}
    </p>
  );
}
