import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { photoSrcSet } from "../src/lib/responsive-image.ts";

test("every photograph has 640px and 960px WebP copies", () => {
  for (const dir of ["public/photos/verified", "public/photos"])
    for (const width of [640, 960]) {
      const missing = readdirSync(dir)
        .filter((f) => f.endsWith(".jpg"))
        .filter((f) => !existsSync(`${dir}/${width}/${f.replace(/\.jpg$/, ".webp")}`));
      assert.deepEqual(missing, [], `run python3 scripts/make-photo-variants.py (${dir}/${width})`);
    }
});

test("photoSrcSet lists the WebP copies, smallest first, before the full JPEG", () => {
  assert.equal(
    photoSrcSet("/photos/verified/uluru-sunset.jpg"),
    "/photos/verified/640/uluru-sunset.webp 640w, /photos/verified/960/uluru-sunset.webp 960w, /photos/verified/uluru-sunset.jpg 1280w",
  );
  assert.equal(photoSrcSet("/photos/li-zeyu-field.jpg")?.startsWith("/photos/640/"), true);
  assert.equal(photoSrcSet("/textures/earth-day.jpg"), undefined);
  assert.equal(photoSrcSet(undefined), undefined);
});
