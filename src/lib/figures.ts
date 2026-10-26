import type { FigureProps } from "@/components/figure";
import type { RealmSlug } from "@/lib/labs/types";
import {
  GLOSSARY_PHOTO,
  LAB_COVER,
  REALM_COVER,
  TEACHER_HERO,
  TERM_THUMB,
} from "@/lib/photo-assign";

type Fig = Pick<FigureProps, "src" | "alt" | "caption" | "credit" | "sourceUrl" | "licenseUrl" | "kind">;

function slot(s: Fig | undefined): Fig | undefined {
  if (!s) return undefined;
  return { ...s };
}

function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export const LAB_FIGURE: Record<string, Fig> = Object.fromEntries(
  Object.entries(LAB_COVER)
    .map(([k, v]) => [k, slot(v)])
    .filter((e): e is [string, Fig] => Boolean(e[1])),
);

export const REALM_FIGURE = Object.fromEntries(
  Object.entries(REALM_COVER).map(([realm, figure]) => [realm, {...figure}]),
) as Record<RealmSlug, Fig>;

export function labFigure(slug: string): Fig | undefined {
  return LAB_FIGURE[slug];
}

export function labFigures(slug: string): Fig[] {
  const a = LAB_COVER[slug];
  const b = TEACHER_HERO[slug];
  const out: Fig[] = [];
  const fa = slot(a);
  const fb = slot(b);
  if (fa) out.push(fa);
  if (fb && fb.src !== fa?.src) out.push(fb);
  return out;
}

export function teacherHero(slug: string): Fig | undefined {
  return slot(TEACHER_HERO[slug]);
}

export function termFigure(term: string): Fig | undefined {
  const direct = GLOSSARY_PHOTO[term];
  if (direct) return slot(direct);
  const want = fold(term);
  const hit = Object.keys(GLOSSARY_PHOTO).find((k) => fold(k) === want);
  return hit ? slot(GLOSSARY_PHOTO[hit]) : undefined;
}

function termKey(lab: string, term: string): string {
  const slug = fold(term).replace(/\s+/g, "-");
  return `${lab}--${slug}`;
}

/** The same verified observation follows a term across the glossary and labs. */
export function termThumb(lab: string, term: string): Fig | undefined {
  const thumbs = TERM_THUMB ?? {};
  const direct = thumbs[termKey(lab, term)];
  if (direct) return slot(direct);
  const want = termKey(lab, term);
  const hit = Object.keys(thumbs).find((k) => fold(k) === fold(want));
  if (hit) return slot(thumbs[hit]);
  return termFigure(term);
}
