import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
Module._extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true } }).outputText, file);
const require = createRequire(import.meta.url);
const { GLOSSARY_PHOTO, TERM_THUMB } = require('../src/lib/photo-assign.ts');

test('geological inversion uses a structural geology image rather than an atmospheric inversion', () => {
  assert.equal(GLOSSARY_PHOTO.Inversion.src, TERM_THUMB['folds-faults--inversion'].src);
  assert.doesNotMatch(GLOSSARY_PHOTO.Inversion.src, /temperature|cruach/);
});

test('the surface trace of a weather front uses the cold-front image', () => {
  assert.match(GLOSSARY_PHOTO['Surface trace'].src, /cold-front/);
});
