import { useState } from "react";
import type { LabMeta } from "@/lib/labs/types";
import { useLabControls } from "@/lib/store/lab-controls";
import { useQuizAnswers } from "@/lib/quiz-progress";
import { useStudentWork, written } from "@/lib/student-work";
import { cn } from "@/lib/utils";

const box =
  "mt-1 block w-full rounded-lg border border-white/15 bg-basalt p-2.5 text-sm leading-6 text-chalk";

/**
 * Guided mode, step 1: the student writes a prediction before the model opens. The overlay
 * covers the lab until a prediction of a few words is saved.
 */
export function GuidedGate({ lab }: { lab: LabMeta }) {
  const guided = useLabControls((s) => s.guided);
  const { work, update } = useStudentWork(lab.slug);
  const [draft, setDraft] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  if (!guided || !lab.predict || open || written(work.prediction)) return null;
  const text = draft ?? work.prediction ?? "";
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/85 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-lg rounded-2xl border border-white/15 bg-basalt p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!written(text)) return;
          update({ prediction: text.trim() });
          setOpen(true);
        }}
      >
        <p className="section-label">{"Guided · step 1 of 4 · predict"}</p>
        <h2 className="mt-2 font-display text-2xl text-chalk">{lab.title}</h2>
        <label className="mt-4 block text-chalk">
          {lab.predict.prompt}
          <textarea
            value={text}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            className={box}
            placeholder="I predict that… because…"
          />
        </label>
        <p className="mt-2 text-xs text-mist">
          {
            "There is no wrong prediction. Write what you expect and why; you will test it with the model."
          }
        </p>
        <button
          type="submit"
          disabled={!written(text)}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-glacier px-5 font-medium text-basalt disabled:cursor-not-allowed disabled:opacity-40"
        >
          {"Save and open the model"}
        </button>
      </form>
    </div>
  );
}

/**
 * Guided mode panel: the four stages of the activity, with the prediction to look back on and
 * the claim–evidence–reasoning explanation to write once the model has been explored.
 */
export function GuidedPanel({ lab }: { lab: LabMeta }) {
  const guided = useLabControls((s) => s.guided);
  const setPanelTab = useLabControls((s) => s.setPanelTab);
  const { work, update } = useStudentWork(lab.slug);
  const { first } = useQuizAnswers(lab.slug);
  if (!guided) return null;
  const predicted = written(work.prediction),
    explained = written(work.claim) && written(work.evidence) && written(work.reasoning),
    checked = lab.questions.every((_, i) => first[i] !== undefined);
  const stage = (done: boolean, n: number, title: string) => (
    <p className={cn("flex items-center gap-2 font-medium", done ? "text-glacier" : "text-chalk")}>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-full border text-xs",
          done ? "border-glacier bg-glacier/15" : "border-white/25",
        )}
      >
        {done ? "✓" : n}
      </span>
      {title}
      <span className="sr-only">{done ? " (done)" : ""}</span>
    </p>
  );
  return (
    <section
      aria-label="Guided activity"
      className="pointer-events-auto rounded-2xl border border-glacier/40 bg-basalt/95 p-4 text-sm leading-6"
    >
      <p className="section-label">{"Guided activity · about 15 minutes"}</p>
      <div className="mt-3 space-y-4">
        <div>
          {stage(predicted, 1, "Predict")}
          {lab.predict && (
            <p className="mt-1 text-mist">
              {predicted ? `You predicted: “${work.prediction}”` : lab.predict.prompt}
            </p>
          )}
        </div>
        <div>
          {stage(predicted && explained, 2, "Explore the model")}
          <p className="mt-1 text-mist">
            {"Follow the Observe and Tinker steps. Note what changes when you move each control."}
          </p>
        </div>
        {lab.cer && (
          <div>
            {stage(explained, 3, "Explain with evidence")}
            <p className="mt-1 text-chalk">{lab.cer.prompt}</p>
            {(
              [
                ["claim", "Claim", "Answer the question in one sentence."],
                ["evidence", "Evidence", "What did you see or measure in the model? Give values."],
                [
                  "reasoning",
                  "Reasoning",
                  "Which science idea connects your evidence to your claim? Did your prediction hold?",
                ],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="mt-2 block text-[13px] text-mist">
                {label}
                <span className="block text-xs">{hint}</span>
                <textarea
                  defaultValue={work[key] ?? ""}
                  key={`${lab.slug}-${key}-${work[key] ? "saved" : "new"}`}
                  onBlur={(e) => update({ [key]: e.target.value.trim() })}
                  rows={key === "claim" ? 2 : 3}
                  className={box}
                />
              </label>
            ))}
            <p className="mt-1 text-xs text-mist">
              {"Saved on this device when you leave each box."}
            </p>
          </div>
        )}
        <div>
          {stage(checked, lab.cer ? 4 : 3, "Check and hand in")}
          <p className="mt-1 text-mist">
            {"Answer the five Check questions, then give your teacher your hand-in code or slip."}
          </p>
          <button
            type="button"
            onClick={() => setPanelTab("check")}
            className="mt-2 inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-chalk hover:border-glacier"
          >
            {"Open the Check questions"}
          </button>
        </div>
      </div>
    </section>
  );
}
