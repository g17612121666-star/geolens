import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const registry = readFileSync(new URL("../src/labs/registry.ts", import.meta.url), "utf8");
const slugs = [...registry.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]);
const thumbs = new URL("../public/labs/thumbs/", import.meta.url);

/** Width and height of a WebP file (lossy, lossless or extended). */
function webpSize(file) {
  const b = readFileSync(file);
  assert.equal(b.toString("latin1", 0, 4), "RIFF", `${file} is not RIFF`);
  assert.equal(b.toString("latin1", 8, 12), "WEBP", `${file} is not WebP`);
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (chunk === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (chunk === "VP8L") {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff)];
  }
  throw new Error(`${file}: unknown WebP chunk ${chunk}`);
}

test("the registry lists every lab", () => {
  assert.equal(slugs.length, 62);
});

test("every lab card has a picture of its model in three sizes", () => {
  for (const slug of slugs) {
    for (const [suffix, w, h] of [
      ["", 640, 480],
      ["-320", 320, 240],
      ["-160", 160, 120],
    ]) {
      const file = new URL(`${slug}${suffix}.webp`, thumbs);
      assert.ok(
        existsSync(file),
        `missing ${slug}${suffix}.webp: run scripts/capture-lab-thumbs.mjs`,
      );
      assert.deepEqual(webpSize(file), [w, h], `${slug}${suffix}.webp`);
    }
  }
});

test("no model picture is left over from a lab that no longer exists", () => {
  for (const name of readdirSync(thumbs)) {
    const slug = name.replace(/(-320|-160)?\.webp$/, "");
    assert.ok(slugs.includes(slug), `${name} has no lab`);
  }
});

