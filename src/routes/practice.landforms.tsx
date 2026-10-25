import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FlaskConical, Timer } from "lucide-react";
import { LibreMap } from "@/components/map/libre-map";
import { haversineKm } from "@/lib/geo";
import {
  KIND_LABEL,
  WORLD_FEATURES,
  type FeatureKind,
  type WorldFeature,
} from "@/lib/world-features";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/practice/landforms")({
  component: LandformsPractice,
  head: () =>
    headFor({
      title: "World landforms practice",
      description:
        "Learn where the world's great mountain ranges, deserts, rivers, lakes, ice sheets and ocean features are, then test yourself on the map.",
      path: "/practice/landforms",
    }),
});

type Mode = "study" | "quiz" | "speed";
const KINDS = Object.keys(KIND_LABEL) as FeatureKind[];
const LEVELS = ["Easy", "Medium", "Hard"];
const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

function LandformsPractice() {
  const [mode, setMode] = useState<Mode>("study");
  const [kinds, setKinds] = useState<FeatureKind[]>(KINDS);
  const [maxLevel, setMaxLevel] = useState(3);
  const pool = useMemo(
    () => WORLD_FEATURES.filter((f) => kinds.includes(f.kind) && f.level <= maxLevel),
    [kinds, maxLevel],
  );
  return (
    <main id="main" className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 md:px-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <Link to="/practice" className="text-sm text-mist hover:text-chalk">
          {"← Practice"}
        </Link>
        <h1 className="font-display text-3xl text-chalk">{"World landforms"}</h1>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Mode">
        {(
          [
            ["study", "Study"],
            ["quiz", "Quiz"],
            ["speed", "Speed round"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded-full border px-4 text-sm ${
              mode === m ? "border-glacier bg-glacier text-basalt" : "border-white/15 text-chalk"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="mx-2 h-6 w-px bg-white/15" aria-hidden="true" />
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Feature types">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kinds.includes(k)}
              onClick={() =>
                setKinds((ks) =>
                  ks.includes(k) ? (ks.length > 1 ? ks.filter((x) => x !== k) : ks) : [...ks, k],
                )
              }
              className={`min-h-9 rounded-full border px-3 text-xs ${
                kinds.includes(k)
                  ? "border-glacier/50 bg-glacier/12 text-glacier"
                  : "border-white/12 text-mist"
              }`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <label className="ml-auto flex items-center gap-2 text-sm text-mist">
          {"Difficulty"}
          <select
            value={maxLevel}
            onChange={(e) => setMaxLevel(Number(e.target.value))}
            className="min-h-9 rounded-lg border border-white/15 bg-basalt px-2 text-chalk"
          >
            {LEVELS.map((l, i) => (
              <option key={l} value={i + 1}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>
      {mode === "study" ? (
        <Study pool={pool} />
      ) : (
        <Quiz key={`${mode}-${pool.length}-${maxLevel}`} pool={pool} speed={mode === "speed"} />
      )}
    </main>
  );
}

const ring = (f: WorldFeature, colour: string) => ({
  id: `feature-${colour.slice(1)}`,
  color: colour,
  circle: true,
  data: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: f.name },
        geometry: { type: "Point", coordinates: [f.lon, f.lat] },
      },
    ],
  },
});

function Study({ pool }: { pool: WorldFeature[] }) {
  const [sel, setSel] = useState<WorldFeature | null>(null);
  const overlays = useMemo(
    () => [
      {
        id: "study-all",
        color: "#7fc4e0",
        circle: true,
        data: {
          type: "FeatureCollection",
          features: pool.map((f) => ({
            type: "Feature",
            properties: { name: f.name },
            geometry: { type: "Point", coordinates: [f.lon, f.lat] },
          })),
        },
      },
    ],
    [pool],
  );
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section className="max-h-[calc(100vh-13rem)] overflow-y-auto rounded-2xl border border-white/10 bg-basalt/90 p-3">
        {sel && (
          <div
            className="mb-3 rounded-xl border border-glacier/40 bg-glacier/10 p-4"
            aria-live="polite"
          >
            <p className="text-xs text-mist">{KIND_LABEL[sel.kind]}</p>
            <h2 className="font-display text-2xl text-chalk">{sel.name}</h2>
            <p className="mt-2 leading-6 text-mist">{sel.note}</p>
            {sel.lab && (
              <a
                href={`/lab/${sel.lab}`}
                className="mt-3 inline-flex items-center gap-2 text-sm text-glacier hover:underline"
              >
                <FlaskConical className="size-4" aria-hidden="true" />
                {"Open the related lab"}
              </a>
            )}
          </div>
        )}
        {KINDS.filter((k) => pool.some((f) => f.kind === k)).map((k) => (
          <div key={k} className="mb-3">
            <p className="section-label px-2 pb-1">{KIND_LABEL[k]}</p>
            <ul>
              {pool
                .filter((f) => f.kind === k)
                .map((f) => (
                  <li key={f.name}>
                    <button
                      type="button"
                      onClick={() => setSel(f)}
                      aria-pressed={sel?.name === f.name}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm ${
                        sel?.name === f.name
                          ? "bg-white/10 text-chalk"
                          : "text-mist hover:text-chalk"
                      }`}
                    >
                      {f.name}
                      <span className="text-mist/60">{` · ${f.region}`}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>
      <LibreMap
        center={sel ? [sel.lon, sel.lat] : [15, 20]}
        zoom={sel ? 3.2 : 1.2}
        overlays={sel ? [...overlays, ring(sel, "#f2b84b")] : overlays}
        baseMap="relief"
        inspectFeatures={false}
        label="World map of physical features"
        className="h-[52vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench lg:h-[calc(100vh-13rem)]"
      />
    </div>
  );
}

function Quiz({ pool, speed }: { pool: WorldFeature[]; speed: boolean }) {
  const [order, setOrder] = useState(() => shuffle(pool).slice(0, speed ? pool.length : 10));
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const timeUp = speed && timeLeft <= 0;
  const done = i >= order.length || timeUp,
    f = order[Math.min(i, order.length - 1)];
  useEffect(() => {
    if (!speed || done) return;
    const id = window.setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearInterval(id);
  }, [speed, done]);
  const km = guess && f ? haversineKm(guess[1], guess[0], f.lat, f.lon) : 0,
    ok = guess != null && km <= f.radius;
  // In a speed round a click is checked at once and the next feature follows automatically.
  const answer = (c: [number, number]) => {
    if (guess || done) return;
    setGuess(c);
    const hit = haversineKm(c[1], c[0], f.lat, f.lon) <= f.radius;
    if (hit) setRight((r) => r + 1);
    if (speed) window.setTimeout(() => (setGuess(null), setI((x) => x + 1)), hit ? 500 : 1200);
  };
  const restart = () => {
    setOrder(shuffle(pool).slice(0, speed ? pool.length : 10));
    setI(0);
    setRight(0);
    setGuess(null);
    setTimeLeft(60);
  };
  if (!pool.length) return <p className="text-mist">{"No features match these filters."}</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <section
        className="flex flex-col rounded-2xl border border-white/10 bg-basalt/90 p-5"
        aria-live="polite"
      >
        {done ? (
          <>
            <p className="section-label">{timeUp ? "Time's up" : "Finished"}</p>
            <p className="mt-2 font-display text-5xl text-chalk">{`${right} / ${speed ? i : order.length}`}</p>
            <p className="mt-2 text-mist">{speed ? "found in 60 seconds" : "found on the map"}</p>
            <button
              type="button"
              onClick={restart}
              className="mt-6 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-glacier px-5 font-semibold text-basalt"
            >
              {"Play again"}
            </button>
          </>
        ) : (
          <>
            <p className="flex items-center justify-between text-sm text-mist">
              <span>
                {speed ? `${right} found` : `Question ${i + 1} of ${order.length} · ${right} right`}
              </span>
              {speed && (
                <span className="inline-flex items-center gap-1 text-sandstone">
                  <Timer className="size-4" aria-hidden="true" />
                  {`${timeLeft} s`}
                </span>
              )}
            </p>
            <p className="mt-4 text-sm text-mist">{`Click on the map: ${KIND_LABEL[f.kind].toLowerCase()}`}</p>
            <h2 className="font-display text-3xl text-chalk">{f.name}</h2>
            {guess && (
              <div className="mt-4">
                <p className={`font-semibold ${ok ? "text-glacier" : "text-magma"}`}>
                  {ok
                    ? "Correct!"
                    : `Not quite: about ${Math.round(km).toLocaleString("en-GB")} km from its centre.`}
                </p>
                {!speed && <p className="mt-2 leading-6 text-mist">{f.note}</p>}
              </div>
            )}
            {guess && !speed && (
              <button
                type="button"
                onClick={() => {
                  setGuess(null);
                  setI(i + 1);
                }}
                className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-glacier px-5 font-semibold text-basalt"
                autoFocus
              >
                {i === order.length - 1 ? "See my score" : "Next"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </button>
            )}
          </>
        )}
      </section>
      <LibreMap
        center={[15, 20]}
        zoom={1.2}
        marker={guess}
        overlays={guess && f ? [ring(f, ok ? "#3fb6a8" : "#e8613a")] : []}
        onClick={(c) => answer([c.lon, c.lat])}
        // An unlabelled ocean-floor basemap, so place names do not give the answers away.
        baseMap="bathymetry"
        inspectFeatures={false}
        label="World map: click where the named feature is"
        className="h-[52vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench lg:h-[calc(100vh-13rem)]"
      />
    </div>
  );
}
