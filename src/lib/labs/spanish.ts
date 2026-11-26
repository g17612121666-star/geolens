import { useEffect, useState } from "react";
import type { LabMeta } from "./types";

/**
 * A lab's student-facing text in Spanish, in src/lib/labs/es/<slug>.json. Everything is in the
 * same order as the English lab, and anything left out stays in English. Answer keys, standards
 * and teacher notes are not part of it: they come from the English lab, so hand-in codes and
 * marking are the same in both languages.
 */
export type LabSpanish = {
  title: string;
  hook: string;
  objective: string;
  modelDescription?: string;
  steps: { title: string; body: string }[];
  questions: { prompt: string; choices: string[]; explain: string }[];
  why: string[];
  misconceptions: { claim: string; truth: string }[];
  glossary: { term: string; def: string }[];
  predict?: { prompt: string };
  cer?: { prompt: string; claim: string; evidence: string; reasoning: string };
  /** Control labels by control key; an options control lists its options' labels in order. */
  controls?: Record<string, { label: string; options?: string[] }>;
};

const FILES = import.meta.glob<{ default: LabSpanish }>("./es/*.json");
const file = (slug: string) => `./es/${slug}.json`;

/** Whether a lab has a Spanish translation. */
export const hasSpanish = (slug: string) => file(slug) in FILES;

/** The slugs of the labs translated into Spanish. */
export const SPANISH_LABS = Object.keys(FILES).map((path) => path.slice(5, -5));

/** Loads a lab's Spanish text when it is wanted; null until it arrives, or if there is none. */
export function useSpanishLab(slug: string, wanted: boolean): LabSpanish | null {
  const [loaded, setLoaded] = useState<{ slug: string; text: LabSpanish } | null>(null);
  useEffect(() => {
    const load = FILES[file(slug)];
    if (!wanted || !load) return;
    let live = true;
    void load().then((m) => {
      if (live) setLoaded({ slug, text: m.default });
    });
    return () => {
      live = false;
    };
  }, [slug, wanted]);
  return wanted && loaded?.slug === slug ? loaded.text : null;
}

/** The lab with its Spanish text in place, keeping its answers, ids and settings. */
export function inSpanish(lab: LabMeta, es: LabSpanish): LabMeta {
  const controls = es.controls ?? {};
  return {
    ...lab,
    title: es.title,
    hook: es.hook,
    objective: es.objective,
    modelDescription: es.modelDescription ?? lab.modelDescription,
    steps: lab.steps.map((step, i) => ({ ...step, ...es.steps[i] })),
    questions: lab.questions.map((q, i) => ({
      ...q,
      prompt: es.questions[i]?.prompt ?? q.prompt,
      choices: es.questions[i]?.choices ?? q.choices,
      explain: es.questions[i]?.explain ?? q.explain,
    })),
    why: es.why,
    misconceptions: es.misconceptions,
    // Exam wording is for England's exams, so Spanish keeps only the term and its meaning.
    glossary: lab.glossary.map((g, i) => ({
      term: es.glossary[i]?.term ?? g.term,
      def: es.glossary[i]?.def ?? g.def,
      key: g.term,
    })),
    predict: es.predict ?? lab.predict,
    cer: lab.cer && es.cer ? { ...lab.cer, ...es.cer } : lab.cer,
    controls: {
      ...lab.controls,
      extra: lab.controls.extra?.map((e) => ({
        ...e,
        label: controls[e.key]?.label ?? e.label,
        options: e.options?.map((o, i) => ({
          ...o,
          label: controls[e.key]?.options?.[i] ?? o.label,
        })),
      })),
      toggles: lab.controls.toggles?.map((tg) => ({
        ...tg,
        label: controls[tg.key]?.label ?? tg.label,
      })),
    },
  };
}
