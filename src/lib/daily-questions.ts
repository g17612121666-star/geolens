import { dayKey, pick, seeded } from "./daily.ts";

/** Daily 5: the same five Check questions for everyone on a given day, drawn from every lab. */
export type DailyQuestion = {
  lab: string;
  labTitle: string;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
};

/** A lab's Check questions, as the Daily quiz needs them. */
export type QuizLab = {
  slug: string;
  title: string;
  questions: { prompt: string; choices: string[]; answer: number; explain?: string }[];
};

// Questions that refer to a lab's own controls or scene make no sense out of context.
const NEEDS_LAB =
  /\b(slider|toggle|readout|this model|the model|the scene|this lab|press play|in the lab)\b/i;

/** Every question that makes sense without its lab, in lab order. */
export function questionPool(labs: QuizLab[]): DailyQuestion[] {
  return labs.flatMap((l) =>
    l.questions
      .filter((q) => !NEEDS_LAB.test(q.prompt) && !q.choices.some((c) => NEEDS_LAB.test(c)))
      .map((q) => ({
        lab: l.slug,
        labTitle: l.title,
        prompt: q.prompt,
        choices: q.choices,
        answer: q.answer,
        explain: q.explain ?? "",
      })),
  );
}

export const pickDailyQuestions = (pool: DailyQuestion[], day = dayKey()) =>
  pick(pool, 5, seeded(`quiz:${day}`));
