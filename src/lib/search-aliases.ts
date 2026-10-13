/** Course codes and spelling alternatives that should hit English labs, cases, and places. */
export const SEARCH_ALIASES: Record<string, string> = {
  "aqa 8035": "gcse",
  "ms-ess1-1": "seasons",
  "hs-ess1": "solar-system",
};

export function expandSearchNeedle(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const hit = SEARCH_ALIASES[t] ?? SEARCH_ALIASES[t.toLowerCase()];
  return (hit ?? t).toLowerCase();
}
