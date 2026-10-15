import LAB_GALLERY_IDS from "../../scripts/lab-gallery-assignments.json" with { type: "json" };
import CASE_GALLERY_IDS from "../../scripts/case-gallery-assignments.json" with { type: "json" };
import { VERIFIED_PHOTOS } from "./verified-photos.ts";
import type { PhotoSlot } from "./photo-assign.ts";

type Pick = { id: string; caption?: string };

/** Turns reviewed {id, caption} picks into figure slots; unknown ids are skipped. */
function slots(picks: Pick[] | undefined): PhotoSlot[] {
  return (picks ?? []).flatMap(({ id, caption }) => {
    const photo = VERIFIED_PHOTOS[id] as PhotoSlot | undefined;
    return photo ? [{ ...photo, ...(caption ? { caption } : {}) }] : [];
  });
}

/** Extra real-world photographs for each lab, beyond its cover. */
export const LAB_GALLERY: Record<string, PhotoSlot[]> = Object.fromEntries(
  Object.entries(LAB_GALLERY_IDS as Record<string, Pick[]>).map(([k, v]) => [k, slots(v)]),
);
/** Further photographs of each case-study place, or of the processes it discusses. */
export const CASE_GALLERY: Record<string, PhotoSlot[]> = Object.fromEntries(
  Object.entries(CASE_GALLERY_IDS as Record<string, Pick[]>).map(([k, v]) => [k, slots(v)]),
);
