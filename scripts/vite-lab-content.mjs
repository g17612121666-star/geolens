/**
 * Serves the lab content (src/lib/labs/content.json) in pieces, so each page downloads only what
 * it shows. content.json stays the one file editors change; these modules are derived from it
 * at build time (and on every change in development):
 *
 *   virtual:lab-index    LAB_INDEX: a summary of every lab (titles, hooks, terms, answer keys)
 *   virtual:lab-lessons  LESSONS: one lazy import per lab of its full lesson, with definitions
 *   virtual:lab-search   TEACHER_SCRIPTS and TEACHER_ARTICLES by lab, for site search
 *   virtual:lab-quiz     QUIZ: every lab's Check questions, for the Daily quiz
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { summarize, withDefinitions } from "../src/lib/labs/summary.ts";
import { teacherArticle } from "../src/lib/teachers/article.ts";

const CONTENT = fileURLToPath(new URL("../src/lib/labs/content.json", import.meta.url));
const DEFINITIONS = fileURLToPath(new URL("./glossary-definitions.json", import.meta.url));
const INDEX = "virtual:lab-index";
const LESSONS = "virtual:lab-lessons";
const LESSON = "virtual:lab-lesson/";
const SEARCH = "virtual:lab-search";
const QUIZ = "virtual:lab-quiz";

const read = (file) => JSON.parse(readFileSync(file, "utf8"));

function moduleFor(id) {
  const labs = read(CONTENT).labs;
  if (id === INDEX) return `export const LAB_INDEX = ${JSON.stringify(labs.map(summarize))};`;
  if (id === LESSONS) {
    const entries = labs.map(
      (lab) => `${JSON.stringify(lab.slug)}: () => import(${JSON.stringify(LESSON + lab.slug)})`,
    );
    return `export const LESSONS = {\n${entries.join(",\n")}\n};`;
  }
  if (id === SEARCH) {
    const scripts = Object.fromEntries(labs.map((lab) => [lab.slug, lab.teacher.script])),
      definitions = read(DEFINITIONS),
      articles = Object.fromEntries(
        labs.map((lab) => [lab.slug, teacherArticle(withDefinitions(lab, definitions))]),
      );
    return `export const TEACHER_SCRIPTS = ${JSON.stringify(scripts)};
export const TEACHER_ARTICLES = ${JSON.stringify(articles)};`;
  }
  if (id === QUIZ) {
    const quiz = labs.map(({ slug, title, questions }) => ({ slug, title, questions }));
    return `export const QUIZ = ${JSON.stringify(quiz)};`;
  }
  if (id.startsWith(LESSON)) {
    const slug = id.slice(LESSON.length),
      lab = labs.find((l) => l.slug === slug);
    if (!lab) throw new Error(`No lab "${slug}" in src/lib/labs/content.json`);
    return `export default ${JSON.stringify(withDefinitions(lab, read(DEFINITIONS)))};`;
  }
  return null;
}

export function labContent() {
  return {
    name: "geolens-lab-content",
    resolveId(id) {
      if ([INDEX, LESSONS, SEARCH, QUIZ].includes(id) || id.startsWith(LESSON)) return `\0${id}`;
    },
    load(id) {
      if (!id.startsWith("\0virtual:lab-")) return null;
      this.addWatchFile(CONTENT);
      this.addWatchFile(DEFINITIONS);
      return moduleFor(id.slice(1));
    },
    // In development, editing the content or the definitions refreshes every derived module.
    hotUpdate({ file, modules }) {
      if (file !== CONTENT && file !== DEFINITIONS) return;
      // Keep the edited file's own importers (glossary-data.ts imports the definitions).
      const graph = this.environment.moduleGraph,
        derived = [...modules];
      for (const [id, mod] of graph.idToModuleMap) {
        if (!id.startsWith("\0virtual:lab-")) continue;
        graph.invalidateModule(mod);
        derived.push(mod);
      }
      return derived;
    },
  };
}
