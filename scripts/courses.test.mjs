import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COURSES, COURSE_BY_ID, planCourse } from "../src/lib/labs/courses.ts";
import { STANDARDS } from "../src/lib/labs/standards.ts";

const labs = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
).labs;

test("every standard in the registry belongs to exactly one course unit", () => {
  const seen = COURSES.flatMap((c) => c.units.flatMap((u) => u.standards));
  assert.equal(new Set(seen).size, seen.length, "a standard is in two units");
  assert.deepEqual([...seen].sort(), STANDARDS.map((s) => s.id).sort());
  for (const course of COURSES)
    for (const unit of course.units) assert.ok(unit.standards.length > 0, unit.id);
});

test("course and unit ids are unique, and the US courses come first", () => {
  assert.deepEqual(
    COURSES.map((c) => c.id),
    ["ms", "hs", "apes", "aphg", "england"],
  );
  const units = COURSES.flatMap((c) => c.units.map((u) => u.id));
  assert.equal(new Set(units).size, units.length);
  assert.equal(COURSE_BY_ID.apes.title, "AP Environmental Science");
});

test("each unit lists a lab once, under a standard the lab is tagged with", () => {
  for (const course of COURSES) {
    for (const unit of planCourse(course, labs)) {
      const slugs = unit.groups.flatMap((g) => g.labs.map((lab) => lab.slug));
      assert.equal(new Set(slugs).size, slugs.length, `${unit.id} repeats a lab`);
      for (const group of unit.groups)
        for (const lab of group.labs) assert.ok(lab.standards.includes(group.standard));
      const tagged = labs.filter((lab) => lab.standards.some((s) => unit.standards.includes(s)));
      assert.deepEqual(
        [...slugs].sort(),
        tagged.map((lab) => lab.slug).sort(),
        `${unit.id} misses a lab`,
      );
      for (const gap of unit.gaps)
        assert.ok(!tagged.some((lab) => lab.standards.includes(gap)), `${gap} has a lab`);
    }
  }
});

test("every lab appears in at least one course", () => {
  const placed = new Set(
    COURSES.flatMap((c) =>
      planCourse(c, labs).flatMap((u) => u.groups.flatMap((g) => g.labs.map((l) => l.slug))),
    ),
  );
  for (const lab of labs) assert.ok(placed.has(lab.slug), lab.slug);
});
