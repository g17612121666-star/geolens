import { CARDS } from "virtual:photo-cards";

/**
 * What a card needs from a photo: its address and alt text. Lists use these (built by
 * scripts/vite-card-data.mjs from the photo assignments); pages that show a figure with its
 * caption and credit use src/lib/figures.ts instead.
 */
export type PhotoCard = { src: string; alt: string };

export const labCard = (slug: string): PhotoCard | undefined => CARDS.lab[slug];
export const realmCard = (realm: string): PhotoCard | undefined => CARDS.realm[realm];
export const teacherCard = (slug: string): PhotoCard | undefined => CARDS.teacher[slug];
export const caseCard = (slug: string): PhotoCard | undefined => CARDS.case[slug];
/** A field-trip photo by its register id. */
export const tripCard = (photo: string): PhotoCard | undefined => CARDS.photo[photo];
