export type AgeBand =
  | "KS3"
  | "GCSE"
  | "A-level"
  | "NGSS MS"
  | "HS Earth Sci"
  | "APES";

export type RealmSlug =
  | "planet"
  | "interior"
  | "atmosphere"
  | "water"
  | "landforms"
  | "soils"
  | "hazards"
  | "skills";

/** A lab is listed only if playable or complete. Shell never gets a card. */
export type LabStatus = "complete" | "playable" | "shell";

export type LabQuestion = {
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
};

export type LabStep = {
  id: string;
  title: string;
  body: string;
};

/** Show a control only while another control (key) has one of these values. */
export type ShowWhen = { key: string; values: number[] };

export type LabExtra = {
  options?: {value:number;label:string}[];
  showWhen?: ShowWhen;
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  default?: number;
};

export type LabToggle = {
  key: string;
  label: string;
  defaultOn?: boolean;
  showWhen?: ShowWhen;
};

export type LabMeta = {
  slug: string;
  title: string;
  hook: string;
  objective: string;
  realm: RealmSlug;
  ages: AgeBand[];
  curriculum: string[];
  steps: LabStep[];
  questions: LabQuestion[];
  why: string[];
  /** Scientific assumptions and calculation details, available on demand. */
  modelNotes?: string[];
  /** Definitions come from scripts/glossary-definitions.json, added at build time. */
  glossary: { term: string; def: string; exam?: string }[];
  /** Wrong sentences students often say, each with its correction; the first is the headline. */
  misconceptions: { claim: string; truth: string }[];
  cases: { slug: string; label: string }[];
  teacher: { script: string; pitfalls: string[] };
  sources: { label: string; href?: string }[];
  controls: {
    /** False for parameter-driven static experiments; do not offer an inert Play button. */
    playback?: boolean;
    time?: "year" | "day" | "month" | "none";
    explode?: boolean;
    slice?: boolean;
    extra?: LabExtra[];
    toggles?: LabToggle[];
  };
  /** Optional override; otherwise resolved from src/lib/labs/status.ts */
  status?: LabStatus;
  /** Guided mode: a prediction made before the model opens. */
  predict?: { prompt: string };
  /**
   * Guided mode: a claim–evidence–reasoning question answered from the model, with a model
   * answer for teachers (shown in the Teach tab and teacher notes, never to students first).
   */
  cer?: { prompt: string; claim: string; evidence: string; reasoning: string };
};

/**
 * What lists, search and teacher tools need about every lab. Pages that list labs load these
 * summaries only; a lab's full lesson (`LabMeta`) loads with the pages that show it.
 */
export type LabSummary = Pick<
  LabMeta,
  "slug" | "title" | "hook" | "objective" | "realm" | "ages" | "curriculum"
> & {
  /** Glossary terms and their exam wording, without definitions. */
  glossary: { term: string; exam?: string }[];
  /** Index of the correct choice for each Check question (progress and hand-in codes). */
  answers: number[];
  /** The first Check question, or the headline misconception, shown on teacher cards. */
  preview: string;
};

export type RealmMeta = {
  slug: RealmSlug;
  title: string;
  kicker: string;
  blurb: string;
};

export type PanelTab = "why" | "terms" | "check" | "teach";
export type LabLayout = "hud" | "projector";
