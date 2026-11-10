import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { encodeHandIn } from "@/lib/hand-in";
import { useQuizAnswers } from "@/lib/quiz-progress";
import { useStudentName, useStudentWork, written } from "@/lib/student-work";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/slip/$slug")({
  beforeLoad: ({ params }) => {
    if (!LAB_SCENES[params.slug] || !isListed(params.slug)) throw notFound();
  },
  loader: async ({ params }) => {
    const { LAB_BY_SLUG: labs } = await import("@/lib/labs/catalog");
    const lab = labs[params.slug];
    if (!lab) throw notFound();
    return { title: lab.title };
  },
  component: SlipPage,
  head: ({ params, loaderData }) =>
    headFor({
      title: `Hand-in slip · ${loaderData?.title ?? "Lab"}`,
      description: "A printable record of one student's work in a Geolens lab.",
      path: `/slip/${params.slug}`,
    }),
});

const LETTERS = ["A", "B", "C", "D"];

/** A printable record of this student's work, built from this browser only. */
function SlipPage() {
  const { slug } = Route.useParams();
  const lab = LAB_BY_SLUG[slug];
  if (!lab) throw notFound();
  const { first } = useQuizAnswers(slug);
  const { work } = useStudentWork(slug);
  const [name, setName] = useStudentName();
  const correct = lab.questions.filter((q, i) => first[i] === q.answer).length;
  const answered = lab.questions.filter((_, i) => first[i] !== undefined).length;
  const code = encodeHandIn({
    slug,
    answers: lab.questions.map((_, i) => first[i] ?? null),
    date: new Date(),
    predicted: written(work.prediction),
    explained: written(work.claim) && written(work.evidence) && written(work.reasoning),
  });
  const ngss = lab.curriculum.filter((c) => c.startsWith("NGSS"));
  const answerBlock = (label: string, text?: string) => (
    <div className="mt-3">
      <p className="text-sm font-medium text-chalk">{label}</p>
      <p className="mt-1 min-h-8 whitespace-pre-wrap border-b border-white/20 pb-2 text-chalk/90">
        {text?.trim() || "—"}
      </p>
    </div>
  );
  return (
    <main
      id="main"
      className="mx-auto max-w-[760px] px-5 pb-24 pt-24 text-chalk print:max-w-none print:px-0 print:pt-0"
    >
      <div className="flex flex-wrap items-center gap-3 text-sm" data-print-hide>
        <Link
          to="/lab/$slug"
          params={{ slug }}
          className="inline-flex min-h-11 items-center text-ice hover:underline"
        >
          {"Back to the lab"}
        </Link>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5"
        >
          {"Print this slip"}
        </button>
      </div>
      <p className="section-label mt-6">{"Geolens hand-in slip"}</p>
      <h1 className="mt-2 font-display text-3xl">{lab.title}</h1>
      <p className="mt-1 text-sm text-mist">
        {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
        {ngss.length > 0 && ` · ${ngss.join(", ")}`}
      </p>
      <label className="mt-5 block text-sm text-mist">
        {"Name"}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-basalt px-3 text-lg text-chalk print:border-0 print:border-b print:px-0"
          autoComplete="name"
        />
      </label>

      {lab.predict && (
        <section className="mt-6">
          <h2 className="font-display text-xl">{"Prediction"}</h2>
          <p className="mt-1 text-sm text-mist">{lab.predict.prompt}</p>
          {answerBlock("My prediction", work.prediction)}
        </section>
      )}

      {lab.cer && (
        <section className="mt-6">
          <h2 className="font-display text-xl">{"Explain with evidence"}</h2>
          <p className="mt-1 text-sm text-mist">{lab.cer.prompt}</p>
          {answerBlock("Claim", work.claim)}
          {answerBlock("Evidence from the model", work.evidence)}
          {answerBlock("Reasoning", work.reasoning)}
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-display text-xl">
          {`Check questions: ${correct} of ${lab.questions.length} correct on the first try`}
        </h2>
        {answered < lab.questions.length && (
          <p className="mt-1 text-sm text-sandstone">
            {`${lab.questions.length - answered} question(s) not answered yet.`}
          </p>
        )}
        <ol className="mt-3 space-y-2 text-sm">
          {lab.questions.map((q, i) => {
            const pick = first[i];
            return (
              <li key={q.prompt}>
                <span className="text-chalk">{`${i + 1}. ${q.prompt} `}</span>
                <span className="text-mist">
                  {pick === undefined
                    ? "Not answered."
                    : `First answer ${LETTERS[pick]}${pick === q.answer ? " ✓" : ` ✗ (answer ${LETTERS[q.answer]})`}`}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8 rounded-xl border border-white/20 p-4">
        <p className="text-sm text-mist">{"Hand-in code"}</p>
        <p className="mt-1 font-mono text-3xl tracking-[0.15em]">{code}</p>
        <p className="mt-2 text-xs text-mist">
          {
            "Your teacher enters this code on the Geolens Teachers page, under Check hand-in codes. The code holds no name and none of your written answers."
          }
        </p>
      </section>
    </main>
  );
}
