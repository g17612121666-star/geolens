/** Modules built from the photo assignments and case studies by scripts/vite-card-data.mjs. */

declare module "virtual:photo-cards" {
  import type { PhotoCard } from "@/lib/photo-cards";
  type Cards = Record<string, PhotoCard | undefined>;
  export const CARDS: { lab: Cards; realm: Cards; teacher: Cards; case: Cards; photo: Cards };
}

declare module "virtual:case-index" {
  import type { CaseSummary } from "@/lib/case-index";
  import type { CaseStudy } from "@/lib/cases";
  export const CASE_SUMMARIES: CaseSummary[];
  export const CASE_SUMMARIES_BY_REGION: CaseSummary[];
  export const REGIONS: CaseStudy["region"][];
}
