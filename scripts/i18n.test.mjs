import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { ES } from "../src/lib/i18n-es.ts";
import { translate } from "../src/lib/i18n.ts";

const ROOT = new URL("../src/", import.meta.url).pathname;
const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });

/** Every English string the interface passes to t() or tr() as a literal. */
function literals() {
  const found = new Map();
  for (const file of files(ROOT)) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(/\b(?:t|tr)\(\s*"((?:[^"\\]|\\.)*)"/g))
      found.set(m[1], file.slice(ROOT.length));
  }
  return found;
}

test("every interface string sent for translation has Spanish", () => {
  const missing = [...literals()].filter(([text]) => !(text in ES));
  assert.deepEqual(missing, [], "add these to src/lib/i18n-es.ts");
});

test("Spanish keeps each string's placeholders, and English stays as written", () => {
  const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const [en, es] of Object.entries(ES)) assert.deepEqual(holes(es), holes(en), en);
  assert.equal(translate("en", "Note {n}", { n: 2 }), "Note 2");
  assert.equal(translate("es", "Note {n}", { n: 2 }), "Nota 2");
  assert.equal(translate("es", "A string nobody translated"), "A string nobody translated");
});
