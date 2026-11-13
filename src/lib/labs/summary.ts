import type { LabMeta, LabSummary } from "./types.ts";

/** A lab as stored in content.json: glossary entries name terms; definitions live elsewhere. */
export type LabSource = Omit<LabMeta, "glossary"> & {
  glossary: { term: string; exam?: string }[];
};

/**
 * The full lesson for one lab, with each glossary term's shared definition from
 * scripts/glossary-definitions.json. A term without a definition is an error.
 */
export function withDefinitions(lab: LabSource, definitions: Record<string, string>): LabMeta {
  return {
    ...lab,
    glossary: lab.glossary.map(({ term, exam }) => {
      const def = definitions[term];
      if (!def) {
        throw new Error(
          `"${term}" (${lab.slug}) has no entry in scripts/glossary-definitions.json`,
        );
      }
      return exam ? { term, def, exam } : { term, def };
    }),
  };
}

/** What lists, search and teacher tools need about a lab, without its full lesson. */
export function summarize(lab: LabSource): LabSummary {
  return {
    slug: lab.slug,
    title: lab.title,
    hook: lab.hook,
    objective: lab.objective,
    realm: lab.realm,
    ages: lab.ages,
    curriculum: lab.curriculum,
    glossary: lab.glossary.map(({ term, exam }) => (exam ? { term, exam } : { term })),
    answers: lab.questions.map((q) => q.answer),
    preview: lab.questions[0]?.prompt ?? lab.misconceptions[0]?.claim ?? "",
  };
}
