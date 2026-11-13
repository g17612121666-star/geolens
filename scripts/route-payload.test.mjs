/**
 * Guards what each page downloads: walks a route's static imports (the code that loads with the
 * page) and fails if a page that only lists labs reaches the full lesson content again.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
// Static value imports and re-exports. Type-only imports disappear from the built code.
const IMPORT =
  /^\s*(?:import|export)\s+(?!type\s)([^;]*?)\s*from\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm;

function typeOnly(clause) {
  const named = clause.match(/^\{([^}]*)\}$/);
  return !!named && named[1].split(",").every((s) => !s.trim() || /^type\s/.test(s.trim()));
}

function resolveImport(from, spec) {
  if (spec.startsWith("virtual:")) return spec;
  const bare = spec.replace(/\?.*$/, "");
  const base = bare.startsWith("@/")
    ? join(root, "src", bare.slice(2))
    : bare.startsWith(".")
      ? resolve(dirname(from), bare)
      : null;
  if (!base) return null; // an npm package
  for (const file of [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

/** Every module a route loads with it: its static imports, followed through the source. */
function loadsWith(route) {
  const seen = new Set();
  const stack = [join(root, "src/routes/__root.tsx"), join(root, "src/routes", route)];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (file.startsWith("virtual:") || !/\.(tsx?|mjs)$/.test(file)) continue;
    for (const m of readFileSync(file, "utf8").matchAll(IMPORT)) {
      if (m[1] && typeOnly(m[1].trim())) continue;
      const target = resolveImport(file, m[2] ?? m[3]);
      if (target) stack.push(target);
    }
  }
  return new Set([...seen].map((f) => (f.startsWith("virtual:") ? f : relative(root, f))));
}

const CONTENT = "src/lib/labs/content.json";
const DEFINITIONS = "scripts/glossary-definitions.json";

test("pages that list labs load summaries, not every lesson", () => {
  for (const route of [
    "index.tsx",
    "explore.tsx",
    "teachers.index.tsx",
    "teachers.check.tsx",
    "practice.index.tsx",
    "realms.$realm.tsx",
    "glossary.tsx",
    "search.tsx",
  ]) {
    const modules = loadsWith(route);
    assert.ok(modules.has("src/lib/labs/catalog.ts") || route === "practice.index.tsx", route);
    assert.ok(!modules.has(CONTENT), `${route} loads all of content.json`);
    assert.ok(!modules.has("virtual:lab-quiz"), `${route} loads the Daily question bank`);
  }
});

test("a lab page loads its own lesson only", () => {
  const modules = loadsWith("lab.$slug.tsx");
  assert.ok(modules.has("virtual:lab-lessons"));
  for (const heavy of [CONTENT, "virtual:lab-search", "virtual:lab-quiz"]) {
    assert.ok(!modules.has(heavy), `the lab page loads ${heavy}`);
  }
});

test("only the glossary and search load every definition", () => {
  for (const route of ["index.tsx", "explore.tsx", "teachers.index.tsx", "lab.$slug.tsx"]) {
    assert.ok(!loadsWith(route).has(DEFINITIONS), `${route} loads every glossary definition`);
  }
  assert.ok(loadsWith("glossary.tsx").has(DEFINITIONS));
});

test("no page module imports content.json directly", () => {
  const all = loadsWith("search.tsx");
  for (const route of [
    "lab.$slug.tsx",
    "worksheet.$slug.tsx",
    "slip.$slug.tsx",
    "teachers.$slug.tsx",
  ]) {
    for (const m of loadsWith(route)) all.add(m);
  }
  assert.ok(!all.has(CONTENT));
});
