import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decodeHandIn, encodeHandIn, findHandIns, HANDIN_LABS } from "../src/lib/hand-in.ts";

const content = JSON.parse(readFileSync(new URL("../src/lib/labs/content.json", import.meta.url)));

test("every lab has a hand-in number and every quiz fits the code", () => {
  for (const lab of content.labs) {
    assert.ok(HANDIN_LABS.includes(lab.slug), `${lab.slug} has no hand-in number`);
    assert.equal(lab.questions.length, 5, `${lab.slug} needs exactly five questions`);
    for (const q of lab.questions)
      assert.ok(q.choices.length <= 4, `${lab.slug}: too many choices`);
  }
});

test("codes round-trip for every lab", () => {
  const date = new Date(Date.UTC(2026, 10, 3));
  for (const slug of HANDIN_LABS) {
    const h = { slug, answers: [0, 3, null, 2, 1], date, predicted: true, explained: false };
    const code = encodeHandIn(h);
    assert.match(code, /^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    const back = decodeHandIn(code);
    assert.deepEqual(back, h);
  }
});

test("typos are rejected and look-alike letters are forgiven", () => {
  const code = encodeHandIn({
    slug: "seasons",
    answers: [3, 0, 1, 2, 0],
    date: new Date(Date.UTC(2026, 8, 1)),
    predicted: false,
    explained: true,
  });
  const chars = code.replace("-", "").split("");
  let rejected = 0;
  for (let i = 0; i < chars.length; i++) {
    const swapped = [...chars];
    swapped[i] = swapped[i] === "7" ? "8" : "7";
    if (decodeHandIn(swapped.join("")) === null) rejected++;
  }
  assert.ok(rejected >= 9, `only ${rejected} of 10 single-character typos were caught`);
  assert.deepEqual(decodeHandIn(code.toLowerCase().replace(/0/g, "o")), decodeHandIn(code));
});

test("pasted lists keep the name beside each code", () => {
  const a = encodeHandIn({
    slug: "tides",
    answers: [1, 1, 1, 1, 1],
    date: new Date(),
    predicted: true,
    explained: true,
  });
  const rows = findHandIns(
    `Maya R.\t${a}\nnot a code line\n${a.replace("-", "")}, Jordan\nWashington Lee ${a}\nSam AB1CD-EF2GH`,
  );
  assert.equal(rows.length, 4);
  assert.equal(rows[2].label, "Washington Lee");
  assert.equal(rows[3].result, null);
  assert.equal(rows[0].label, "Maya R.");
  assert.equal(rows[1].label, "Jordan");
  assert.equal(rows[0].result?.slug, "tides");
});
