import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { FIELD_TRIPS, readTripProgress, tripPhoto, type TripProgress } from "@/lib/field-trips";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/trips/")({
  component: TripsIndex,
  head: () =>
    headFor({
      title: "Field trips",
      description:
        "Guided field trips on a real map: fly to rifts, glaciers, rivers, coasts and deserts, see each place in a photograph and open the 3D lab that explains it.",
      path: "/trips",
    }),
});

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function TripsIndex() {
  const [q, setQ] = useState("");
  const [progress, setProgress] = useState<TripProgress>({});
  useEffect(() => setProgress(readTripProgress()), []);
  const needle = fold(q.trim());
  // Search matches trips and individual stops, so "Everest" or "delta" finds the right stop.
  const hits = useMemo(
    () =>
      needle
        ? FIELD_TRIPS.flatMap((t) =>
            t.stops
              .map((s, i) => ({ t, s, i }))
              .filter(({ s }) =>
                fold(`${s.title} ${s.place} ${s.fact} ${s.body} ${t.title}`).includes(needle),
              ),
          )
        : [],
    [needle],
  );
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <div className="grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="section-label">{"Field trips"}</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">{"Stories told on the map."}</h1>
        </div>
        <p className="self-end text-lg leading-8 text-mist">
          {
            "Each stop flies you to a real place, shows it in a photograph and explains what you see. Then open the 3D lab, already set up for that place, to see the process at work."
          }
        </p>
      </div>
      <label className="mt-8 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.04] px-4">
        <Search className="size-5 text-mist" aria-hidden="true" />
        <span className="sr-only">{"Search field trips and stops"}</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            "Search trips and stops: a place, a landform or a word (e.g. delta, Iceland)"
          }
          className="min-h-12 w-full bg-transparent text-chalk outline-none placeholder:text-mist/70"
        />
      </label>
      {needle && (
        <section className="mt-6" aria-live="polite">
          <p className="text-sm text-mist">
            {hits.length ? `${hits.length} matching stops` : "No stops match that search."}
          </p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {hits.map(({ t, s, i }) => (
              <li key={`${t.slug}-${i}`}>
                <Link
                  to="/trips/$slug"
                  params={{ slug: t.slug }}
                  search={{ stop: i + 1 }}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-3 hover:border-glacier/50"
                >
                  <img
                    src={tripPhoto(s.photo)?.src}
                    alt=""
                    className="size-16 shrink-0 rounded-lg object-cover"
                    loading="lazy"
                  />
                  <span>
                    <span className="block text-chalk">{s.title}</span>
                    <span className="block text-sm text-mist">
                      {s.place} · {t.title}, stop {i + 1}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {FIELD_TRIPS.map((t) => {
          const p = progress[t.slug],
            seen = Math.min(t.stops.length, p?.seen ?? 0),
            cover = tripPhoto(t.stops[0].photo);
          return (
            <article
              key={t.slug}
              className="editorial-card flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={cover?.src}
                  alt={cover?.alt ?? ""}
                  className="size-full object-cover"
                  loading="lazy"
                />
                <span
                  className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-basalt"
                  style={{ background: t.colour }}
                >
                  {t.kicker}
                </span>
                {p?.done && (
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-basalt/85 px-3 py-1 text-xs text-glacier">
                    <Check className="size-3.5" aria-hidden="true" />
                    {"Completed"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-display text-2xl text-chalk">{t.title}</h2>
                <p className="mt-2 text-mist">{t.summary}</p>
                <ul className="mt-3 space-y-1 text-sm text-mist">
                  {t.stops.slice(0, 3).map((s) => (
                    <li key={s.title}>{`› ${s.title}`}</li>
                  ))}
                  <li className="text-mist/70">{`+ ${t.stops.length - 3} more stops`}</li>
                </ul>
                <div className="mt-auto flex items-center gap-4 pt-5">
                  <span
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-label={`${t.title}: ${seen} of ${t.stops.length} stops visited`}
                    aria-valuemin={0}
                    aria-valuemax={t.stops.length}
                    aria-valuenow={seen}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${(100 * seen) / t.stops.length}%`, background: t.colour }}
                    />
                  </span>
                  <span className="text-sm text-mist">{`${t.stops.length} stops`}</span>
                  <Link
                    to="/trips/$slug"
                    params={{ slug: t.slug }}
                    search={seen > 0 && !p?.done ? { stop: seen } : {}}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full bg-glacier px-4 font-semibold text-basalt"
                  >
                    {seen > 0 && !p?.done ? "Continue" : "Start"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
