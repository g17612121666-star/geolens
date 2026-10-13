import CONTENT from './content.json';
import DEFINITIONS from '../../../scripts/glossary-definitions.json';
import type { LabMeta, RealmMeta } from './types';

/** Reviewed content lives together so outdated draft copy cannot override a lesson. */
export const REALMS: RealmMeta[] = CONTENT.realms as RealmMeta[];
export const LABS: LabMeta[] = (CONTENT.labs as LabMeta[]).map(lab => ({
  ...lab,
  glossary: lab.glossary.map(term => ({
    ...term,
    def: (DEFINITIONS as Record<string, string>)[term.term] ?? term.def,
  })),
}));

export const LAB_BY_SLUG: Record<string, LabMeta> = Object.fromEntries(
  LABS.map(lab => [lab.slug, lab]),
);

export function labsInRealm(realm: RealmMeta['slug']): LabMeta[] {
  return LABS.filter(lab => lab.realm === realm);
}

export const AGE_BANDS = ['KS3', 'GCSE', 'A-level', 'NGSS MS', 'HS Earth Sci', 'APES'] as const;
