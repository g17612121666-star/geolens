/**
 * Site search: queries are split into words, every word must match, plurals meet their
 * singulars ("boundaries" finds "boundary"), a word of three or more letters also matches
 * the start of a longer word ("glac" finds "glacier"), and results are ranked by where the
 * words match: a title outranks a summary, which outranks body text.
 */

const STOP = new Set([
  "a",
  "an",
  "and",
  "are",
  "do",
  "does",
  "for",
  "how",
  "in",
  "is",
  "of",
  "on",
  "the",
  "to",
  "what",
  "why",
  "with",
]);

/** Lowercase, drop accents and apostrophes (ʻokina too), so "Hawaiʻi" meets "hawaii". */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ʻʼ'’`]/g, "")
    .toLowerCase();
}

/** A rough English stem, enough for plurals: "boundaries" and "boundary" meet. */
export function stem(word: string) {
  const w = word.toLowerCase();
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && /(?:ches|shes|sses|xes|zes|oes)$/.test(w)) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !/(?:ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** The stemmed words of a text, in order. */
export function words(text: string) {
  return (normalize(text).match(/[\p{L}\p{N}]+/gu) ?? []).map(stem);
}

/** The words a query asks for; common little words are dropped unless nothing else is left. */
export function queryWords(query: string) {
  const all = words(query);
  const kept = all.filter((w) => !STOP.has(w));
  return [...new Set(kept.length ? kept : all)];
}

export type SearchField = { text: string; weight: number };
type IndexedField = { words: string[]; flat: string; weight: number };
export type SearchIndex<T> = { item: T; fields: IndexedField[] }[];

/** Prepare items for searching; `fields` lists each item's texts, most important first. */
export function buildIndex<T>(
  items: readonly T[],
  fields: (item: T) => SearchField[],
): SearchIndex<T> {
  return items.map((item) => ({
    item,
    fields: fields(item).map((f) => {
      const w = words(f.text);
      return { words: [...new Set(w)], flat: w.join(" "), weight: f.weight };
    }),
  }));
}

/**
 * Items matching every query word, best first. An exact word scores twice a word-start
 * match; the whole query appearing as a phrase in the first (title) field adds a bonus.
 */
export function searchIndex<T>(index: SearchIndex<T>, query: string): T[] {
  const tokens = queryWords(query);
  if (!tokens.length) return [];
  const phrase = tokens.join(" ");
  const scored: { item: T; score: number; order: number }[] = [];
  index.forEach((entry, order) => {
    let score = 0;
    for (const token of tokens) {
      let best = 0;
      for (const field of entry.fields) {
        if (field.weight * 2 <= best) continue;
        for (const w of field.words) {
          if (w === token) {
            best = Math.max(best, field.weight * 2);
            break;
          }
          if (token.length >= 3 && w.startsWith(token)) best = Math.max(best, field.weight);
        }
      }
      if (!best) return;
      score += best;
    }
    const title = entry.fields[0];
    if (title && tokens.length > 1 && title.flat.includes(phrase)) score += 20;
    if (title && title.flat === phrase) score += 30;
    scored.push({ item: entry.item, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((s) => s.item);
}
