import test from "node:test";
import assert from "node:assert/strict";
import {
  CONCEPTS,
  CORE_IDEAS,
  NGSS_DIMENSIONS,
  PRACTICES,
  coreIdeaLabel,
  ngssUrl,
} from "../src/lib/labs/ngss.ts";
import { STANDARDS } from "../src/lib/labs/standards.ts";

const ngss = STANDARDS.filter((s) => s.framework === "NGSS").map((s) => s.id);

test("every NGSS expectation in the registry has its three dimensions, and nothing else does", () => {
  assert.deepEqual(Object.keys(NGSS_DIMENSIONS).sort(), [...ngss].sort());
});

test("practices and crosscutting concepts use NGSS's own names", () => {
  for (const [id, d] of Object.entries(NGSS_DIMENSIONS)) {
    assert.ok(PRACTICES.includes(d.practice), id);
    if (id === "NGSS HS-ESS3-2") assert.equal(d.concept, undefined, "HS-ESS3-2 has none");
    else assert.ok(CONCEPTS.includes(d.concept), id);
  }
});

test("each expectation rests on a core idea from its own discipline, and every idea is named", () => {
  for (const [id, d] of Object.entries(NGSS_DIMENSIONS)) {
    const family = id.match(/ESS\d/)[0];
    assert.ok(
      d.coreIdeas.some((c) => c.startsWith(`${family}.`)),
      `${id} has no ${family} core idea`,
    );
    for (const c of [...d.coreIdeas, ...d.secondary]) assert.ok(CORE_IDEAS[c], `${id}: ${c}`);
  }
  assert.equal(coreIdeaLabel("ESS2.D"), "ESS2.D Weather and Climate");
});

test("the practice follows the expectation's own verb", () => {
  // Spot checks against the wording on nextgenscience.org.
  const want = {
    "NGSS MS-ESS1-1": "Developing and Using Models", // "Develop and use a model…"
    "NGSS MS-ESS2-3": "Analyzing and Interpreting Data", // "Analyze and interpret data…"
    "NGSS MS-ESS2-5": "Planning and Carrying Out Investigations", // "Collect data…"
    "NGSS MS-ESS3-4": "Engaging in Argument from Evidence", // "Construct an argument…"
    "NGSS MS-ESS3-5": "Asking Questions and Defining Problems", // "Ask questions…"
    "NGSS HS-ESS1-4": "Using Mathematics and Computational Thinking", // "Use mathematical…"
    "NGSS HS-ESS2-2": "Analyzing and Interpreting Data", // "Analyze geoscience data…"
  };
  for (const [id, practice] of Object.entries(want))
    assert.equal(NGSS_DIMENSIONS[id].practice, practice, id);
});

test("each expectation links to its page on nextgenscience.org", () => {
  assert.equal(
    ngssUrl("NGSS MS-ESS2-2"),
    "https://www.nextgenscience.org/pe/ms-ess2-2-earths-systems",
  );
  assert.equal(
    ngssUrl("NGSS HS-ESS3-5"),
    "https://www.nextgenscience.org/pe/hs-ess3-5-earth-and-human-activity",
  );
  for (const id of ngss) assert.match(ngssUrl(id), /^https:\/\/www\.nextgenscience\.org\/pe\//);
  assert.equal(ngssUrl("APES 4.1"), undefined);
});
