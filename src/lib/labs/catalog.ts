import { LAB_INDEX } from "virtual:lab-index";
import { LESSONS } from "virtual:lab-lessons";
import type { LabMeta, LabSummary, RealmMeta } from "./types";
import { REALMS } from "./realms";

/**
 * Reviewed content lives in content.json. Pages that list labs get these summaries; a lab's full
 * lesson loads with the pages that show it (`loadLab`), so a list never downloads every lesson.
 */
export { REALMS };
export const LABS: LabSummary[] = LAB_INDEX;

export const LAB_BY_SLUG: Record<string, LabSummary> = Object.fromEntries(
  LABS.map((lab) => [lab.slug, lab]),
);

export function labsInRealm(realm: RealmMeta["slug"]): LabSummary[] {
  return LABS.filter((lab) => lab.realm === realm);
}

export const AGE_BANDS = ["KS3", "GCSE", "A-level", "NGSS MS", "HS Earth Sci", "APES"] as const;

const lessons = new Map<string, Promise<LabMeta>>();

/** A lab's full lesson: steps, quiz, explanations, glossary definitions and teacher notes. */
export function loadLab(slug: string): Promise<LabMeta | undefined> {
  const load = LESSONS[slug];
  if (!load) return Promise.resolve(undefined);
  let lesson = lessons.get(slug);
  if (!lesson) {
    lesson = load().then((module) => module.default);
    lessons.set(slug, lesson);
    lesson.catch(() => lessons.delete(slug));
  }
  return lesson;
}
