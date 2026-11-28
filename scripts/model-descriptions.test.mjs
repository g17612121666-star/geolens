import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { labs } = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
);

test("every lab describes its 3D model in words for screen readers", () => {
  for (const lab of labs) {
    const text = lab.modelDescription ?? "";
    const words = text.split(/\s+/).filter(Boolean).length;
    assert.ok(words >= 25 && words <= 90, `${lab.slug}: ${words} words`);
    assert.match(text, /[.!?]$/, `${lab.slug} ends with a full stop`);
  }
});

test("a model drawn larger than life says so in its description", () => {
  for (const lab of labs) {
    const notes = (lab.modelNotes ?? []).join(" ");
    if (!/exaggerat|enlarged|times taller|×\s?\d/.test(notes)) continue;
    assert.match(
      lab.modelDescription,
      /exaggerat|enlarged|not to scale|times taller|compressed|physical scale|schematic/i,
      `${lab.slug}'s notes mention exaggeration, so its description should too`,
    );
  }
});
