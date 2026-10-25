import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { dailyQuestions, dayKey, readDaily, recordDaily } from "@/lib/daily";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/practice/daily")({
  component: DailyFive,
  head: () =>
    headFor({
      title: "Daily 5",
      description: "Five quick Earth-science questions, the same for everyone, new every day.",
      path: "/practice/daily",
    }),
});

function DailyFive() {
  const day = dayKey();
  const qs = useMemo(() => dailyQuestions(day), [day]);
  const [i, setI] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [earlier, setEarlier] = useState<number | undefined>();
  useEffect(() => setEarlier(readDaily().days[day]?.quiz), [day]);
  const done = i >= qs.length,
    q = qs[Math.min(i, qs.length - 1)],
    pick = picks[i],
    score = picks.filter((p, k) => p === qs[k].answer).length;
  useEffect(() => {
    if (done) recordDaily("quiz", score, 10 * score + 10, day);
  }, [done, score, day]);
  return (
    <main id="main" className="mx-auto max-w-[760px] px-5 pb-24 pt-24">
      <Link to="/practice" className="text-sm text-mist hover:text-chalk">
        {"← Practice"}
      </Link>
      <h1 className="mt-2 font-display text-4xl text-chalk md:text-5xl">{"Daily 5"}</h1>
      <p className="mt-2 text-mist">
        {earlier != null && !done
          ? `You scored ${earlier} / 5 earlier today. Play again for fun: points only count once a day.`
          : "Five questions from across the labs, the same for everyone today."}
      </p>
      <ol className="mt-6 flex gap-2" aria-label="Progress">
        {qs.map((x, k) => (
          <li
            key={k}
            className={`h-2 flex-1 rounded-full ${
              picks[k] == null
                ? "bg-white/10"
                : picks[k] === x.answer
                  ? "bg-glacier"
                  : "bg-magma/70"
            }`}
            aria-label={`Question ${k + 1}${picks[k] == null ? "" : picks[k] === x.answer ? ": correct" : ": incorrect"}`}
          />
        ))}
      </ol>
      {done ? (
        <section
          className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          aria-live="polite"
        >
          <p className="section-label">{"Today's result"}</p>
          <p className="mt-2 font-display text-5xl text-chalk">{`${score} / 5`}</p>
          <p className="mt-3 text-mist">
            {score === 5
              ? "A perfect score. Come back tomorrow for five more."
              : "Open a lab below to see why, then come back tomorrow for five new questions."}
          </p>
          <ul className="mt-5 grid gap-2">
            {qs.map((x, k) => (
              <li
                key={k}
                className="flex items-start justify-between gap-3 border-t border-white/10 pt-2"
              >
                <span className={picks[k] === x.answer ? "text-chalk" : "text-mist"}>
                  {`${picks[k] === x.answer ? "✓" : "✗"} ${x.prompt}`}
                </span>
                <a href={`/lab/${x.lab}`} className="shrink-0 text-sm text-glacier hover:underline">
                  {x.labTitle}
                </a>
              </li>
            ))}
          </ul>
          <Link
            to="/practice/where"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-glacier px-4 font-semibold text-basalt"
          >
            {"Next: Where on Earth?"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      ) : (
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm text-mist">{`Question ${i + 1} of 5 · from ${q.labTitle}`}</p>
          <h2 className="mt-2 font-display text-2xl leading-snug text-chalk">{q.prompt}</h2>
          <div className="mt-5 grid gap-2" role="group" aria-label="Answer choices">
            {q.choices.map((c, k) => {
              const chosen = pick === k,
                reveal = pick != null && k === q.answer;
              return (
                <button
                  key={c}
                  type="button"
                  disabled={pick != null}
                  aria-pressed={chosen}
                  onClick={() => setPicks((p) => Object.assign([...p], { [i]: k }))}
                  className={`min-h-12 rounded-xl border px-4 py-2 text-left transition ${
                    reveal
                      ? "border-glacier bg-glacier/15 text-chalk"
                      : chosen
                        ? "border-magma/60 bg-magma/10 text-chalk"
                        : "border-white/12 text-mist hover:border-white/30 hover:text-chalk disabled:hover:border-white/12"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {pick != null && (
            <div className="mt-5" aria-live="polite">
              <p className="leading-7 text-mist">
                <span className="font-semibold text-chalk">
                  {pick === q.answer ? "Correct. " : "Not quite. "}
                </span>
                {q.explain}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setI(i + 1)}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-glacier px-5 font-semibold text-basalt"
                  autoFocus
                >
                  {i === qs.length - 1 ? "See my result" : "Next question"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
                <a
                  href={`/lab/${q.lab}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-chalk"
                >
                  <FlaskConical className="size-4" aria-hidden="true" />
                  {`Open ${q.labTitle}`}
                </a>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
