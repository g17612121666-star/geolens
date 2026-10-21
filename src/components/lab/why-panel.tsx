import { ProgressFrame } from "@/components/progress-media";
import { ScientificText } from "@/components/scientific-text";
import { Link } from "@tanstack/react-router";
import type { LabMeta, PanelTab } from "@/lib/labs/types";
import { useLabControls } from "@/lib/store/lab-controls";
import { cn } from "@/lib/utils";
import { Figure } from "@/components/figure";
import { labFigures, termThumb } from "@/lib/figures";
import { labVideo } from "@/lib/lab-videos";
import { useQuizAnswers } from "@/lib/quiz-progress";
import { Gallery } from "@/components/gallery";
import { LAB_GALLERY } from "@/lib/media-galleries";

const WHY_LABELS = ["Why it happens", "Try a comparison", "Reading the result"] as const;

export function WhyPanel({ lab }: { lab: LabMeta }) {
  const tab = useLabControls((s) => s.panelTab);
  const setTab = useLabControls((s) => s.setPanelTab);
  const exam = useLabControls((s) => s.examLanguage);
  const setExam = useLabControls((s) => s.setExam);
  const pairs = lab.misconceptions?.length ? lab.misconceptions : [lab.misconception];
  const figs = labFigures(lab.slug);
  const video = labVideo(lab.slug);
  const gallery = (LAB_GALLERY[lab.slug] ?? []).filter((g) => g.src !== figs[0]?.src);
  const seenTermSrc = new Set<string>();

  return (
    <aside
      aria-label="Explanations, terms and quiz"
      className="pointer-events-auto flex w-full shrink-0 flex-col rounded-2xl border border-white/10 bg-basalt/95"
    >
      <div className="flex border-b border-white/10" role="tablist" aria-label="Lab guide">
        {(
          [
            ["why", "Why"],
            ["terms", "Terms"],
            ["check", "Check"],
            ["teach", "Teach"],
          ] as const satisfies readonly [PanelTab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            role="tab"
            aria-selected={tab === id}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center px-1 text-[13px] font-medium uppercase tracking-[0.12em]",
              tab === id ? "text-glacier" : "text-mist hover:text-chalk",
            )}
            aria-label={id === "teach" ? "Teacher" : label}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm leading-6" role="tabpanel">
        {tab === "why" && (
          <div className="space-y-4">
            {lab.why.map((w, i) => (
              <div key={w.slice(0, 56)}>
                <p className="section-label">{WHY_LABELS[i] ?? `Note ${i + 1}`}</p>
                <p className="mt-2 text-sm leading-6 text-chalk/90">
                  <ScientificText>{w}</ScientificText>
                </p>
                {i === 0 && figs[0] && <Figure {...figs[0]} />}
              </div>
            ))}
            {video && (
              <div>
                <p className="section-label">{"Film"}</p>
                <div className="mt-2 overflow-hidden rounded-xl border border-white/10">
                  <ProgressFrame
                    title={video.title}
                    src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                    className="aspect-video w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <p className="mt-2 text-sm leading-5 text-mist">
                  {video.title} — {video.source}.
                </p>
              </div>
            )}
            <p className="section-label">{"A common misunderstanding"}</p>
            {pairs.slice(0, 1).map((m) => (
              <div key={m.claim} className="rounded-[10px] border border-fault/30 bg-fault/10 p-3">
                <p className="font-medium text-fault">{m.claim}</p>
                <p className="mt-2 text-chalk">{m.truth}</p>
              </div>
            ))}
            {lab.cases.length > 0 && (
              <div>
                <p className="section-label mb-2">{"Cases"}</p>
                <ul className="space-y-1">
                  {lab.cases.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to="/case/$slug"
                        params={{ slug: c.slug }}
                        className="text-ice hover:underline"
                      >
                        {c.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {gallery.length > 0 && (
              <div>
                <p className="section-label mb-2">{"Real examples"}</p>
                <Gallery figures={gallery} columns={1} />
              </div>
            )}
          </div>
        )}
        <div className={cn("space-y-3", tab !== "terms" && "hidden")}>
          <label className="flex min-h-11 items-center justify-between gap-2 text-mist">
            {"Exam language"}
            <input
              type="checkbox"
              checked={exam}
              onChange={(e) => setExam(e.target.checked)}
              className="accent-glacier"
            />
          </label>
          {lab.glossary.map((g, index) => {
            const tfig = termThumb(lab.slug, g.term);
            const show = tfig && !seenTermSrc.has(tfig.src);
            if (tfig && show) seenTermSrc.add(tfig.src);
            return (
              <div key={`${g.term}-${index}`}>
                <p className="font-medium text-chalk">{exam && g.exam ? g.exam : g.term}</p>
                {exam && g.exam && <p className="font-mono text-[13px] text-mist">{g.term}</p>}
                <p className="mt-1 text-mist">{g.def}</p>
                {show && tfig && <Figure {...tfig} size="sm" />}
              </div>
            );
          })}
        </div>
        {tab === "check" && <CheckList lab={lab} />}
        {tab === "teach" && (
          <div className="space-y-3">
            {(figs[1] ?? figs[0]) && <Figure {...(figs[1] ?? figs[0])!} size="sm" />}
            <p className="section-label">{"Lead a lesson or club discussion"}</p>
            {lab.teacher.script
              .split(/\n\n|\n/)
              .filter(Boolean)
              .map((paragraph, index) => (
                <p key={index} className="text-chalk/90">
                  {paragraph}
                </p>
              ))}
            <p className="section-label">{"Points to watch for"}</p>
            <ul className="list-disc space-y-1 pl-4 text-mist">
              {lab.teacher.pitfalls.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <details className="border-t border-white/10 pt-3">
              <summary className="cursor-pointer text-chalk">Sources and model notes</summary>
              {lab.modelNotes && (
                <div className="mt-3 space-y-3 text-mist">
                  {lab.modelNotes.map((note, index) => (
                    <p key={index}>
                      <ScientificText>{note}</ScientificText>
                    </p>
                  ))}
                </div>
              )}
              <ul className="mt-3 space-y-2 text-mist">
                {lab.sources.map((s) => (
                  <li key={s.label}>
                    {s.href ? (
                      <a
                        href={s.href}
                        className="text-ice hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {s.label}
                      </a>
                    ) : (
                      s.label
                    )}
                  </li>
                ))}
              </ul>
            </details>
            <Link
              to="/teachers/$slug"
              params={{ slug: lab.slug }}
              className="inline-flex h-11 items-center text-ice hover:underline"
            >
              {"Open the teacher notes"}
            </Link>
            <Link
              to="/worksheet/$slug"
              params={{ slug: lab.slug }}
              className="inline-flex h-11 items-center text-ice hover:underline"
            >
              {"Printable student worksheet"}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}

function CheckList({ lab }: { lab: LabMeta }) {
  const qs = lab.questions;
  const { picked, pick, reset } = useQuizAnswers(lab.slug);
  const answered = qs.filter((_, i) => picked[i] !== undefined).length;
  const correct = qs.filter((q, i) => picked[i] === q.answer).length;
  return (
    <div className="space-y-5">
      <p className="text-mist">
        Choose an answer, then compare your reasoning with the explanation.
      </p>
      {answered > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-[10px] border border-white/10 px-3 py-2 text-[13px]">
          <p className="text-chalk" role="status">
            {answered < qs.length
              ? `${answered} of ${qs.length} answered · ${correct} correct`
              : `${correct} of ${qs.length} correct`}
            <span className="text-mist">{" · saved on this device"}</span>
          </p>
          <button type="button" onClick={reset} className="min-h-11 text-ice hover:underline">
            {"Start again"}
          </button>
        </div>
      )}
      {qs.map((q, i) => {
        const choice = picked[i];
        const shown = choice !== undefined;
        const ok = shown && choice === q.answer;
        return (
          <div key={q.prompt}>
            <p className="font-medium text-chalk">
              {i + 1}. {q.prompt}
            </p>
            <ul className="mt-2 space-y-1.5">
              {q.choices.map((c, j) => (
                <li key={c}>
                  <button
                    type="button"
                    onClick={() => pick(i, j)}
                    className={cn(
                      "min-h-11 w-full rounded-[10px] border px-3 py-2 text-left text-[13px]",
                      choice === j
                        ? ok
                          ? "border-moss/50 bg-moss/15 text-chalk"
                          : "border-fault/50 bg-fault/15 text-chalk"
                        : "border-white/10 text-mist hover:border-white/25 hover:text-chalk",
                    )}
                  >
                    {c}
                  </button>
                </li>
              ))}
            </ul>
            {shown && (
              <div className="mt-3 text-sm leading-6" role="status">
                <p className={ok ? "font-medium text-glacier" : "font-medium text-sandstone"}>
                  {ok ? "That’s right." : "Take another look."}
                </p>
                <p className="mt-1 text-mist">
                  <ScientificText>{q.explain}</ScientificText>
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
