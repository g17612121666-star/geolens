import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, Palette } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
export function PreferencesMenu() {
  const { theme, setTheme, units, setUnits } = usePreferences(),
    [open, setOpen] = useState(false),
    root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        root.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div ref={root} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-xl text-chalk hover:bg-white/8"
        aria-label="Appearance and units"
        aria-expanded={open}
        aria-controls="site-preferences"
        onClick={() => setOpen((v) => !v)}
      >
        <Palette size={19} />
      </button>
      {open && (
        <div
          id="site-preferences"
          className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-white/15 bg-basalt p-4 shadow-xl"
        >
          <fieldset>
            <legend className="mb-3 text-sm text-mist">Appearance</legend>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["light", Sun, "Light"],
                  ["dark", Moon, "Dark"],
                  ["system", Monitor, "System"],
                ] as const
              ).map(([value, Icon, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={theme === value}
                  onClick={() => setTheme(value)}
                  className={
                    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border text-sm " +
                    (theme === value
                      ? "border-glacier bg-glacier/10 text-glacier"
                      : "border-white/15 text-chalk")
                  }
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm text-mist">Weather units</legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["metric", "Metric", "°C, mm, m/s"],
                  ["us", "US", "°F, in, mph"],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={units === value}
                  onClick={() => setUnits(value)}
                  className={
                    "flex min-h-14 flex-col items-center justify-center rounded-xl border text-sm " +
                    (units === value
                      ? "border-glacier bg-glacier/10 text-glacier"
                      : "border-white/15 text-chalk")
                  }
                >
                  {label}
                  <span className="text-xs text-mist">{hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-5 text-mist">
              For Live weather and earthquake depths. Labs stay metric, as in science class.
            </p>
          </fieldset>
        </div>
      )}
    </div>
  );
}
