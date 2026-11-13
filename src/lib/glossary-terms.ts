import { LAB_BY_SLUG, LABS } from "./labs/catalog";

/** A glossary term and the lab that teaches it, without its definition. */
export type GlossaryTerm = { term: string; exam?: string; lab: string; labTitle: string };

/** Terms taught by a lab that are not on its own term list (other spellings, related landforms). */
const EXTRA: { term: string; exam?: string; lab: string }[] = [
  { term: "Terminator (day–night)", lab: "seasons" },
  { term: "Levee", exam: "Levée", lab: "rivers" },
  { term: "Levée", exam: "Levee", lab: "rivers" },
  { term: "Trench", lab: "plate-boundaries" },
  { term: "Drumlin", lab: "glaciers" },
  { term: "Tombolo", lab: "coasts" },
  { term: "Doline", exam: "Sinkhole", lab: "karst" },
  { term: "Floodplain", lab: "rivers" },
  { term: "Oxbow", exam: "Oxbow lake", lab: "rivers" },
  { term: "Delta", lab: "river-deposition" },
];

/**
 * Every glossary term once, in alphabetical order: each lab's terms, then the extra ones. When two
 * labs list a term, the first lab keeps it. Definitions are added by glossary-data.ts.
 */
export const GLOSSARY_TERMS: GlossaryTerm[] = (() => {
  const seen = new Map<string, GlossaryTerm>();
  const entries = [
    ...LABS.flatMap((lab) =>
      lab.glossary.map((g) => ({ ...g, lab: lab.slug, labTitle: lab.title })),
    ),
    ...EXTRA.map((e) => ({ ...e, labTitle: LAB_BY_SLUG[e.lab]?.title ?? e.lab })),
  ];
  for (const entry of entries) {
    const key = entry.term.toLowerCase();
    if (!seen.has(key)) seen.set(key, entry);
  }
  return [...seen.values()].sort((a, b) => a.term.localeCompare(b.term));
})();
