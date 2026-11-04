import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { LabMeta } from "@/lib/labs/types";
import { encodeHandIn } from "@/lib/hand-in";
import { useQuizAnswers } from "@/lib/quiz-progress";
import { useStudentName, useStudentWork, written } from "@/lib/student-work";

/**
 * Hand in without an account: a 10-character code for the teacher's checker and a printable
 * slip with the written answers. Everything stays in this browser until the student shares it.
 */
export function HandInPanel({ lab }: { lab: LabMeta }) {
  const { first } = useQuizAnswers(lab.slug);
  const { work } = useStudentWork(lab.slug);
  const [name, setName] = useStudentName();
  const [copied, setCopied] = useState(false);
  const answered = lab.questions.filter((_, i) => first[i] !== undefined).length;
  const code = useMemo(
    () =>
      encodeHandIn({
        slug: lab.slug,
        answers: lab.questions.map((_, i) => first[i] ?? null),
        date: new Date(),
        predicted: written(work.prediction),
        explained: written(work.claim) && written(work.evidence) && written(work.reasoning),
      }),
    [lab, first, work],
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(name ? `${name}\t${code}` : code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <section
      aria-labelledby="hand-in-heading"
      className="rounded-xl border border-white/15 bg-white/[0.04] p-4"
    >
      <p id="hand-in-heading" className="section-label">
        {"Hand in your work"}
      </p>
      <p className="mt-2 text-mist">
        {answered < lab.questions.length
          ? `Answer all ${lab.questions.length} questions first (${answered} done). `
          : ""}
        {
          "Your code records your first answer to each question and whether you wrote your prediction and explanation. Give it to your teacher with your name."
        }
      </p>
      <label className="mt-3 block text-[13px] text-mist">
        {"Your name (stays on this device)"}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-basalt px-3 text-chalk"
          autoComplete="name"
        />
      </label>
      <p className="mt-3 text-[13px] text-mist">{"Your hand-in code"}</p>
      <p
        className="mt-1 font-mono text-2xl tracking-[0.15em] text-chalk"
        aria-live="polite"
        aria-label={`Hand-in code ${code.split("").join(" ")}`}
      >
        {code}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copy}
          className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-chalk hover:border-glacier"
        >
          {copied ? "Copied" : name ? "Copy name and code" : "Copy code"}
        </button>
        <Link
          to="/slip/$slug"
          params={{ slug: lab.slug }}
          className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-chalk hover:border-glacier"
        >
          {"Print a slip"}
        </Link>
      </div>
    </section>
  );
}
