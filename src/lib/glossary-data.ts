import { LABS } from "./labs/catalog";
import { GLOSSARY_PHOTO } from './photo-assign';

export type GlossaryEntry = {
  term: string;
  def: string;
  observation?: string;
  exam?: string;
  lab: string;
  labTitle: string;
};

import DEFINITIONS from "../../scripts/glossary-definitions.json";
const RICH:Record<string,string> = DEFINITIONS;

function expandDef(term: string, def: string, exam: string | undefined, _labTitle: string): string {
  const hit =
    RICH[term] ??
    Object.entries(RICH).find(([k]) => k.toLowerCase() === term.toLowerCase())?.[1];
  if (hit) return hit;

  return def;
}

const EXTRA: GlossaryEntry[] = [
  {
    term: "Terminator (day–night)",
    def: RICH["Terminator (day–night)"]!,
    lab: "seasons",
    labTitle: "Why seasons happen",
  },
  {
    term: "Levee",
    def: RICH.Levee!,
    exam: "Levée",
    lab: "rivers",
    labTitle: "River long profile",
  },
  {
    term: "Levée",
    def: RICH.Levée!,
    exam: "Levee",
    lab: "rivers",
    labTitle: "River long profile",
  },
  {
    term: "Trench",
    def: RICH.Trench!,
    lab: "plate-boundaries",
    labTitle: "Plate boundaries",
  },
  {
    term: "Drumlin",
    def: RICH.Drumlin!,
    lab: "glaciers",
    labTitle: "Glacial landforms",
  },
  {
    term: "Tombolo",
    def: RICH.Tombolo!,
    lab: "coasts",
    labTitle: "Coasts",
  },
  {
    term: "Doline",
    def: RICH.Doline!,
    exam: "Sinkhole",
    lab: "karst",
    labTitle: "Karst",
  },
  {
    term: "Floodplain",
    def: RICH.Floodplain!,
    lab: "rivers",
    labTitle: "River long profile",
  },
  {
    term: "Oxbow",
    def: RICH.Oxbow!,
    exam: "Oxbow lake",
    lab: "rivers",
    labTitle: "River long profile",
  },
  {
    term: "Delta",
    def: RICH.Delta!,
    lab: "river-deposition",
    labTitle: "River deposition",
  },
];

function dedupe(entries: GlossaryEntry[]): GlossaryEntry[] {
  const seen = new Map<string, GlossaryEntry>();
  for (const e of entries) {
    const k = e.term.toLowerCase();
    if (!seen.has(k)) seen.set(k, e);
  }
  return [...seen.values()].map(entry => ({...entry, observation: GLOSSARY_PHOTO[entry.term]?.caption})).sort((a, b) => a.term.localeCompare(b.term));
}

export const GLOSSARY: GlossaryEntry[] = dedupe([
  ...LABS.flatMap((lab) =>
    lab.glossary.map((g) => ({
      term: g.term,
      def: expandDef(g.term, g.def, g.exam, lab.title),
      exam: g.exam,
      lab: lab.slug,
      labTitle: lab.title,
    })),
  ),
  ...EXTRA,
]);
