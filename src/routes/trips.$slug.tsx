import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FlaskConical, MapPin, X } from "lucide-react";
import { LibreMap } from "@/components/map/libre-map";
import { findTrip, saveTripProgress, tripPhoto, type FieldTrip } from "@/lib/field-trips";
import { headFor } from "@/lib/seo";

type TripSearch = { stop?: number };
export const Route = createFileRoute("/trips/$slug")({
  component: TripPlayer,
  validateSearch: (s: Record<string, unknown>): TripSearch => {
    const n = Number(s.stop);
    return Number.isFinite(n) && n >= 1 ? { stop: Math.floor(n) } : {};
  },
  beforeLoad: ({ params }) => {
    if (!findTrip(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    const t = findTrip(params.slug);
    return headFor({
      title: t ? `${t.title} · Field trip` : "Field trip",
      description: t?.summary ?? "A guided field trip on the map.",
      path: `/trips/${params.slug}`,
    });
  },
});

function TripPlayer() {
  const { slug } = Route.useParams();
  const trip = findTrip(slug);
  if (!trip) throw notFound();
  return <Player key={slug} trip={trip} />;
}

function Player({ trip }: { trip: FieldTrip }) {
  const { stop } = Route.useSearch();
  const navigate = useNavigate({ from: "/trips/$slug" });
  const n = trip.stops.length;
  // Stop n + 1 is the closing check question.
  const index = Math.min(n, Math.max(0, (stop ?? 1) - 1));
  const atEnd = index === n;
  const s = trip.stops[Math.min(index, n - 1)];
  const photo = tripPhoto(s.photo);
  const go = (i: number) =>
    navigate({ search: { stop: Math.min(n + 1, Math.max(1, i + 1)) }, replace: true });
  useEffect(() => saveTripProgress(trip.slug, Math.min(n, index + 1)), [trip.slug, index, n]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && /INPUT|TEXTAREA|SELECT/.test(el.tagName)) return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const overlays = useMemo(
    () => [
      {
        id: "trip-route",
        color: trip.colour,
        width: 1.6,
        opacity: 0.6,
        labels: false,
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: trip.stops.map((p) => [p.lon, p.lat]),
              },
            },
          ],
        },
      },
      {
        id: "trip-stops",
        color: trip.colour,
        circle: true,
        data: {
          type: "FeatureCollection",
          features: trip.stops.map((p, i) => ({
            type: "Feature",
            properties: { letter: String(i + 1), name: p.place },
            geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          })),
        },
      },
    ],
    [trip],
  );
  return (
    <main id="main" className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 md:px-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Link to="/trips" className="text-sm text-mist hover:text-chalk">
          {"← All field trips"}
        </Link>
        <h1 className="font-display text-2xl text-chalk md:text-3xl">{trip.title}</h1>
        <span className="text-sm text-mist">
          {atEnd ? "Check your understanding" : `Stop ${index + 1} of ${n}`}
        </span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_26rem]">
        <LibreMap
          center={atEnd ? [0, 20] : [s.lon, s.lat]}
          zoom={atEnd ? 1.3 : s.zoom}
          marker={atEnd ? null : [s.lon, s.lat]}
          overlays={overlays}
          baseMap="relief"
          inspectFeatures={false}
          label={`Map of ${trip.title}`}
          className="h-[46vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench lg:h-[calc(100vh-9rem)]"
        />
        <section
          aria-live="polite"
          className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt/90"
        >
          {atEnd ? (
            <Check trip={trip} onBack={() => go(n - 1)} />
          ) : (
            <>
              {photo && (
                <figure>
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <figcaption className="px-5 pt-2 text-xs text-mist/80">{photo.credit}</figcaption>
                </figure>
              )}
              <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3">
                <p className="inline-flex items-center gap-1.5 text-sm text-mist">
                  <MapPin className="size-4" aria-hidden="true" style={{ color: trip.colour }} />
                  {s.place}
                </p>
                <h2 className="mt-1 font-display text-2xl text-chalk">{s.title}</h2>
                <p
                  className="mt-3 rounded-xl px-4 py-3 font-semibold leading-6 text-chalk"
                  style={{ background: `${trip.colour}26`, borderLeft: `4px solid ${trip.colour}` }}
                >
                  {s.fact}
                </p>
                <p className="mt-3 leading-7 text-mist">{s.body}</p>
                <a
                  href={`/lab/${s.lab}`}
                  className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-glacier/40 px-4 text-glacier hover:bg-glacier/10"
                >
                  <FlaskConical className="size-4" aria-hidden="true" />
                  {`Open the lab: ${s.labLabel}`}
                </a>
              </div>
              <nav
                className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-3"
                aria-label="Field trip stops"
              >
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-chalk disabled:opacity-40"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {"Back"}
                </button>
                <span className="text-sm text-mist" aria-hidden="true">
                  {"← → keys"}
                </span>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full px-5 font-semibold text-basalt"
                  style={{ background: trip.colour }}
                >
                  {index === n - 1 ? "Finish" : "Next"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </nav>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function Check({ trip, onBack }: { trip: FieldTrip; onBack: () => void }) {
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === trip.check.answer;
  useEffect(() => {
    if (right) saveTripProgress(trip.slug, trip.stops.length, true);
  }, [right, trip]);
  return (
    <div className="flex flex-1 flex-col p-5">
      <p className="section-label">{"Check your understanding"}</p>
      <h2 className="mt-2 font-display text-2xl text-chalk">{trip.check.prompt}</h2>
      <div className="mt-4 grid gap-2" role="group" aria-label="Answer choices">
        {trip.check.choices.map((c, i) => (
          <button
            key={c}
            type="button"
            onClick={() => setPick(i)}
            aria-pressed={pick === i}
            className={`min-h-11 rounded-xl border px-4 py-2 text-left ${
              pick === i
                ? i === trip.check.answer
                  ? "border-glacier bg-glacier/15 text-chalk"
                  : "border-magma/60 bg-magma/10 text-chalk"
                : "border-white/12 text-mist hover:text-chalk"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      {pick !== null && (
        <p className="mt-4 leading-7 text-mist" aria-live="polite">
          <span className="font-semibold text-chalk">{right ? "Correct. " : "Not quite. "}</span>
          {right ? trip.check.why : "Look back at the stops and try again."}
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-3 pt-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-chalk"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {"Back to the last stop"}
        </button>
        <Link
          to="/trips"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-glacier px-4 font-semibold text-basalt"
        >
          <X className="size-4" aria-hidden="true" />
          {"Choose another trip"}
        </Link>
      </div>
    </div>
  );
}
