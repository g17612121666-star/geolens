/**
 * The Check questions should test the science, not test-taking tricks. These checks keep the
 * answer key from leaking through option length or position (CLAUDE.md: quiz questions).
 * To fix a failure, rewrite option text; never reorder choices, because hand-in codes store
 * the index of each student's first answer.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const labs = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
).labs;
const questions = labs.flatMap((lab) =>
  lab.questions.map((q, i) => ({ ...q, where: `${lab.slug} question ${i + 1}` })),
);

test("always choosing the longest option scores close to chance", () => {
  let expected = 0;
  for (const q of questions) {
    const lengths = q.choices.map((c) => c.length),
      longest = lengths.flatMap((n, i) => (n === Math.max(...lengths) ? [i] : []));
    if (longest.includes(q.answer)) expected += 1 / longest.length;
  }
  const score = expected / questions.length;
  assert.ok(score <= 0.33, `picking the longest option scores ${(score * 100).toFixed(1)}%`);
});

test("no phrase answer stands out as much longer than every distractor", () => {
  // One- or two-word answers (a rock name, a direction) are exempt: their length is the word's.
  for (const q of questions) {
    const right = q.choices[q.answer].length;
    if (right < 20) continue;
    const longestWrong = Math.max(
      ...q.choices.filter((_, i) => i !== q.answer).map((c) => c.length),
    );
    assert.ok(right <= longestWrong * 1.15, `${q.where}: the answer is the clearly longest option`);
  }
});

test("correct answers are spread across the four positions", () => {
  const counts = [0, 0, 0, 0];
  for (const q of questions) {
    assert.equal(q.choices.length, 4, q.where);
    counts[q.answer]++;
  }
  for (const n of counts)
    assert.ok(n / questions.length >= 0.18 && n / questions.length <= 0.32, `${counts}`);
});
