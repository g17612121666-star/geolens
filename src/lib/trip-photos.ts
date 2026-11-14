import { VERIFIED_PHOTOS } from "./verified-photos.ts";

/** A field-trip photo with its caption and credit, for pages that show them; lists use tripCard. */
export const tripPhoto = (id: string) => VERIFIED_PHOTOS[id];
