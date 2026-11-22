import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { placeOfTheDay, readDaily, streak } from "@/lib/daily";
import { FIELD_TRIPS, readTripProgress } from "@/lib/field-trips";
import { tripCard } from "@/lib/photo-cards";
import { photoSrcSet } from "@/lib/responsive-image";
import { useToday } from "@/lib/use-today";

const DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const link =
  "text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier";

/** Today's place, the next field trip and the daily practice, as three photo-led cards. */
export function TodayCards() {
  const day = useToday();
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
    placePhoto = tripCard(place.photo),
    trip = FIELD_TRIPS.find((t) => t.slug === s.next) ?? FIELD_TRIPS[0],
    tripPhoto = tripCard(trip.stops[Math.min(s.nextStop, trip.stops.length) - 1].photo);
  const photo = (p: { src: string; alt: string } | undefined) =>
    p && (
      <img
        src={p.src}
        srcSet={photoSrcSet(p.src)}
        sizes="(min-width: 768px) 400px, 100vw"
        loading="lazy"
        decoding="async"
        alt={p.alt}
        className="aspect-[3/2] w-full rounded-[3px] bg-trench object-cover"
      />
    );
  return (
    <section aria-labelledby="today-heading" className="mx-auto max-w-[1280px] px-5 pt-16 md:pt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="today-heading" className="font-display text-3xl text-chalk md:text-4xl">
          Today
        </h2>
        <p className="text-sm text-mist">
          {DATE.format(new Date(`${day}T12:00:00Z`))}
          {s.streak > 0 && <span className="text-sandstone">{` · ${s.streak}-day streak`}</span>}
        </p>
      </div>
      <div className="mt-7 grid gap-x-6 gap-y-10 md:grid-cols-3">
        <Link
          to="/trips/$slug"
          params={{ slug: place.trip }}
          search={{ stop: place.stop }}
          className="group block"
        >
          {photo(placePhoto)}
          <span className="mt-3 block text-sm text-mist">Place of the day</span>
          <span className="block font-display text-2xl text-chalk underline-offset-4 group-hover:underline">
            {place.title}
          </span>
          <span className="mt-1 block text-sm text-mist">{place.place}</span>
        </Link>
        <Link
          to="/trips/$slug"
          params={{ slug: trip.slug }}
          search={{ stop: s.nextStop }}
          className="group block"
        >
          {photo(tripPhoto)}
          <span className="mt-3 block text-sm text-mist">
            {s.nextStop > 1
              ? `Field trip · continue at stop ${s.nextStop} of ${trip.stops.length}`
              : `Field trip · ${trip.stops.length} stops`}
          </span>
          <span className="block font-display text-2xl text-chalk underline-offset-4 group-hover:underline">
            {trip.title}
          </span>
          <span className="mt-1 block text-sm leading-6 text-mist">{trip.summary}</span>
        </Link>
        <div className="flex flex-col rounded-[3px] border border-white/10 p-6">
          <p className="text-sm text-mist">Daily practice</p>
          <Link
            to="/practice/daily"
            className="mt-2 font-display text-2xl text-chalk underline-offset-4 hover:underline"
          >
            Daily 5
          </Link>
          <p className="text-sm text-mist">
            {s.quiz ? "Done today" : "Five questions from across the labs, new each day"}
          </p>
          <Link
            to="/practice/where"
            className="mt-5 font-display text-2xl text-chalk underline-offset-4 hover:underline"
          >
            Where on Earth?
          </Link>
          <p className="text-sm text-mist">
            {s.where ? "Done today" : "Find five landscape photographs on a world map"}
          </p>
          <p className="mt-auto pt-6 text-sm">
            <Link to="/practice" className={link}>
              All practice
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
