import { STANDARDS } from "./standards.ts";
import type { LabSummary } from "./types";

/**
 * The teacher Courses page: labs arranged by course, unit and standard. A unit lists the
 * standards it covers in registry order; each lab appears once per unit, under the first of its
 * standards in that unit, so a unit reads as a teaching sequence rather than a lookup table.
 * (/teachers/standards lists every lab under every standard.)
 */
export type CourseId = "ms" | "hs" | "apes" | "aphg" | "england";

export type CourseUnit = {
  id: string;
  title: string;
  /** Standard IDs from the registry, in teaching order. */
  standards: string[];
};

export type Course = {
  id: CourseId;
  /** Tab label. */
  short: string;
  title: string;
  summary: string;
  units: CourseUnit[];
};

const withPrefix = (prefix: string) =>
  STANDARDS.filter((s) => s.id.startsWith(prefix)).map((s) => s.id);

const ngssUnits = (band: "MS" | "HS"): CourseUnit[] => [
  {
    id: `${band.toLowerCase()}-ess1`,
    title: "ESS1: Earth’s place in the universe",
    standards: withPrefix(`NGSS ${band}-ESS1-`),
  },
  {
    id: `${band.toLowerCase()}-ess2`,
    title: "ESS2: Earth’s systems",
    standards: withPrefix(`NGSS ${band}-ESS2-`),
  },
  {
    id: `${band.toLowerCase()}-ess3`,
    title: "ESS3: Earth and human activity",
    standards: withPrefix(`NGSS ${band}-ESS3-`),
  },
];

export const COURSES: Course[] = [
  {
    id: "ms",
    short: "Middle school Earth & space",
    title: "Middle school Earth and space science",
    summary: "NGSS performance expectations for grades 6 to 8, grouped by disciplinary core idea.",
    units: ngssUnits("MS"),
  },
  {
    id: "hs",
    short: "High school Earth & space",
    title: "High school Earth and space science",
    summary:
      "NGSS performance expectations for high school Earth and space science, grouped by disciplinary core idea.",
    units: ngssUnits("HS"),
  },
  {
    id: "apes",
    short: "AP Environmental Science",
    title: "AP Environmental Science",
    summary: "Topics from the College Board course framework, by unit.",
    units: [
      {
        id: "apes-1",
        title: "Unit 1: The Living World: Ecosystems",
        standards: withPrefix("APES 1."),
      },
      {
        id: "apes-4",
        title: "Unit 4: Earth Systems and Resources",
        standards: withPrefix("APES 4."),
      },
      { id: "apes-5", title: "Unit 5: Land and Water Use", standards: withPrefix("APES 5.") },
      { id: "apes-9", title: "Unit 9: Global Change", standards: withPrefix("APES 9.") },
    ],
  },
  {
    id: "aphg",
    short: "AP Human Geography",
    title: "AP Human Geography",
    summary:
      "Geolens is mainly physical geography and Earth science, so for AP Human Geography it covers the map skills of Unit 1. The same labs suit middle school geography under the C3 Framework.",
    units: [
      { id: "aphg-1", title: "Unit 1: Thinking Geographically", standards: withPrefix("APHG 1.") },
      { id: "c3", title: "C3 Framework: geography, grades 6 to 8", standards: withPrefix("C3 ") },
    ],
  },
  {
    id: "england",
    short: "England: KS3 to A level",
    title: "England: KS3, GCSE and A level",
    summary:
      "The national curriculum at key stage 3, then each GCSE specification and AQA A level. Pick your exam board.",
    units: [
      { id: "ks3", title: "Key stage 3", standards: withPrefix("KS3 ") },
      { id: "aqa-gcse", title: "GCSE: AQA (8035)", standards: withPrefix("AQA GCSE ") },
      {
        id: "edexcel-a",
        title: "GCSE: Edexcel A (1GA0)",
        standards: withPrefix("Edexcel GCSE A "),
      },
      {
        id: "edexcel-b",
        title: "GCSE: Edexcel B (1GB0)",
        standards: withPrefix("Edexcel GCSE B "),
      },
      { id: "ocr-a", title: "GCSE: OCR A (J383)", standards: withPrefix("OCR GCSE A ") },
      { id: "ocr-b", title: "GCSE: OCR B (J384)", standards: withPrefix("OCR GCSE B ") },
      { id: "aqa-a-level", title: "A level: AQA (7037)", standards: withPrefix("AQA A-level ") },
    ],
  },
];

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c])) as Record<
  CourseId,
  Course
>;

export type UnitPlan = CourseUnit & {
  /** Standards with labs, each with the labs placed under it. */
  groups: { standard: string; labs: LabSummary[] }[];
  /** Standards in the unit that no lab teaches yet. */
  gaps: string[];
};

/** A course's units with their labs; units without any lab are left out. */
export function planCourse(course: Course, labs: readonly LabSummary[]): UnitPlan[] {
  return course.units
    .map((unit) => {
      const placed = new Set<string>();
      const groups = unit.standards.map((standard) => {
        const here = labs.filter(
          (lab) => !placed.has(lab.slug) && lab.standards.includes(standard),
        );
        for (const lab of here) placed.add(lab.slug);
        return { standard, labs: here };
      });
      return {
        ...unit,
        groups: groups.filter((g) => g.labs.length > 0),
        gaps: unit.standards.filter((id) => !labs.some((lab) => lab.standards.includes(id))),
      };
    })
    .filter((unit) => unit.groups.length > 0);
}
