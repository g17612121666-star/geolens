/**
 * NGSS's three dimensions for each Earth and space science performance expectation in the
 * registry: the science and engineering practice, the crosscutting concept and the disciplinary
 * core ideas named in the expectation's foundation boxes. Generated from the six DCI arrangement
 * pages on nextgenscience.org (MS-ESS1 to MS-ESS3 and HS-ESS1 to HS-ESS3), read in November 2026.
 * Names are NGSS's own; HS-ESS3-2 has no crosscutting concept, only connections to engineering.
 */

export const PRACTICES = [
  "Asking Questions and Defining Problems",
  "Developing and Using Models",
  "Planning and Carrying Out Investigations",
  "Analyzing and Interpreting Data",
  "Using Mathematics and Computational Thinking",
  "Constructing Explanations and Designing Solutions",
  "Engaging in Argument from Evidence",
  "Obtaining, Evaluating, and Communicating Information",
] as const;

export const CONCEPTS = [
  "Patterns",
  "Cause and Effect",
  "Scale, Proportion, and Quantity",
  "Systems and System Models",
  "Energy and Matter",
  "Structure and Function",
  "Stability and Change",
] as const;

export type Practice = (typeof PRACTICES)[number];
export type Concept = (typeof CONCEPTS)[number];

/** Disciplinary core ideas named by the expectations, with NGSS's titles. */
export const CORE_IDEAS: Record<string, string> = {
  "ESS1.A": "The Universe and Its Stars",
  "ESS1.B": "Earth and the Solar System",
  "ESS1.C": "The History of Planet Earth",
  "ESS2.A": "Earth’s Materials and Systems",
  "ESS2.B": "Plate Tectonics and Large-Scale System Interactions",
  "ESS2.C": "The Roles of Water in Earth’s Surface Processes",
  "ESS2.D": "Weather and Climate",
  "ESS3.A": "Natural Resources",
  "ESS3.B": "Natural Hazards",
  "ESS3.C": "Human Impacts on Earth Systems",
  "ESS3.D": "Global Climate Change",
  "PS1.C": "Nuclear Processes",
  "PS3.D": "Energy in Chemical Processes and Everyday Life",
  "PS4.A": "Wave Properties",
  "PS4.B": "Electromagnetic Radiation",
  "ETS1.B": "Developing Possible Solutions",
};

export type NgssDimensions = {
  practice: Practice;
  concept?: Concept;
  /** Core ideas the expectation is built on. */
  coreIdeas: string[];
  /** Core ideas from other disciplines it draws on ("secondary to" in NGSS). */
  secondary: string[];
};

