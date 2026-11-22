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
  const step = "flex flex-col rounded-[3px] border border-white/10 bg-basalt p-5";
  const label = "text-sm font-semibold text-chalk";
  return (
    <section aria-labelledby="teachers-heading" className="mt-16 border-t border-white/10 md:mt-24">
      <div className="mx-auto grid max-w-[1280px] gap-x-12 gap-y-8 px-5 py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.2fr)]">
        <div>
          <h2 id="teachers-heading" className="font-display text-3xl text-chalk md:text-4xl">
            For teachers
          </h2>
          <p className="mt-4 leading-7 text-mist">
            {`Every lab can run in Guided mode: students predict, test the idea in the model, explain what happened and answer five questions, then hand in a short code. This is the ${lab.title} lab.`}
          </p>
          <ul className="mt-6 divide-y divide-white/10 border-y border-white/10 text-sm">
            {TEACHER_LINKS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="block py-2.5 text-chalk underline-offset-4 hover:underline"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2" aria-label="A Guided lab, step by step">
          <li className={step}>
            <p className={label}>1. Predict</p>
            <p className="mt-3 font-display text-lg leading-snug text-chalk">
              {`“${lab.predict?.prompt ?? lab.objective}”`}
            </p>
            <p className="mt-auto pt-4 text-xs leading-5 text-mist">
              Written before the model opens.
            </p>
          </li>
          <li className={step}>
            <p className={label}>2. Explore</p>
            <img
              src={labThumbSrc(lab.slug, 320)}
              srcSet={labThumbSrcSet(lab.slug)}
              sizes="240px"
              width={640}
              height={480}
              loading="lazy"
              decoding="async"
              alt={`The ${lab.title} model`}
              className="mt-3 aspect-[4/3] w-full rounded-[3px] bg-[#f2efe6] object-cover"
            />
            <p className="mt-auto pt-4 text-xs leading-5 text-mist">
              Students change the model to test their prediction.
            </p>
          </li>
          <li className={step}>
            <p className={label}>3. Explain</p>
            <p className="mt-3 font-display text-lg leading-snug text-chalk">
              {`“${lab.cer?.prompt ?? lab.objective}”`}
            </p>
            <p className="mt-auto pt-4 text-xs leading-5 text-mist">
              A claim, the evidence from the model and the reasoning.
            </p>
          </li>
          <li className={step}>
            <p className={label}>4. Hand in</p>
            <p className="mt-3 whitespace-nowrap font-mono text-2xl tracking-wide text-glacier">
              {code}
            </p>
            <p className="mt-2 text-sm leading-6 text-mist">
              {`Example code: ${lab.questions.length} of ${lab.questions.length} correct, prediction and explanation written.`}
            </p>
            <p className="mt-auto pt-4 text-xs leading-5 text-mist">
              No accounts: the code carries the answers, and the checker decodes it.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}
