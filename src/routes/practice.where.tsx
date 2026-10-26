import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";
import { LibreMap } from "@/components/map/libre-map";
import {
  dailyPhotoRounds,
  dayKey,
  randomPhotoRounds,
  readDaily,
  recordDaily,
  roundScore,
  type PhotoRound,
} from "@/lib/daily";
import { tripPhoto } from "@/lib/field-trips";
import { haversineKm } from "@/lib/geo";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/practice/where")({
  component: WhereOnEarth,
  head: () =>
    headFor({
      title: "Where on Earth?",
      description:
        "Five real landscape photographs a day. Pin each one on the world map and score points for getting close.",
      path: "/practice/where",
    }),
});

const fmt = (n: number) => n.toLocaleString("en-GB");

function WhereOnEarth() {
  const day = dayKey();
  const [daily, setDaily] = useState(true);
  const [rounds, setRounds] = useState<PhotoRound[]>(() => dailyPhotoRounds(day));
  const [i, setI] = useState(0);
  const [guess, setGuess] = useState<[number, number] | null>(null);
  const [locked, setLocked] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [earlier, setEarlier] = useState<number | undefined>();
  useEffect(() => setEarlier(readDaily().days[day]?.where), [day]);
  const done = i >= rounds.length,
    r = rounds[Math.min(i, rounds.length - 1)],
    photo = tripPhoto(r.photo),
    total = scores.reduce((a, b) => a + b, 0),
    km = guess ? haversineKm(guess[1], guess[0], r.lat, r.lon) : 0;
  useEffect(() => {
    if (done && daily) recordDaily("where", total, Math.round(total / 250) + 10, day);
  }, [done, daily, total, day]);
  const restart = () => {
    setDaily(false);
    setRounds(randomPhotoRounds());
    setI(0);
    setScores([]);
    setGuess(null);
    setLocked(false);
  };
  // Hide the answer's caption until the guess is locked: captions often name the place.
  const answerOverlay = useMemo(
    () =>
      locked && guess
        ? [
            {
              id: "where-line",
              color: "#f2b84b",
              width: 2,
              labels: false,
              data: {
                type: "FeatureCollection",
                features: [
                  {
                    type: "Feature",
                    properties: {},
                    geometry: { type: "LineString", coordinates: [guess, [r.lon, r.lat]] },
                  },
                ],
              },
            },
          ]
        : [],
    [locked, guess, r],
  );
  return (
    <main id="main" className="mx-auto max-w-[1440px] px-4 pb-16 pt-20 md:px-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <Link to="/practice" className="text-sm text-mist hover:text-chalk">
          {"← Practice"}
        </Link>
        <h1 className="font-display text-3xl text-chalk">{"Where on Earth?"}</h1>
        <span className="text-sm text-mist">
          {done
            ? daily
              ? "Today's photos"
              : "Practice round"
            : `Photo ${i + 1} of ${rounds.length} · ${fmt(total)} points`}
        </span>
      </div>
      {done ? (
        <section
          className="mx-auto mt-6 max-w-[760px] rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          aria-live="polite"
        >
          <p className="section-label">{daily ? "Today's score" : "Practice score"}</p>
          <p className="mt-2 font-display text-5xl text-chalk">{`${fmt(total)} / 25,000`}</p>
          {daily && earlier != null && (
            <p className="mt-2 text-sm text-mist">
              {"Only your first score each day counts toward points and your streak."}
            </p>
          )}
          <ul className="mt-5 grid gap-3">
            {rounds.map((x, k) => (
              <li key={x.title} className="flex items-center gap-3 border-t border-white/10 pt-3">
                <img
                  src={tripPhoto(x.photo)?.src}
                  alt=""
                  className="size-14 rounded-lg object-cover"
                />
                <span className="flex-1">
                  <span className="block text-chalk">{x.place}</span>
                  <Link
                    to="/trips/$slug"
                    params={{ slug: x.trip }}
                    search={{ stop: x.stop }}
                    className="text-sm text-glacier hover:underline"
                  >
                    {`See it on the field trip: ${x.title}`}
                  </Link>
                </span>
                <span className="text-sm text-mist">{`${fmt(scores[k] ?? 0)} pts`}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={restart}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-glacier px-4 font-semibold text-basalt"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            {"Play five more (practice)"}
          </button>
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[26rem_minmax(0,1fr)]">
          <section className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt/90">
            {photo && (
              <img
                src={photo.src}
                alt="A landscape photograph to locate"
                className="aspect-[4/3] w-full object-cover"
              />
            )}
            <div className="flex flex-1 flex-col p-5" aria-live="polite">
              {locked ? (
                <>
                  <p className="font-display text-3xl text-chalk">{`${fmt(roundScore(km))} points`}</p>
                  <p className="mt-1 text-mist">{`${fmt(Math.round(km))} km away. This is ${r.place}.`}</p>
                  <p className="mt-3 font-semibold leading-6 text-chalk">{r.fact}</p>
                  {photo && <p className="mt-2 text-xs text-mist/80">{`Photo: ${photo.credit}`}</p>}
                  <button
                    type="button"
                    onClick={() => {
                      setI(i + 1);
                      setGuess(null);
                      setLocked(false);
                    }}
                    className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-glacier px-5 font-semibold text-basalt"
                    autoFocus
                  >
                    {i === rounds.length - 1 ? "See my score" : "Next photo"}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <p className="leading-7 text-mist">
                    {
                      "Look for clues: rock, ice, vegetation, coast or sky. Then click the map where you think the photo was taken."
                    }
                  </p>
                  <button
                    type="button"
                    disabled={!guess}
                    onClick={() => {
                      setLocked(true);
                      setScores((s) => [...s, roundScore(km)]);
                    }}
                    className="mt-auto inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-glacier px-5 font-semibold text-basalt disabled:opacity-40"
                  >
                    {guess ? "Lock in my guess" : "Click the map to guess"}
                  </button>
                </>
              )}
            </div>
          </section>
          <LibreMap
            center={[10, 20]}
            zoom={1.2}
            marker={guess}
            markerB={locked ? [r.lon, r.lat] : null}
            fitMarkers={locked}
            overlays={answerOverlay}
            onClick={(c) => !locked && setGuess([c.lon, c.lat])}
            inspectFeatures={false}
            label="World map: click to place your guess"
            className="h-[52vh] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench lg:h-[calc(100vh-9rem)]"
          />
        </div>
      )}
    </main>
  );
}