/** Keyed by registry standard ID ("NGSS MS-ESS2-2"). */
export const NGSS_DIMENSIONS: Record<string, NgssDimensions> = {
  "NGSS MS-ESS1-1": {
    practice: "Developing and Using Models",
    concept: "Patterns",
    coreIdeas: ["ESS1.A", "ESS1.B"],
    secondary: [],
  },
  "NGSS MS-ESS1-2": {
    practice: "Developing and Using Models",
    concept: "Systems and System Models",
    coreIdeas: ["ESS1.A", "ESS1.B"],
    secondary: [],
  },
  "NGSS MS-ESS1-3": {
    practice: "Analyzing and Interpreting Data",
    concept: "Scale, Proportion, and Quantity",
    coreIdeas: ["ESS1.B"],
    secondary: [],
  },
  "NGSS MS-ESS1-4": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Scale, Proportion, and Quantity",
    coreIdeas: ["ESS1.C"],
    secondary: [],
  },
  "NGSS MS-ESS2-1": {
    practice: "Developing and Using Models",
    concept: "Stability and Change",
    coreIdeas: ["ESS2.A"],
    secondary: [],
  },
  "NGSS MS-ESS2-2": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Scale, Proportion, and Quantity",
    coreIdeas: ["ESS2.A", "ESS2.C"],
    secondary: [],
  },
  "NGSS MS-ESS2-3": {
    practice: "Analyzing and Interpreting Data",
    concept: "Patterns",
    coreIdeas: ["ESS2.B"],
    secondary: ["ESS1.C"],
  },
  "NGSS MS-ESS2-4": {
    practice: "Developing and Using Models",
    concept: "Energy and Matter",
    coreIdeas: ["ESS2.C"],
    secondary: [],
  },
  "NGSS MS-ESS2-5": {
    practice: "Planning and Carrying Out Investigations",
    concept: "Cause and Effect",
    coreIdeas: ["ESS2.C", "ESS2.D"],
    secondary: [],
  },
  "NGSS MS-ESS2-6": {
    practice: "Developing and Using Models",
    concept: "Systems and System Models",
    coreIdeas: ["ESS2.C", "ESS2.D"],
    secondary: [],
  },
  "NGSS MS-ESS3-1": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Cause and Effect",
    coreIdeas: ["ESS3.A"],
    secondary: [],
  },
  "NGSS MS-ESS3-2": {
    practice: "Analyzing and Interpreting Data",
    concept: "Patterns",
    coreIdeas: ["ESS3.B"],
    secondary: [],
  },
  "NGSS MS-ESS3-3": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Cause and Effect",
    coreIdeas: ["ESS3.C"],
    secondary: [],
  },
  "NGSS MS-ESS3-4": {
    practice: "Engaging in Argument from Evidence",
    concept: "Cause and Effect",
    coreIdeas: ["ESS3.C"],
    secondary: [],
  },
  "NGSS MS-ESS3-5": {
    practice: "Asking Questions and Defining Problems",
    concept: "Stability and Change",
    coreIdeas: ["ESS3.D"],
    secondary: [],
  },
  "NGSS HS-ESS1-1": {
    practice: "Developing and Using Models",
    concept: "Scale, Proportion, and Quantity",
    coreIdeas: ["ESS1.A"],
    secondary: ["PS3.D"],
  },
  "NGSS HS-ESS1-2": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Energy and Matter",
    coreIdeas: ["ESS1.A"],
    secondary: ["PS4.B"],
  },
  "NGSS HS-ESS1-3": {
    practice: "Obtaining, Evaluating, and Communicating Information",
    concept: "Energy and Matter",
    coreIdeas: ["ESS1.A"],
    secondary: [],
  },
  "NGSS HS-ESS1-4": {
    practice: "Using Mathematics and Computational Thinking",
    concept: "Scale, Proportion, and Quantity",
    coreIdeas: ["ESS1.B"],
    secondary: [],
  },
  "NGSS HS-ESS1-5": {
    practice: "Engaging in Argument from Evidence",
    concept: "Patterns",
    coreIdeas: ["ESS1.C"],
    secondary: ["ESS2.B", "PS1.C"],
  },
  "NGSS HS-ESS1-6": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Stability and Change",
    coreIdeas: ["ESS1.C"],
    secondary: ["PS1.C"],
  },
  "NGSS HS-ESS2-1": {
    practice: "Developing and Using Models",
    concept: "Stability and Change",
    coreIdeas: ["ESS2.A", "ESS2.B"],
    secondary: [],
  },
  "NGSS HS-ESS2-2": {
    practice: "Analyzing and Interpreting Data",
    concept: "Stability and Change",
    coreIdeas: ["ESS2.A", "ESS2.D"],
    secondary: [],
  },
  "NGSS HS-ESS2-3": {
    practice: "Developing and Using Models",
    concept: "Energy and Matter",
    coreIdeas: ["ESS2.A", "ESS2.B"],
    secondary: ["PS4.A"],
  },
  "NGSS HS-ESS2-4": {
    practice: "Developing and Using Models",
    concept: "Cause and Effect",
    coreIdeas: ["ESS2.A", "ESS2.D"],
    secondary: ["ESS1.B"],
  },
  "NGSS HS-ESS2-5": {
    practice: "Planning and Carrying Out Investigations",
    concept: "Structure and Function",
    coreIdeas: ["ESS2.C"],
    secondary: [],
  },
  "NGSS HS-ESS2-6": {
    practice: "Developing and Using Models",
    concept: "Energy and Matter",
    coreIdeas: ["ESS2.D"],
    secondary: [],
  },
  "NGSS HS-ESS2-7": {
    practice: "Engaging in Argument from Evidence",
    concept: "Stability and Change",
    coreIdeas: ["ESS2.D"],
    secondary: [],
  },
  "NGSS HS-ESS3-1": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Cause and Effect",
    coreIdeas: ["ESS3.A", "ESS3.B"],
    secondary: [],
  },
  "NGSS HS-ESS3-2": {
    practice: "Engaging in Argument from Evidence",
    coreIdeas: ["ESS3.A"],
    secondary: ["ETS1.B"],
  },
  "NGSS HS-ESS3-3": {
    practice: "Using Mathematics and Computational Thinking",
    concept: "Stability and Change",
    coreIdeas: ["ESS3.C"],
    secondary: [],
  },
  "NGSS HS-ESS3-4": {
    practice: "Constructing Explanations and Designing Solutions",
    concept: "Stability and Change",
    coreIdeas: ["ESS3.C"],
    secondary: [],
  },
  "NGSS HS-ESS3-5": {
    practice: "Analyzing and Interpreting Data",
    concept: "Stability and Change",
    coreIdeas: ["ESS3.D"],
    secondary: [],
  },
  "NGSS HS-ESS3-6": {
    practice: "Using Mathematics and Computational Thinking",
    concept: "Systems and System Models",
    coreIdeas: ["ESS3.D"],
    secondary: ["ESS2.D"],
  },
};

/** A core idea with its title: "ESS2.A Earth’s Materials and Systems". */
export const coreIdeaLabel = (code: string) =>
  CORE_IDEAS[code] ? `${code} ${CORE_IDEAS[code]}` : code;

const ARRANGEMENT: Record<string, string> = {
  ESS1: "earths-place-universe",
  ESS2: "earths-systems",
  ESS3: "earth-and-human-activity",
};

/** The expectation's own page on nextgenscience.org, with its full wording and clarifications. */
export function ngssUrl(id: string): string | undefined {
  const m = /^NGSS ((?:MS|HS)-(ESS[123])-\d+)$/.exec(id);
  return m
    ? `https://www.nextgenscience.org/pe/${m[1].toLowerCase()}-${ARRANGEMENT[m[2]]}`
    : undefined;
}
