import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex, normalize, queryWords, searchIndex, stem } from "../src/lib/site-search.ts";

test("plurals and singulars meet", () => {
  for (const [a, b] of [
    ["boundaries", "boundary"],
    ["coasts", "coast"],
    ["volcanoes", "volcano"],
    ["glaciers", "glacier"],
    ["beaches", "beach"],
  ])
    assert.equal(stem(a), stem(b), `${a} / ${b}`);
  // Words that only look plural stay as they are.
  for (const w of ["gas", "glass", "isostasis", "nimbus", "us"]) assert.equal(stem(w), w);
});

test("accents and apostrophes do not get in the way", () => {
  assert.equal(normalize("Hawaiʻi"), "hawaii");
  assert.equal(normalize("Eyjafjallajökull"), "eyjafjallajokull");
  assert.deepEqual(queryWords("Earth’s tilt"), ["earth", "tilt"]);
});

test("little words are dropped unless they are all there is", () => {
  assert.deepEqual(queryWords("what is a plate boundary"), ["plate", "boundary"]);
  assert.deepEqual(queryWords("the"), ["the"]);
});

const ITEMS = [
  { title: "Plate boundaries", body: "Where plates meet: ridges, trenches and transform faults." },
  { title: "Seasons", body: "Why the tilt of Earth's axis brings summer and winter." },
  { title: "Glaciers", body: "Ice flows downhill and carves U-shaped valleys." },
  { title: "Coasts", body: "Waves erode headlands; a plate of rock is a wave-cut platform." },
  { title: "Hawaiʻi hotspot track", body: "A chain of volcanoes over a mantle plume." },
];
const index = buildIndex(ITEMS, (i) => [
  { text: i.title, weight: 6 },
  { text: i.body, weight: 1 },
]);
const titles = (q) => searchIndex(index, q).map((i) => i.title);

test("every query word must match, in any order and form", () => {
  assert.deepEqual(titles("plate boundary"), ["Plate boundaries"]);
  assert.deepEqual(titles("boundary plate"), ["Plate boundaries"]);
  assert.deepEqual(titles("hawaii volcano"), ["Hawaiʻi hotspot track"]);
  assert.deepEqual(titles("glacier valley"), ["Glaciers"]);
  assert.deepEqual(titles("seasons glacier"), []);
});

test("a word start finds longer words", () => {
  assert.deepEqual(titles("glac"), ["Glaciers"]);
  assert.deepEqual(titles("tilt"), ["Seasons"]);
  // Two letters are too few to guess from.
  assert.deepEqual(titles("gl"), []);
});

test("title matches rank above body matches", () => {
  assert.deepEqual(titles("plate"), ["Plate boundaries", "Coasts"]);
  assert.deepEqual(titles(""), []);
});
