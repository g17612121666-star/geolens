import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { classroomShareUrl } from "../src/lib/classroom-share.ts";
import { DEFAULT_PREVIEW, headFor } from "../src/lib/seo.ts";
import { PUBLIC_SITE_URL } from "../src/lib/public-site.ts";

const tags = (head) =>
  Object.fromEntries(
    head.meta.filter((m) => m.property || m.name).map((m) => [m.property ?? m.name, m.content]),
  );

test("the Classroom share link carries the whole page address, query included", () => {
  const page = "https://terralens-kohl.vercel.app/lab/glaciers?guided=1&view=1";
  const share = new URL(classroomShareUrl(page));
  assert.equal(share.origin + share.pathname, "https://classroom.google.com/share");
  assert.equal(share.searchParams.get("url"), page);
  assert.deepEqual([...share.searchParams.keys()], ["url"]);
});

test("previews use absolute addresses, alt text and the page's own photo", () => {
  const head = tags(
    headFor({
      title: "Glacial landforms",
      description: "How ice shapes a valley.",
      path: "/lab/glaciers",
      image: "/photos/verified/aletsch-glacier.jpg",
      imageAlt: "A valley glacier",
    }),
  );
  assert.equal(head["og:url"], `${PUBLIC_SITE_URL}/lab/glaciers`);
  assert.equal(head["og:image"], `${PUBLIC_SITE_URL}/photos/verified/aletsch-glacier.jpg`);
  assert.equal(head["twitter:image"], head["og:image"]);
  assert.equal(head["og:image:alt"], "A valley glacier");
  assert.equal(head["twitter:image:alt"], "A valley glacier");
  assert.equal(head["twitter:card"], "summary_large_image");
  assert.equal(head["og:locale"], "en_US");
  // A photo's size is not known here, so none is claimed.
  assert.equal(head["og:image:width"], undefined);
});

test("pages without a photo get the default preview, with its size and alt text", () => {
  const head = tags(headFor({ title: "Explore", description: "All labs.", path: "/explore" }));
  assert.equal(head["og:image"], `${PUBLIC_SITE_URL}${DEFAULT_PREVIEW.src}`);
  assert.equal(head["og:image:alt"], DEFAULT_PREVIEW.alt);
  assert.equal(head["og:image:width"], "1200");
  assert.equal(head["og:image:height"], String(DEFAULT_PREVIEW.height));
  assert.ok(existsSync(`public${DEFAULT_PREVIEW.src}`));
  // The stated size is the file's real size (JPEG SOF0/SOF2 frame header).
  const jpeg = readFileSync(`public${DEFAULT_PREVIEW.src}`);
  let at = 2;
  while (
    at < jpeg.length &&
    !(jpeg[at] === 0xff && (jpeg[at + 1] === 0xc0 || jpeg[at + 1] === 0xc2))
  )
    at += 2 + jpeg.readUInt16BE(at + 2);
  assert.equal(jpeg.readUInt16BE(at + 5), DEFAULT_PREVIEW.height);
  assert.equal(jpeg.readUInt16BE(at + 7), DEFAULT_PREVIEW.width);
});

test("every lab's worksheet and slip preview photo exists", async () => {
  const { photoCards } = await import("./vite-card-data.mjs");
  const content = JSON.parse(readFileSync("src/lib/labs/content.json", "utf8")),
    labs = Array.isArray(content) ? content : (content.labs ?? Object.values(content)),
    cards = photoCards().lab;
  for (const { slug } of labs) {
    const card = cards[slug];
    assert.ok(card?.src, `${slug} has a cover photo`);
    assert.ok(card.alt?.length > 10, `${slug} cover has alt text`);
    assert.ok(existsSync(`public${card.src}`), `${slug}: ${card.src} exists`);
  }
});
