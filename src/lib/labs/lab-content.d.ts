/** Modules derived from content.json at build time by scripts/vite-lab-content.mjs. */

declare module "virtual:lab-index" {
  import type { LabSummary } from "@/lib/labs/types";
  export const LAB_INDEX: LabSummary[];
}

declare module "virtual:lab-lessons" {
  import type { LabMeta } from "@/lib/labs/types";
  export const LESSONS: Record<string, () => Promise<{ default: LabMeta }>>;
}

declare module "virtual:lab-search" {
  import type { teacherArticle } from "@/lib/teachers/article";
  export const TEACHER_SCRIPTS: Record<string, string>;
  export const TEACHER_ARTICLES: Record<string, ReturnType<typeof teacherArticle>>;
}

declare module "virtual:lab-quiz" {
  import type { QuizLab } from "@/lib/daily-questions";
  export const QUIZ: QuizLab[];
}
