import type { CaseStudy } from "./cases";

/**
 * What lists and filters need about each case study, without its text (built by
 * scripts/vite-card-data.mjs from src/lib/cases.ts). Case pages and site search use cases.ts.
 */
export type CaseSummary = Pick<CaseStudy, "slug" | "title" | "place" | "region" | "lede" | "labs">;

export { CASE_SUMMARIES, CASE_SUMMARIES_BY_REGION, REGIONS } from "virtual:case-index";
