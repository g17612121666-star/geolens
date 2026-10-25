import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, MapPinned, Route as RouteIcon, Sparkles } from "lucide-react";
import { dayKey, placeOfTheDay, readDaily, streak } from "@/lib/daily";
import { FIELD_TRIPS, readTripProgress, tripPhoto } from "@/lib/field-trips";

/** Home-page row of today's challenges, the place of the day and the next field trip. */
export function TodayStrip() {
  const day = dayKey();
  const [s, setS] = useState({
    streak: 0,
    quiz: false,
    where: false,
    next: FIELD_TRIPS[0].slug,
    nextStop: 1,
  });
  useEffect(() => {
    const d = readDaily(),
      trips = readTripProgress(),
      open = FIELD_TRIPS.find((t) => !trips[t.slug]?.done) ?? FIELD_TRIPS[0];
    setS({
      streak: streak(d),
      quiz: d.days[day]?.quiz != null,
      where: d.days[day]?.where != null,
      next: open.slug,
      nextStop: Math.max(1, trips[open.slug]?.seen ?? 1),
    });
  }, [day]);
  const place = placeOfTheDay(day),
    photo = tripPhoto(place.photo),
    trip = FIELD_TRIPS.find((t) => t.slug === s.next) ?? FIELD_TRIPS[0];
  const card =
    "editorial-card flex min-h-24 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4";
  return (
    <section className="mx-auto max-w-[1280px] px-5 pb-10" aria-labelledby="today-heading">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="today-heading" className="section-label">
          {"Today"}
        </h2>
        {s.streak > 0 && (
          <p className="inline-flex items-center gap-1.5 text-sm text-sandstone">
            <Flame className="size-4" aria-hidden="true" />
            {`${s.streak} day streak`}
          </p>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/practice/daily" className={card}>
          <Sparkles className="size-8 shrink-0 text-glacier" aria-hidden="true" />
          <span>
            <span className="block text-chalk">{"Daily 5"}</span>
            <span className="block text-sm text-mist">
              {s.quiz ? "Done today ✓" : "Five quick questions, new every day"}
            </span>
          </span>
        </Link>
        <Link to="/practice/where" className={card}>
          <MapPinned className="size-8 shrink-0 text-glacier" aria-hidden="true" />
          <span>
            <span className="block text-chalk">{"Where on Earth?"}</span>
            <span className="block text-sm text-mist">
              {s.where ? "Done today ✓" : "Pin five landscape photos on the map"}
            </span>
          </span>
        </Link>
        <Link
          to="/trips/$slug"
          params={{ slug: place.trip }}
          search={{ stop: place.stop }}
          className={card}
        >
          {photo && (
            <img src={photo.src} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
          )}
          <span>
            <span className="block text-chalk">{place.title}</span>
            <span className="block text-sm text-mist">{`Place of the day · ${place.place}`}</span>
          </span>
        </Link>
        <Link
          to="/trips/$slug"
          params={{ slug: trip.slug }}
          search={{ stop: s.nextStop }}
          className={card}
        >
          <RouteIcon className="size-8 shrink-0 text-glacier" aria-hidden="true" />
          <span className="flex-1">
            <span className="block text-chalk">{trip.title}</span>
            <span className="block text-sm text-mist">
              {s.nextStop > 1
                ? `Field trip · continue at stop ${s.nextStop}`
                : "Field trip · start here"}
            </span>
          </span>
          <ArrowRight className="size-4 text-mist" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
