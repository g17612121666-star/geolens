import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { placeOfTheDay, readDaily, streak } from "@/lib/daily";
import { useToday } from "@/lib/use-today";
import { FIELD_TRIPS, readTripProgress } from "@/lib/field-trips";

const DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

/** Home-page line of today's practice, the place of the day and the next field trip. */
export function TodayStrip() {
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
    trip = FIELD_TRIPS.find((t) => t.slug === s.next) ?? FIELD_TRIPS[0];
  return (
    <section className="mx-auto max-w-[1280px] px-5" aria-labelledby="today-heading">
      <div className="grid gap-x-8 gap-y-4 border-y border-white/10 py-5 sm:grid-cols-2 lg:grid-cols-[11rem_repeat(4,minmax(0,1fr))]">
        <h2 id="today-heading" className="text-sm leading-5 text-chalk sm:col-span-2 lg:col-span-1">
          <span className="block font-semibold">Today</span>
          <span className="block text-mist">{DATE.format(new Date(`${day}T12:00:00Z`))}</span>
          {s.streak > 0 && (
            <span className="mt-0.5 block text-sandstone">{`${s.streak}-day streak`}</span>
          )}
        </h2>
        <TodayLink
          to="/practice/daily"
          note={s.quiz ? "Done today" : "Five questions, new each day"}
        >
          Daily 5
        </TodayLink>
        <TodayLink
          to="/practice/where"
          note={s.where ? "Done today" : "Pin five landscape photos on a map"}
        >
          Where on Earth?
        </TodayLink>
        <TodayLink
          to="/trips/$slug"
          params={{ slug: place.trip }}
          search={{ stop: place.stop }}
          note={`Place of the day: ${place.place}`}
        >
          {place.title}
        </TodayLink>
        <TodayLink
          to="/trips/$slug"
          params={{ slug: trip.slug }}
          search={{ stop: s.nextStop }}
          note={s.nextStop > 1 ? `Field trip, continue at stop ${s.nextStop}` : "Field trip"}
        >
          {trip.title}
        </TodayLink>
      </div>
    </section>
  );
}

function TodayLink({
  note,
  children,
  ...link
}: {
  note: string;
  children: ReactNode;
  to: "/practice/daily" | "/practice/where" | "/trips/$slug";
  params?: { slug: string };
  search?: { stop: number };
}) {
  return (
    <Link {...link} className="group block text-sm leading-5">
      <span className="font-medium text-chalk underline-offset-4 group-hover:underline">
        {children}
      </span>
      <span className="mt-0.5 block text-mist">{note}</span>
    </Link>
  );
}
