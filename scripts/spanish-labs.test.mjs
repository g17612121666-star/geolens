import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";

const dir = new URL("../src/lib/labs/es/", import.meta.url);
const { labs } = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
);
const spanish = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), "utf8"))]);

const filled = (s, where) => assert.ok(typeof s === "string" && s.trim().length > 0, where);

test("every lab has a Spanish file, and every Spanish file is a real lab", () => {
  const translated = new Set(spanish.map(([slug]) => slug));
  assert.deepEqual(
    labs.filter((l) => !translated.has(l.slug)).map((l) => l.slug),
    [],
    "labs without src/lib/labs/es/<slug>.json",
  );
  for (const [slug] of spanish)
    assert.ok(
      labs.some((l) => l.slug === slug),
      `${slug}.json`,
    );
});

test("each Spanish lab mirrors its English lab, so answer keys and hand-in codes still match", () => {
  for (const [slug, es] of spanish) {
    const en = labs.find((l) => l.slug === slug);
    for (const key of ["title", "hook", "objective", "modelDescription"])
      filled(es[key], `${slug} ${key}`);
    assert.equal(es.steps.length, en.steps.length, `${slug}: steps`);
    es.steps.forEach(
      (s, i) => (filled(s.title, `${slug} step ${i}`), filled(s.body, `${slug} step ${i}`)),
    );
    assert.equal(es.questions.length, en.questions.length, `${slug}: questions`);
    es.questions.forEach((q, i) => {
      filled(q.prompt, `${slug} q${i}`);
      filled(q.explain, `${slug} q${i} explain`);
      // Same choices in the same order: the English answer index must still point at the right one.
      assert.equal(q.choices.length, en.questions[i].choices.length, `${slug} q${i}: choices`);
      q.choices.forEach((c) => filled(c, `${slug} q${i} choice`));
      assert.equal(q.answer, undefined, `${slug} q${i}: answers come from the English lab`);
    });
    assert.equal(es.why.length, en.why.length, `${slug}: why`);
    assert.equal(es.misconceptions.length, en.misconceptions.length, `${slug}: misconceptions`);
    assert.equal(es.glossary.length, en.glossary.length, `${slug}: glossary`);
    es.glossary.forEach((g) => (filled(g.term, slug), filled(g.def, `${slug} ${g.term}`)));
    assert.equal(Boolean(es.predict), Boolean(en.predict), `${slug}: predict`);
    assert.equal(Boolean(es.cer), Boolean(en.cer), `${slug}: explanation`);
    const keys = new Map([
      ...(en.controls.extra ?? []).map((e) => [e.key, e.options?.length ?? 0]),
      ...(en.controls.toggles ?? []).map((t) => [t.key, 0]),
    ]);
    for (const [key, control] of Object.entries(es.controls ?? {})) {
      assert.ok(keys.has(key), `${slug}: no control ${key}`);
      assert.equal(control.options?.length ?? 0, keys.get(key), `${slug} ${key}: options`);
    }
    for (const key of keys.keys())
      assert.ok(es.controls?.[key], `${slug}: control ${key} untranslated`);
  }
});

test("Spanish questions open with ¿ as well as closing with ?", () => {
  const strings = (v) =>
    typeof v === "string"
      ? [v]
      : v && typeof v === "object"
        ? Object.values(v).flatMap(strings)
        : [];
  for (const [slug, es] of spanish)
    for (const text of strings(es))
      assert.equal(
        (text.match(/¿/g) ?? []).length,
        (text.match(/\?/g) ?? []).length,
        `${slug}: ${text.slice(0, 80)}`,
      );
});
