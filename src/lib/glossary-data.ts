import { GLOSSARY_PHOTO } from "./photo-assign";
import { GLOSSARY_TERMS } from "./glossary-terms";
import DEFINITIONS from "../../scripts/glossary-definitions.json";

export type GlossaryEntry = {
  term: string;
  def: string;
  observation?: string;
  exam?: string;
  lab: string;
  labTitle: string;
};

const RICH: Record<string, string> = DEFINITIONS;

function definition(term: string): string {
  return (
    RICH[term] ??
    Object.entries(RICH).find(([k]) => k.toLowerCase() === term.toLowerCase())?.[1] ??
    ""
  );
}

/** The full glossary: every term with its shared definition and, where one exists, a photo note. */
export const GLOSSARY: GlossaryEntry[] = GLOSSARY_TERMS.map((entry) => ({
  ...entry,
  def: definition(entry.term),
  observation: GLOSSARY_PHOTO[entry.term]?.caption,
}));
