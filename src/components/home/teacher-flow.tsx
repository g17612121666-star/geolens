import { Link } from "@tanstack/react-router";
import { encodeHandIn } from "@/lib/hand-in";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";
import type { LabMeta } from "@/lib/labs/types";

const TEACHER_LINKS = [
  { to: "/teachers/courses", label: "Courses by standard" },
  { to: "/teachers/standards", label: "Every lab by standard" },
  { to: "/teachers", label: "Teacher notes and worksheets" },
  { to: "/teachers/check", label: "Check hand-in codes" },
] as const;

/**
 * How a Guided lab runs, shown with one real lab: its prediction prompt, its model, its
 * explanation prompt and a valid example hand-in code (every answer right, both written parts
 * done) that the hand-in checker decodes.
 */
export function TeacherFlow({ lab }: { lab: LabMeta }) {
  const code = encodeHandIn({
    slug: lab.slug,
    answers: lab.questions.map((q) => q.answer),
    date: new Date("2026-11-16T12:00:00Z"),
    predicted: true,
    explained: true,
  });
  const step = "flex flex-col rounded-[10px] border border-white/10 bg-basalt p-5 md:p-6";
  const head = (n: number, label: string) => (
    <p className="flex items-baseline justify-between gap-3 text-sm">
      <span className="font-semibold text-chalk">{label}</span>
      <span className="text-xs text-mist">{`Step ${n} of 4`}</span>
    </p>
  );
  const note = (text: string) => (
    <div className="mt-auto pt-5">
      {/* Two lines tall at most, so the rules above the notes line up across the steps. */}
      <p className="min-h-[3.25rem] border-t border-white/10 pt-3 text-xs leading-5 text-mist">
        {text}
      </p>
    </div>
  );
  return (
    <section aria-labelledby="teachers-heading" className="-mb-8 mt-20 bg-tint md:mt-28">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:py-24">
        <div className="grid gap-x-16 gap-y-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <h2 id="teachers-heading" className="font-display text-3xl text-chalk md:text-[2.5rem]">
              For teachers
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-mist">
              {`Every lab can run in Guided mode: students predict, test the idea in the model, explain what happened and answer five questions, then hand in a short code. Here is the ${lab.title} lab.`}
            </p>
          </div>
          <ul className="grid border-t border-white/10 text-sm sm:grid-cols-2 sm:gap-x-8">
            {TEACHER_LINKS.map((item) => (
              <li key={item.to} className="border-b border-white/10">
                <Link
                  to={item.to}
                  className="block py-3 font-medium text-chalk underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ol
          className="mt-10 grid gap-4 sm:grid-cols-2 md:mt-12 lg:grid-cols-4"
          aria-label="A Guided lab, step by step"
        >
          <li className={step}>
            {head(1, "Predict")}
            <p className="mt-4 font-display text-lg leading-snug text-chalk">
              {`“${lab.predict?.prompt ?? lab.objective}”`}
            </p>
            {note("Written before the model opens.")}
          </li>
          <li className={step}>
            {head(2, "Explore")}
            <img
              src={labThumbSrc(lab.slug, 320)}
              srcSet={labThumbSrcSet(lab.slug)}
              sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 90vw"
              width={640}
              height={480}
              loading="lazy"
              decoding="async"
              alt={`The ${lab.title} model`}
              className="mt-4 aspect-[4/3] w-full rounded-[6px] bg-[#f7f3eb] object-cover"
            />
            {note("Students change the model to test their prediction.")}
          </li>
          <li className={step}>
            {head(3, "Explain")}
            <p className="mt-4 font-display text-lg leading-snug text-chalk">
              {`“${lab.cer?.prompt ?? lab.objective}”`}
            </p>
            {note("A claim, the evidence from the model and the reasoning.")}
          </li>
          <li className={step}>
            {head(4, "Hand in")}
            <p className="mt-4 whitespace-nowrap font-mono text-2xl tracking-wide text-glacier">
              {code}
            </p>
            <p className="mt-2 text-sm leading-6 text-mist">
              {`Example code: ${lab.questions.length} of ${lab.questions.length} correct, prediction and explanation written.`}
            </p>
            {note("No accounts: the code carries the answers, and the checker decodes it.")}
          </li>
        </ol>
      </div>
    </section>
  );
}
