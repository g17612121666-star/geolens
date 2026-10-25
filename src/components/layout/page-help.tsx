import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { HelpCircle, X } from "lucide-react";

/** Short, page-specific tips; the first matching prefix wins. */
const TIPS: [string, string, string[]][] = [
  [
    "/trips/",
    "Field trip",
    [
      "Press Next or the → key to fly to the next stop; ← goes back.",
      "The coloured box is the one fact to remember from each stop.",
      "Open the lab to see the process at work, set up for that place.",
      "Your progress is kept on this device, so you can continue later.",
    ],
  ],
  [
    "/trips",
    "Field trips",
    [
      "Pick a trip, or search for a place or word to jump straight to a stop.",
      "The bar on each card shows how far you have got.",
    ],
  ],
  [
    "/practice/where",
    "Where on Earth?",
    [
      "Look for clues in the photo: rock, ice, plants, coast and sky.",
      "Click the map to place a guess; you can move it before locking it in.",
      "Only your first game each day counts towards your streak.",
    ],
  ],
  [
    "/practice/landforms",
    "World landforms",
    [
      "Study first: click a name to fly to it on the map.",
      "In Quiz and Speed round, click where the named feature is. Large features accept a wide area.",
      "Use the filters to practise one type of feature or an easier level.",
    ],
  ],
  [
    "/practice",
    "Practice",
    [
      "The Daily 5 and Where on Earth? are the same for everyone each day.",
      "Do either one each day to keep your streak going.",
      "Points, levels and streaks stay in this browser only.",
    ],
  ],
  [
    "/tools/map",
    "World map studio",
    [
      "Open ‘Basemap and optional teaching layers’ to add plates, rivers, currents or live day and night.",
      "Use Measure km or Measure km² and click points on the map.",
      "Copy view link to share exactly what you see, including layers.",
    ],
  ],
  [
    "/atlas",
    "Atlas",
    [
      "Search for a place, then compare it with another side by side.",
      "Open a lab from ‘Read the evidence’ to explain what the place shows.",
    ],
  ],
  ["/explore", "Explore", ["Filter the labs by subject or age, or search by topic."]],
  [
    "/",
    "Geolens",
    [
      "New here? Start with a field trip, then open the labs it links to.",
      "Try today’s Daily 5 to keep a streak going.",
      "Every lab has its own keyboard shortcuts: press ? inside a lab.",
    ],
  ],
];

const SHORTCUTS: [string, string][] = [
  ["?", "Open or close this help"],
  ["/", "Search Geolens"],
  ["← →", "Previous or next stop on a field trip"],
  ["Esc", "Close this panel"],
];

export function PageHelp({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const panel = useRef<HTMLDivElement>(null);
  const [, title, tips] =
    TIPS.find(([p]) => (p === "/" ? pathname === "/" : pathname.startsWith(p))) ??
    TIPS[TIPS.length - 1];
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/INPUT|TEXTAREA|SELECT/.test(el.tagName) || el.isContentEditable)) return;
      if (e.key === "?") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
      else if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        void navigate({ to: "/search" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  useEffect(() => {
    if (open) panel.current?.focus();
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="page-help"
        aria-label="Tips for this page"
        className="fixed bottom-5 left-5 z-40 inline-flex size-12 items-center justify-center rounded-full border border-white/15 bg-basalt/95 text-chalk shadow-lg backdrop-blur hover:text-glacier"
      >
        <HelpCircle className="size-6" aria-hidden="true" />
      </button>
      {open && (
        <div
          id="page-help"
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label={`Tips: ${title}`}
          className="fixed bottom-20 left-5 z-40 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-white/12 bg-basalt/98 p-5 shadow-2xl outline-none"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-display text-xl text-chalk">{`Tips: ${title}`}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close tips"
              className="inline-flex size-9 items-center justify-center rounded-full text-mist hover:bg-white/8"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-mist">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="section-label mt-5">{"Keyboard shortcuts"}</p>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt>
                  <kbd className="rounded border border-white/20 px-1.5 py-0.5 font-mono text-xs text-chalk">
                    {k}
                  </kbd>
                </dt>
                <dd className="text-mist">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm text-mist">
            {"New to Geolens? "}
            <Link to="/trips" className="text-glacier hover:underline">
              {"Start with a field trip"}
            </Link>
            {"."}
          </p>
        </div>
      )}
    </>
  );
}
