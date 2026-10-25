/**
 * Daily challenges: the same puzzles for everyone on a given UTC day, chosen by a seed from the
 * date. Progress (scores, streak, experience points) stays in this browser only.
 */
import content from "./labs/content.json" with { type: "json" };
import { FIELD_TRIPS, type TripStop } from "./field-trips.ts";

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);

/** Small deterministic generator (mulberry32) seeded from a string. */
function seeded(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(items: T[], n: number, rand: () => number) {
  const pool = [...items],
    out: T[] = [];
  while (out.length < n && pool.length)
    out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export type DailyQuestion = {
  lab: string;
  labTitle: string;
  prompt: string;
  choices: string[];
  answer: number;
  explain: string;
};
type RawLab = {
  slug: string;
  title: string;
  questions: { prompt: string; choices: string[]; answer: number; explain?: string }[];
};
// Questions that refer to a lab's own controls or scene make no sense out of context.
const NEEDS_LAB =
  /\b(slider|toggle|readout|this model|the model|the scene|this lab|press play|in the lab)\b/i;
const POOL: DailyQuestion[] = (content.labs as unknown as RawLab[]).flatMap((l) =>
  l.questions
    .filter((q) => !NEEDS_LAB.test(q.prompt) && !q.choices.some((c) => NEEDS_LAB.test(c)))
    .map((q) => ({
      lab: l.slug,
      labTitle: l.title,
      prompt: q.prompt,
      choices: q.choices,
      answer: q.answer,
      explain: q.explain ?? "",
    })),
);

export const dailyQuestions = (day = dayKey()) => pick(POOL, 5, seeded(`quiz:${day}`));

export type PhotoRound = TripStop & { trip: string; stop: number };
const STOPS: PhotoRound[] = FIELD_TRIPS.flatMap((t) =>
  t.stops.map((s, i) => ({ ...s, trip: t.slug, stop: i + 1 })),
);
export const dailyPhotoRounds = (day = dayKey()) => pick(STOPS, 5, seeded(`where:${day}`));
export const placeOfTheDay = (day = dayKey()) => pick(STOPS, 1, seeded(`place:${day}`))[0];
/** A fresh random set for unlimited practice after the daily rounds. */
export const randomPhotoRounds = () => pick(STOPS, 5, Math.random);

/** Up to 5,000 points a round, falling off with distance (about half at 1,500 km). */
export const roundScore = (km: number) => Math.round(5000 * Math.exp(-km / 2000));

const KEY = "geolens.daily.v1";
type Store = { days: Record<string, { quiz?: number; where?: number }>; xp: number };
export function readDaily(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    return s && typeof s === "object" && s.days ? (s as Store) : { days: {}, xp: 0 };
  } catch {
    return { days: {}, xp: 0 };
  }
}
/** Record a result once per challenge per day; replays do not add experience points again. */
export function recordDaily(kind: "quiz" | "where", score: number, xp: number, day = dayKey()) {
  try {
    const s = readDaily(),
      today = (s.days[day] ??= {});
    if (today[kind] == null) {
      today[kind] = score;
      s.xp += xp;
    }
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: the result is shown but not kept */
  }
}

/** Consecutive days with at least one challenge done, ending today (or yesterday if today is still open). */
export function streak(s = readDaily(), today = new Date()) {
  let n = 0;
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!s.days[dayKey(d)]) d.setUTCDate(d.getUTCDate() - 1);
  while (s.days[dayKey(d)]) {
    n++;
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return n;
}

const LEVELS = [
  { xp: 0, name: "Grain of sand" },
  { xp: 60, name: "Pebble" },
  { xp: 200, name: "Cobble" },
  { xp: 500, name: "Boulder" },
  { xp: 1000, name: "Outcrop" },
  { xp: 2000, name: "Mountain" },
  { xp: 4000, name: "Continent" },
];
export function level(xp: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++;
  const next = LEVELS[i + 1];
  return { number: i + 1, name: LEVELS[i].name, floor: LEVELS[i].xp, next: next?.xp ?? null };
}
