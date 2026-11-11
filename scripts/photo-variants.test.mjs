import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { photoSrcSet } from "../src/lib/responsive-image.ts";

test("every photograph has a 640px WebP copy for cards", () => {
  for (const dir of ["public/photos/verified", "public/photos"]) {
    const missing = readdirSync(dir)
      .filter((f) => f.endsWith(".jpg"))
      .filter((f) => !existsSync(`${dir}/640/${f.replace(/\.jpg$/, ".webp")}`));
    assert.deepEqual(missing, [], `run python3 scripts/make-photo-variants.py (${dir})`);
  }
});

test("photoSrcSet lists the small WebP before the full JPEG", () => {
  assert.equal(
    photoSrcSet("/photos/verified/uluru-sunset.jpg"),
    "/photos/verified/640/uluru-sunset.webp 640w, /photos/verified/uluru-sunset.jpg 1280w",
  );
  assert.equal(photoSrcSet("/photos/li-zeyu-field.jpg")?.startsWith("/photos/640/"), true);
  assert.equal(photoSrcSet("/textures/earth-day.jpg"), undefined);
  assert.equal(photoSrcSet(undefined), undefined);
});
