import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Flame, MapPinned, Mountain, Sparkles } from "lucide-react";
import { dayKey, level, placeOfTheDay, readDaily, streak } from "@/lib/daily";
import { tripPhoto } from "@/lib/field-trips";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/practice/")({
  component: PracticeHub,
  head: () =>
    headFor({
      title: "Practice",
      description:
        "Daily Earth-science challenges: five quick questions, a photo-location game and world landforms practice. Free, with progress kept on your device.",
      path: "/practice",
    }),
});

function PracticeHub() {
  const day = dayKey();
  const [state, setState] = useState({
    xp: 0,
    streak: 0,
    quiz: undefined as number | undefined,
    where: undefined as number | undefined,
  });
  useEffect(() => {
    const s = readDaily();
    setState({ xp: s.xp, streak: streak(s), quiz: s.days[day]?.quiz, where: s.days[day]?.where });
  }, [day]);
  const lv = level(state.xp),
    place = placeOfTheDay(day),
    photo = tripPhoto(place.photo),
    span = lv.next ? lv.next - lv.floor : 1;
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <div className="grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="section-label">{"Practice"}</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">
            {"A little Earth science every day."}
          </h1>
        </div>
        <p className="self-end text-lg leading-8 text-mist">
          {
            "Everyone gets the same challenges each day. Your streak and points stay on this device: there is no account and nothing is sent anywhere."
          }
        </p>
      </div>
      <section
        aria-label="Your progress"
        className="mt-8 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 md:grid-cols-[1fr_auto_auto]"
      >
        <div>
          <p className="text-sm text-mist">{`Level ${lv.number}`}</p>
          <p className="font-display text-2xl text-chalk">{lv.name}</p>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Points towards the next level"
            aria-valuemin={lv.floor}
            aria-valuemax={lv.next ?? state.xp}
            aria-valuenow={state.xp}
          >
            <div
              className="h-full rounded-full bg-glacier"
              style={{ width: `${lv.next ? (100 * (state.xp - lv.floor)) / span : 100}%` }}
            />
          </div>
          <p className="mt-1 text-sm text-mist">
            {lv.next ? `${state.xp} / ${lv.next} points` : `${state.xp} points`}
          </p>
        </div>
        <Stat
          icon={Flame}
          value={state.streak}
          label="day streak"
        />
        <Stat
          icon={CheckCircle2}
          value={(state.quiz != null ? 1 : 0) + (state.where != null ? 1 : 0)}
          label="of 2 done today"
        />
      </section>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card
          to="/practice/daily"
          icon={Sparkles}
          title="Daily 5"
          blurb="Five quick questions from across the labs, new every day."
          status={state.quiz != null ? `Done today: ${state.quiz} / 5` : "New today"}
        />
        <Card
          to="/practice/where"
          icon={MapPinned}
          title="Where on Earth?"
          blurb="Five landscape photos. Pin each one on the map: the closer you are, the more points."
          status={
            state.where != null
              ? `Done today: ${state.where.toLocaleString("en-GB")} points`
              : "New today"
          }
        />
        <Card
          to="/practice/landforms"
          icon={Mountain}
          title="World landforms"
          blurb="Learn and test the world's great mountain ranges, deserts, rivers and ocean features on the map."
          status="Practise any time"
        />
      </div>
      <section className="mt-10 grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] md:grid-cols-[minmax(0,1fr)_1.2fr]">
        {photo && (
          <img src={photo.src} alt={photo.alt} className="aspect-[16/10] size-full object-cover" />
        )}
        <div className="flex flex-col p-6">
          <p className="section-label">{"Place of the day"}</p>
          <h2 className="mt-2 font-display text-3xl text-chalk">{place.title}</h2>
          <p className="mt-1 text-mist">{place.place}</p>
          <p className="mt-4 font-semibold leading-7 text-chalk">{place.fact}</p>
          <Link
            to="/trips/$slug"
            params={{ slug: place.trip }}
            search={{ stop: place.stop }}
            className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-glacier px-4 pt-0 font-semibold text-basalt"
          >
            {"Visit it on its field trip"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof Flame; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3">
      <Icon className="size-6 text-sandstone" aria-hidden="true" />
      <div>
        <p className="font-display text-2xl leading-none text-chalk">{value}</p>
        <p className="text-sm text-mist">{label}</p>
      </div>
    </div>
  );
}

function Card({
  to,
  icon: Icon,
  title,
  blurb,
  status,
}: {
  to: "/practice/daily" | "/practice/where" | "/practice/landforms";
  icon: typeof Flame;
  title: string;
  blurb: string;
  status: string;
}) {
  return (
    <Link
      to={to}
      className="editorial-card group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-6"
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-glacier/12 text-glacier">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 font-display text-2xl text-chalk">{title}</h2>
      <p className="mt-2 flex-1 text-mist">{blurb}</p>
      <p className="mt-4 flex items-center justify-between text-sm text-glacier">
        {status}
        <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
      </p>
    </Link>
  );
}
