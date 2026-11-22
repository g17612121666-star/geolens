import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { mapPoint } from "@/lib/equal-earth";
import { fetchQuakes, type Quake } from "@/lib/quakes";
import { seasonWords } from "@/lib/enso-seasons";

type WorldMap = {
  width: number;
  height: number;
  outline: string;
  graticule: string;
  land: string;
  plates: string;
};
type Enso = { status: string | null; oni: { season: string; year: number; anomaly: number }[] };

const ago = (time: number) => {
  const hours = Math.max(1, Math.round((Date.now() - time) / 3_600_000));
  return hours < 48 ? `${hours} hours ago` : `${Math.round(hours / 24)} days ago`;
};
const radius = (mag: number) => 1.6 + Math.max(0, mag - 4.5) * 2.2;

/**
 * The past week's earthquakes on an Equal Earth map with today's plate boundaries, and NOAA's
 * current ENSO status. Nothing loads until the section is close to the screen; without the live
 * feeds the map still shows the plates.
 */
export function QuakeMap() {
  const ref = useRef<HTMLElement>(null);
  const [near, setNear] = useState(false);
  const [map, setMap] = useState<WorldMap | null>(null);
  const [quakes, setQuakes] = useState<Quake[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [enso, setEnso] = useState<Enso | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    const controller = new AbortController();
    void fetch("/home/world-map.json", { signal: controller.signal })
      .then((r) => r.json())
      .then(setMap)
      .catch(() => undefined);
    void fetchQuakes("4.5_week", controller.signal)
      .then((q) => setQuakes([...q].sort((a, b) => a.mag - b.mag)))
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    void fetch("/api/enso", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: (Enso & { error?: string }) | null) => {
        if (data && !data.error) setEnso(data);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [near]);

  const strongest = quakes?.length ? quakes[quakes.length - 1] : null;
  const latestOni = enso?.oni.at(-1);
  return (
    <section ref={ref} aria-labelledby="quakes-heading" className="border-y border-white/10">
      <div className="mx-auto grid max-w-[1280px] gap-x-12 gap-y-8 px-5 py-14 lg:grid-cols-[minmax(0,1fr)_20rem] md:py-20">
        <figure className="min-w-0">
          <div className="relative aspect-[1000/487] w-full">
            {map && (
              <svg
                viewBox={`0 0 ${map.width} ${map.height}`}
                className="absolute inset-0 size-full"
                role="img"
                aria-label={
                  quakes
                    ? `World map of ${quakes.length} earthquakes of magnitude 4.5 or more in the past 7 days, with plate boundaries`
                    : "World map of plate boundaries"
                }
              >
                <path d={map.outline} className="fill-[color:var(--map-ocean)]" />
                <path
                  d={map.graticule}
                  fill="none"
                  className="stroke-[color:var(--map-grid)]"
                  strokeWidth={0.6}
                />
                <path
                  d={map.land}
                  fillRule="evenodd"
                  className="fill-[color:var(--map-land)] stroke-[color:var(--map-coast)]"
                  strokeWidth={0.5}
                />
                <path
                  d={map.plates}
                  fill="none"
                  className="stroke-[color:var(--map-plate)]"
                  strokeWidth={1.1}
                  strokeLinejoin="round"
                />
                {quakes?.map((q) => {
                  const [x, y] = mapPoint(q.lon, q.lat);
                  return (
                    <circle
                      key={q.id}
                      cx={x}
                      cy={y}
                      r={radius(q.mag)}
                      className="fill-[color:var(--map-quake)] stroke-[color:var(--map-quake-edge)]"
                      fillOpacity={0.72}
                      strokeWidth={0.6}
                    />
                  );
                })}
                {strongest &&
                  (() => {
                    const [x, y] = mapPoint(strongest.lon, strongest.lat);
                    return (
                      <circle
                        cx={x}
                        cy={y}
                        r={radius(strongest.mag) + 5}
                        fill="none"
                        className="stroke-[color:var(--color-chalk)]"
                        strokeWidth={1.2}
                      />
                    );
                  })()}
              </svg>
            )}
          </div>
          <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-mist">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full bg-[color:var(--map-quake)]"
              />
              Earthquake, sized by magnitude
            </span>
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-0.5 w-5 bg-[color:var(--map-plate)]"
              />
              Plate boundary
            </span>
            <span>Equal Earth projection</span>
          </figcaption>
        </figure>
        <div>
          <h2 id="quakes-heading" className="font-display text-3xl text-chalk">
            Earthquakes this week
          </h2>
          <p className="mt-3 leading-7 text-mist">
            Every earthquake of magnitude 4.5 or more that the US Geological Survey recorded in the
            past 7 days. Most line up along plate boundaries, where plates pull apart, collide or
            slide past each other.
          </p>
          <div className="mt-5 border-t border-white/10 pt-4" aria-live="polite">
            {quakes ? (
              <>
                <p className="font-display text-4xl text-chalk">{quakes.length}</p>
                <p className="text-sm text-mist">earthquakes of M4.5 or more</p>
                {strongest && (
                  <p className="mt-3 text-sm leading-6 text-chalk">
                    {`Strongest: M${strongest.mag.toFixed(1)}, ${strongest.place}, ${ago(strongest.time)}.`}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-mist">
                {failed
                  ? "The live earthquake feed didn’t load. The map still shows the plate boundaries."
                  : "Loading the past week’s earthquakes…"}
              </p>
            )}
          </div>
          <p className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <Link
              to="/tools/earthquakes"
              className="text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
            >
              Live earthquakes on a 3D globe
            </Link>
            <Link
              to="/lab/$slug"
              params={{ slug: "plate-boundaries" }}
              className="text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
            >
              Plate boundaries lab
            </Link>
          </p>
          {enso?.status && (
            <div className="mt-6 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-chalk">El Niño and La Niña now</h3>
              <p className="mt-1 text-sm leading-6 text-mist">
                {`NOAA: ${enso.status}.`}
                {latestOni &&
                  ` The tropical Pacific was ${Math.abs(latestOni.anomaly).toFixed(1)} °C ${latestOni.anomaly >= 0 ? "warmer" : "cooler"} than normal from ${seasonWords(latestOni.season, latestOni.year)} (the Oceanic Niño Index).`}
              </p>
              <Link
                to="/lab/$slug"
                params={{ slug: "enso" }}
                className="mt-1 inline-block text-sm text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
              >
                ENSO lab
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
