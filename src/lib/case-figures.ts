import { CASE_COVER_EXTRA } from "@/lib/photo-assign";

/** A reviewed observation bound to each case, with its own provenance. */
export const CASE_FIGURE = CASE_COVER_EXTRA;
export function caseFigure(slug: string) {
  return CASE_FIGURE[slug];
}
