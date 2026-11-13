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
