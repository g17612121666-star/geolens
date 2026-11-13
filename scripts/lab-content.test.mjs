import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { summarize, withDefinitions } from "../src/lib/labs/summary.ts";
import { HANDIN_LABS } from "../src/lib/hand-in.ts";

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const labs = read("../src/lib/labs/content.json").labs;
const definitions = read("./glossary-definitions.json");

test("every lab glossary term has one shared definition, kept out of content.json", () => {
  for (const lab of labs) {
    for (const entry of lab.glossary) {
      assert.equal(
        entry.def,
        undefined,
        `${lab.slug}: define "${entry.term}" in glossary-definitions.json`,
      );
      assert.ok(definitions[entry.term]?.trim(), `${lab.slug}: "${entry.term}" has no definition`);
    }
    const lesson = withDefinitions(lab, definitions);
    assert.deepEqual(
      lesson.glossary.map((g) => g.def),
      lab.glossary.map((g) => definitions[g.term]),
    );
  }
});

test("each lab lists its misconceptions once", () => {
  for (const lab of labs) {
    assert.equal(lab.misconception, undefined, `${lab.slug}: use misconceptions only`);
    assert.ok(lab.misconceptions.length > 0, lab.slug);
    for (const m of lab.misconceptions) assert.ok(m.claim.trim() && m.truth.trim(), lab.slug);
  }
});

test("lab summaries carry the answer keys and a teacher preview from the full lesson", () => {
  for (const lab of labs) {
    const summary = summarize(lab);
    assert.deepEqual(
      summary.answers,
      lab.questions.map((q) => q.answer),
      lab.slug,
    );
    assert.equal(summary.preview, lab.questions[0].prompt, lab.slug);
    assert.deepEqual(
      summary.glossary.map((g) => g.term),
      lab.glossary.map((g) => g.term),
    );
    for (const key of ["steps", "questions", "why", "teacher", "controls", "sources"]) {
      assert.equal(summary[key], undefined, `${lab.slug}: a summary must not carry ${key}`);
    }
  }
});

test("content, scenes and hand-in codes cover the same labs", () => {
  const registry = readFileSync(new URL("../src/labs/registry.ts", import.meta.url), "utf8");
  const scenes = [...registry.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]);
  const slugs = labs.map((lab) => lab.slug);
  assert.equal(new Set(slugs).size, slugs.length, "duplicate lab slug");
  assert.deepEqual([...slugs].sort(), [...scenes].sort());
  assert.deepEqual([...slugs].sort(), [...HANDIN_LABS].sort());
});
