import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { LESSON_PHASES } from "@/lib/teachers/workflow";
import { headFor, siteOrigin } from "@/lib/seo";

export const Route = createFileRoute("/worksheet/$slug")({
  beforeLoad: ({ params }) => {
    if (!LAB_BY_SLUG[params.slug] || !LAB_SCENES[params.slug] || !isListed(params.slug))
      throw notFound();
  },
  component: WorksheetPage,
  head: ({ params }) => {
    const lab = LAB_BY_SLUG[params.slug];
    return headFor({
      title: lab ? `Worksheet · ${lab.title}` : "Worksheet",
      description: lab
        ? `A printable student worksheet for the ${lab.title} lab, with tasks, key words, quiz questions and an optional answer key.`
        : "A printable Geolens worksheet.",
      path: `/worksheet/${params.slug}`,
    });
  },
});

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function Lines({ count }: { count: number }) {
  return (
    <div aria-hidden className="mt-2 space-y-6">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="border-b border-white/25" />
      ))}
    </div>
  );
}

function WorksheetPage() {
  const { slug } = Route.useParams();
  const lab = LAB_BY_SLUG[slug];
  if (!lab) throw notFound();
  const [answers, setAnswers] = useState(false);
  const [qr, setQr] = useState("");
  const url = `${siteOrigin()}/lab/${lab.slug}`;
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);
  const tasks = lab.steps.slice(0, 3);

  return (
    <main
      id="main"
      data-worksheet
      className="mx-auto max-w-[800px] px-5 pb-24 pt-24 text-chalk print:max-w-none print:px-0 print:pt-0"
    >
      <div className="flex flex-wrap items-center gap-2 text-sm" data-print-hide>
        <Link
          to="/teachers/$slug"
          params={{ slug: lab.slug }}
          className="inline-flex min-h-11 items-center text-ice hover:underline"
        >
          {"Teacher notes"}
        </Link>
        <span className="text-mist">{"·"}</span>
        <Link
          to="/lab/$slug"
          params={{ slug: lab.slug }}
          className="inline-flex min-h-11 items-center text-ice hover:underline"
        >
          {"Open the lab"}
        </Link>
        <span className="flex-1" />
        <label className="inline-flex min-h-11 items-center gap-2 text-mist">
          <input
            type="checkbox"
            checked={answers}
            onChange={(e) => setAnswers(e.target.checked)}
            className="accent-glacier"
          />
          {"Include answer key"}
        </label>
        <button
          type="button"
          onClick={() => window.print()}
          className="min-h-11 rounded-full border border-glacier/30 bg-glacier/10 px-5 text-glacier"
        >
          {"Print worksheet"}
        </button>
      </div>

      <div className="mt-6 flex items-start gap-6 border-b border-white/15 pb-5 print:mt-0">
        <div className="flex-1">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-glacier">
            {"Geolens worksheet"}
          </p>
          <h1 className="mt-2 font-display text-4xl">{lab.title}</h1>
          <p className="mt-3 leading-7 text-chalk/85">{lab.objective}</p>
        </div>
        {qr && (
          <figure className="w-28 shrink-0 text-center">
            <div
              className="rounded-lg bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <figcaption className="mt-1 text-[11px] leading-4 text-mist">
              {"Scan to open the lab"}
            </figcaption>
          </figure>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
        {["Name", "Class", "Date"].map((field) => (
          <div key={field} className="flex items-end gap-2">
            <span className="text-mist">{field}</span>
            <span className="flex-1 border-b border-white/25" />
          </div>
        ))}
      </div>
      <p className="mt-4 break-all font-mono text-xs text-mist">{url}</p>

      <section className="mt-8">
        <h2 className="font-display text-2xl">{"Tasks"}</h2>
        <ol className="mt-3 space-y-6">
          {tasks.map((step, i) => (
            <li key={step.title} className="break-inside-avoid">
              <p className="font-mono text-xs text-glacier">
                {`${i + 1} · ${LESSON_PHASES[i]?.name ?? step.title}`}
              </p>
              <p className="mt-1 leading-7">{step.body}</p>
              <Lines count={i === 2 ? 5 : 3} />
            </li>
          ))}
        </ol>
      </section>

      {lab.glossary.length > 0 && (
        <section className="mt-10 break-inside-avoid">
          <h2 className="font-display text-2xl">{"Key words"}</h2>
          <p className="mt-2 text-sm text-mist">
            {"Use at least three of these words in your answers."}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {lab.glossary.map((g) => (
              <li
                key={g.term}
                className="rounded-full border border-white/20 px-3 py-1 text-sm print:border-neutral-400"
              >
                {g.term}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lab.questions.length > 0 && (
        <section className="mt-10 print:break-before-page print:mt-0">
          <h2 className="font-display text-2xl">{"Check your understanding"}</h2>
          <p className="mt-2 text-sm text-mist">{"Tick one answer for each question."}</p>
          <ol className="mt-4 space-y-6">
            {lab.questions.map((q, i) => (
              <li key={q.prompt} className="break-inside-avoid">
                <p className="font-medium leading-7">{`${i + 1}. ${q.prompt}`}</p>
                <ul className="mt-2 space-y-1.5">
                  {q.choices.map((c, j) => (
                    <li key={c} className="flex gap-3 leading-6">
                      <span
                        aria-hidden
                        className="mt-1 inline-block size-4 shrink-0 rounded border border-white/40 print:border-neutral-600"
                      />
                      <span>
                        <span className="font-mono text-xs text-mist">{LETTERS[j]}</span> {c}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mt-10 text-xs text-mist">
        {"Geolens · free Earth-science labs · "}
        {url.replace(/\/lab\/.*/, "")}
      </p>

      {answers && (
        <section className="mt-12 border-t border-white/15 pt-8 print:break-before-page print:border-0 print:pt-0">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-glacier">
            {"For the teacher"}
          </p>
          <h2 className="mt-2 font-display text-2xl">{`Answer key · ${lab.title}`}</h2>
          <ol className="mt-4 space-y-4">
            {lab.questions.map((q, i) => (
              <li key={q.prompt} className="break-inside-avoid leading-7">
                <p className="font-medium">
                  {`${i + 1}. ${LETTERS[q.answer]} · ${q.choices[q.answer]}`}
                </p>
                <p className="text-chalk/80">{q.explain}</p>
              </li>
            ))}
          </ol>
          {lab.teacher.pitfalls.length > 0 && (
            <>
              <h3 className="mt-6 font-display text-xl">{"Points to watch for"}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 leading-7 text-chalk/80">
                {lab.teacher.pitfalls.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </main>
  );
}
