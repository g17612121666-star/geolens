/**
 * The photo cards and case summaries that list pages load are built by scripts/vite-card-data.mjs.
 * They must say exactly what the photo assignments, the photo register and the case studies say.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { caseIndex, photoCards } from "./vite-card-data.mjs";
import * as assign from "../src/lib/photo-assign.ts";
import { VERIFIED_PHOTOS } from "../src/lib/verified-photos.ts";
import { CASES, CASES_BY_REGION, REGIONS } from "../src/lib/cases.ts";
import { FIELD_TRIPS } from "../src/lib/field-trips.ts";

const cards = photoCards();

test("each cover card has its slot's image and alt text", () => {
  for (const [group, slots] of [
    ["lab", assign.LAB_COVER],
    ["realm", assign.REALM_COVER],
    ["teacher", assign.TEACHER_HERO],
    ["case", assign.CASE_COVER_EXTRA],
  ]) {
    assert.deepEqual(Object.keys(cards[group]).sort(), Object.keys(slots).sort(), group);
    for (const [key, slot] of Object.entries(slots)) {
      assert.deepEqual(cards[group][key], { src: slot.src, alt: slot.alt }, `${group}/${key}`);
    }
  }
});

test("every field-trip photo has a card for an image that exists", () => {
  for (const stop of FIELD_TRIPS.flatMap((trip) => trip.stops)) {
    const card = cards.photo[stop.photo],
      photo = VERIFIED_PHOTOS[stop.photo];
    assert.deepEqual(card, { src: photo.src, alt: photo.alt }, stop.photo);
    assert.ok(existsSync(new URL(`../public${card.src}`, import.meta.url)), card.src);
  }
});

test("case summaries follow the case studies, in both orders, without their text", () => {
  const { CASE_SUMMARIES, CASE_SUMMARIES_BY_REGION, REGIONS: regions } = caseIndex();
  assert.deepEqual(regions, REGIONS);
  assert.deepEqual(
    CASE_SUMMARIES.map((c) => c.slug),
    CASES.map((c) => c.slug),
  );
  assert.deepEqual(
    CASE_SUMMARIES_BY_REGION.map((c) => c.slug),
    CASES_BY_REGION.map((c) => c.slug),
  );
  for (const summary of CASE_SUMMARIES) {
    const full = CASES.find((c) => c.slug === summary.slug);
    for (const key of ["title", "place", "region", "lede", "labs"]) {
      assert.deepEqual(summary[key], full[key], `${summary.slug}.${key}`);
    }
    assert.equal(summary.body, undefined, summary.slug);
  }
});
