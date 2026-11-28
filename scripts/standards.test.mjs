import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FRAMEWORKS,
  STANDARDS,
  STANDARD_BY_ID,
  isUsStandard,
  sortStandards,
} from "../src/lib/labs/standards.ts";

const labs = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
).labs;

test("the registry lists every NGSS Earth and space science expectation once", () => {
  const ids = STANDARDS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate standard");
  const ngss = STANDARDS.filter((s) => s.framework === "NGSS").map((s) => s.code);
  for (const code of ngss) assert.match(code, /^(MS|HS)-ESS[123]-\d$/);
  assert.equal(ngss.filter((c) => c.startsWith("MS-")).length, 15);
  assert.equal(ngss.filter((c) => c.startsWith("HS-")).length, 19);
  for (const f of FRAMEWORKS)
    assert.ok(
      STANDARDS.some((s) => s.framework === f.id),
      f.id,
    );
  for (const s of STANDARDS)
    assert.ok(
      FRAMEWORKS.some((f) => f.id === s.framework),
      s.id,
    );
});

test("every lab lists known standards, US frameworks first, with at least one US standard", () => {
  for (const lab of labs) {
    assert.equal(lab.curriculum, undefined, `${lab.slug}: use standards, not curriculum`);
    assert.ok(lab.standards.length > 0, lab.slug);
    for (const id of lab.standards) assert.ok(STANDARD_BY_ID[id], `${lab.slug}: unknown ${id}`);
    assert.equal(new Set(lab.standards).size, lab.standards.length, `${lab.slug}: duplicate`);
    assert.deepEqual(lab.standards, sortStandards(lab.standards), `${lab.slug}: display order`);
    assert.ok(lab.standards.some(isUsStandard), `${lab.slug}: no US standard`);
  }
});

test("teaching stages agree with the standards, so filters find the same labs", () => {
  for (const lab of labs) {
    const has = (prefix) => lab.standards.some((id) => id.startsWith(prefix));
    if (has("NGSS MS-")) assert.ok(lab.ages.includes("NGSS MS"), `${lab.slug}: NGSS MS`);
    if (has("NGSS HS-")) assert.ok(lab.ages.includes("HS Earth Sci"), `${lab.slug}: HS Earth Sci`);
    if (has("APES ")) assert.ok(lab.ages.includes("APES"), `${lab.slug}: APES`);
    assert.equal(has("KS3 "), lab.ages.includes("KS3"), `${lab.slug}: KS3 band and standard`);
  }
});

test("high school labs carry high school expectations where NGSS has one", () => {
  // These labs teach a process NGSS names at high school; they should say so.
  const expected = {
    "carbon-cycle": "NGSS HS-ESS2-6",
    "seafloor-spreading": "NGSS HS-ESS1-5",
    "earth-interior": "NGSS HS-ESS2-3",
    "energy-budget": "NGSS HS-ESS2-4",
    tsunami: "NGSS HS-ESS3-1",
  };
  for (const [slug, id] of Object.entries(expected)) {
    assert.ok(labs.find((l) => l.slug === slug).standards.includes(id), `${slug}: ${id}`);
  }
});

test("a search for a standard code finds that standard, and an NGSS group finds its expectations", async () => {
  const { matchStandards } = await import("../src/lib/labs/standards.ts");
  assert.deepEqual(matchStandards("MS-ESS2-2"), ["NGSS MS-ESS2-2"]);
  assert.deepEqual(matchStandards("  ngss  hs-ess3-1 "), ["NGSS HS-ESS3-1"]);
  assert.deepEqual(matchStandards("APES 4.1"), ["APES 4.1"]);
  assert.deepEqual(matchStandards("aqa gcse 3.1.3.4"), ["AQA GCSE 3.1.3.4"]);
  assert.deepEqual(matchStandards("C3 D2.Geo.1.6-8"), ["C3 D2.Geo.1.6-8"]);
  assert.deepEqual(matchStandards("HS-ESS3"), [
    "NGSS HS-ESS3-1",
    "NGSS HS-ESS3-2",
    "NGSS HS-ESS3-3",
    "NGSS HS-ESS3-4",
    "NGSS HS-ESS3-5",
    "NGSS HS-ESS3-6",
  ]);
  for (const words of ["glaciers", "4.1", "MS-ESS9-1", "ESS2", ""])
    assert.deepEqual(matchStandards(words), [], words);
});

test("Texas TEKS: every Earth and space expectation for grades 6 to 8 and every Earth Systems Science concept", () => {
  const codes = STANDARDS.filter((s) => s.framework === "TEKS").map((s) => s.code);
  for (const code of codes) assert.match(code, /^(\d\.\d+|ESS\.\d+|WG\.\d+)[A-H]$/, code);
  // 19 TAC §112.26 to §112.28 (2021): knowledge and skills 9 to 11 in each grade.
  assert.equal(codes.filter((c) => /^[678]\./.test(c)).length, 23);
  // 19 TAC §112.49 (2021): science concepts (c)(5) to (c)(12).
  assert.equal(codes.filter((c) => c.startsWith("ESS.")).length, 42);
  // Grade-level expectations come before the high school courses.
  assert.ok(codes.indexOf("8.11C") < codes.indexOf("ESS.5A"));
  assert.ok(codes.indexOf("ESS.12F") < codes.indexOf("WG.3A"));
});

test("a TEKS code finds its expectation, and a knowledge-and-skills number finds the group", async () => {
  const { matchStandards } = await import("../src/lib/labs/standards.ts");
  assert.deepEqual(matchStandards("TEKS 6.9A"), ["TEKS 6.9A"]);
  assert.deepEqual(matchStandards("8.10c"), ["TEKS 8.10C"]);
  assert.deepEqual(matchStandards(" ess.8e "), ["TEKS ESS.8E"]);
  assert.deepEqual(matchStandards("TEKS 8.10"), ["TEKS 8.10A", "TEKS 8.10B", "TEKS 8.10C"]);
  assert.equal(matchStandards("ESS.8").length, 8);
  assert.deepEqual(matchStandards("WG.4"), ["TEKS WG.4A", "TEKS WG.4B"]);
  // A bare grade-level number could be another framework's topic, so it needs "TEKS".
  assert.deepEqual(matchStandards("8.10"), []);
});

test("labs with Texas tags are offered under the Texas filter and the Texas course", async () => {
  const { COURSE_BY_ID } = await import("../src/lib/labs/courses.ts");
  const texas = COURSE_BY_ID.texas.units.flatMap((u) => u.standards);
  const tagged = labs.filter((l) => l.standards.some((id) => id.startsWith("TEKS ")));
  assert.ok(tagged.length >= 40, `${tagged.length} labs tagged`);
  for (const lab of tagged)
    for (const id of lab.standards.filter((s) => s.startsWith("TEKS ")))
      assert.ok(texas.includes(id), `${lab.slug}: ${id} is in no Texas unit`);
});
