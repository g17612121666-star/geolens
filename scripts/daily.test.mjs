import test from "node:test";
import assert from "node:assert/strict";
import {
  dailyQuestions,
  dailyPhotoRounds,
  roundScore,
  streak,
  level,
  dayKey,
} from "../src/lib/daily.ts";
import { FIELD_TRIPS } from "../src/lib/field-trips.ts";
import { VERIFIED_PHOTOS } from "../src/lib/verified-photos.ts";

test("daily puzzles are the same for everyone on a day and change between days", () => {
  assert.deepEqual(dailyQuestions("2026-10-25"), dailyQuestions("2026-10-25"));
  assert.notDeepEqual(dailyQuestions("2026-10-25"), dailyQuestions("2026-10-26"));
  const q = dailyQuestions("2026-10-25");
  assert.equal(q.length, 5);
  assert.equal(new Set(q.map((x) => x.prompt)).size, 5);
  for (const x of q) assert.ok(x.answer >= 0 && x.answer < x.choices.length);
  assert.equal(dailyPhotoRounds("2026-01-01").length, 5);
});

test("scores fall with distance and streaks count consecutive days", () => {
  assert.equal(roundScore(0), 5000);
  assert.ok(roundScore(500) > roundScore(1500) && roundScore(1500) > roundScore(5000));
  const today = new Date("2026-10-25T12:00:00Z");
  const days = {
    "2026-10-23": { quiz: 3 },
    "2026-10-24": { quiz: 4 },
    "2026-10-25": { where: 9000 },
  };
  assert.equal(streak({ days, xp: 0 }, today), 3);
  assert.equal(streak({ days: { "2026-10-24": { quiz: 1 } }, xp: 0 }, today), 1);
  assert.equal(streak({ days: { "2026-10-20": { quiz: 1 } }, xp: 0 }, today), 0);
  assert.equal(dayKey(today), "2026-10-25");
  assert.equal(level(0).name, "Grain of sand");
  assert.equal(level(60).number, 2);
});

test("every field-trip stop uses a verified photo and a sensible place", () => {
  for (const t of FIELD_TRIPS) {
    assert.ok(t.check.answer >= 0 && t.check.answer < t.check.choices.length, t.slug);
    for (const s of t.stops) {
      assert.ok(VERIFIED_PHOTOS[s.photo], `${t.slug}: ${s.photo}`);
      assert.ok(Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180, s.title);
      assert.match(s.lab, /^[a-z-]+(\?[a-z]+=[\d.]+(&[a-z]+=[\d.]+)*)?$/, s.lab);
    }
  }
});

test("field-trip lab links name real labs and real controls", async () => {
  const { default: content } = await import("../src/lib/labs/content.json", {
    with: { type: "json" },
  });
  const labs = Object.fromEntries(content.labs.map((l) => [l.slug, l]));
  for (const t of FIELD_TRIPS)
    for (const s of t.stops) {
      const [slug, query = ""] = s.lab.split("?");
      const lab = labs[slug];
      assert.ok(lab, `${t.slug}: unknown lab ${slug}`);
      const keys = [...(lab.controls.extra ?? []), ...(lab.controls.toggles ?? [])].map(
        (c) => c.key,
      );
      for (const [k] of new URLSearchParams(query))
        assert.ok(keys.includes(k), `${s.lab}: no control ${k}`);
    }
});

test("the night polygon contains the antisolar point, not the subsolar point", async () => {
  const { subsolarPoint, nightPolygon } = await import("../src/lib/solar.ts");
  const inside = (ring, [x, y]) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  for (const iso of ["2026-06-21T12:00:00Z", "2026-12-21T03:00:00Z", "2026-03-20T18:30:00Z"]) {
    const d = new Date(iso), s = subsolarPoint(d), ring = nightPolygon(d).features[0].geometry.coordinates[0];
    const anti = [s.lon > 0 ? s.lon - 180 : s.lon + 180, Math.max(-80, Math.min(80, -s.lat))];
    assert.equal(inside(ring, [s.lon, s.lat]), false, iso);
    assert.equal(inside(ring, anti), true, iso);
  }
  const noon = subsolarPoint(new Date("2026-06-21T12:00:00Z"));
  assert.ok(Math.abs(noon.lat - 23.4) < 0.2 && Math.abs(noon.lon) < 1);
});
