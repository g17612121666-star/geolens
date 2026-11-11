import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES } from "../src/lib/cases.ts";
import { FIELD_TRIPS } from "../src/lib/field-trips.ts";
import { PUBLIC_SITE_URL } from "../src/lib/public-site.ts";

const sitemap = readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const robots = readFileSync(new URL("../public/robots.txt", import.meta.url), "utf8");
const content = JSON.parse(
  readFileSync(new URL("../src/lib/labs/content.json", import.meta.url), "utf8"),
);
const realms = JSON.parse(
  readFileSync(new URL("../src/lib/labs/realms.json", import.meta.url), "utf8"),
);
const urls = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

test("every sitemap address is on the public site", () => {
  assert.ok(urls.size > 100);
  for (const u of urls) assert.ok(u.startsWith(PUBLIC_SITE_URL + "/"), u);
  assert.match(robots, new RegExp(`Sitemap: ${PUBLIC_SITE_URL}/sitemap\\.xml`));
});

test("the sitemap lists every lab, teacher guide, case study, subject and field trip", () => {
  const missing = [];
  const want = (path) => urls.has(PUBLIC_SITE_URL + path) || missing.push(path);
  for (const lab of content.labs) {
    want(`/lab/${lab.slug}`);
    want(`/teachers/${lab.slug}`);
  }
  for (const c of CASES) want(`/case/${c.slug}`);
  for (const r of realms) want(`/realms/${r.slug}`);
  for (const t of FIELD_TRIPS) want(`/trips/${t.slug}`);
  assert.deepEqual(missing, [], "add these pages to public/sitemap.xml");
});
