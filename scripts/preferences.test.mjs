import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
Module._extensions['.ts'] = (m, file) => m._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, resolveJsonModule: true, esModuleInterop: true } }).outputText, file);
const require = createRequire(import.meta.url);
const pref = require('../src/lib/preferences.ts');
const KEY = 'geolens-preferences-v1';

function environment(saved = {}, initialDark = false) {
  const original = new Map(['document', 'localStorage', 'matchMedia', 'window'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  let dark = initialDark, stored = JSON.stringify(saved), systemListener, storageListener;
  const root = { dataset: {}, style: {}, lang: 'zh-CN' };
  const media = {
    get matches() { return dark; },
    addEventListener: (event, listener) => { assert.equal(event, 'change'); systemListener = listener; },
    removeEventListener: (event, listener) => { assert.equal(event, 'change'); assert.equal(listener, systemListener); systemListener = undefined; },
  };
  globalThis.document = { documentElement: root, querySelector: () => ({ setAttribute() {} }) };
  globalThis.localStorage = { getItem: key => key === KEY ? stored : null, setItem: (key, value) => { assert.equal(key, KEY); stored = value; } };
  globalThis.matchMedia = () => media;
  globalThis.window = {
    addEventListener: (event, listener) => { assert.equal(event, 'storage'); storageListener = listener; },
    removeEventListener: (event, listener) => { assert.equal(event, 'storage'); assert.equal(listener, storageListener); storageListener = undefined; },
  };
  pref.usePreferences.setState({ theme: 'system', resolvedTheme: 'dark' });
  let dispose;
  return {
    root,
    initialize() { dispose = pref.initialisePreferences(); },
    get stored() { return JSON.parse(stored); },
    setSystemDark(value) { dark = value; systemListener(); },
    storage(value, key = KEY) { storageListener({ key, newValue: value === null ? null : typeof value === 'string' ? value : JSON.stringify(value) }); },
    dispose() { dispose(); dispose = undefined; assert.equal(systemListener, undefined); assert.equal(storageListener, undefined); },
    restore() { if (dispose) dispose(); for (const [key, descriptor] of original) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } },
  };
}

test('a saved theme is restored while a legacy locale cannot change the English interface', () => {
  const env = environment({ locale: 'zh', theme: 'dark' });
  try {
    env.initialize();
    assert.equal(env.root.lang, 'en');
    assert.equal(env.root.dataset.theme, 'dark');
    assert.equal(env.root.style.colorScheme, 'dark');
    pref.usePreferences.getState().setTheme('light');
    assert.deepEqual(env.stored, { theme: 'light' });
    assert.equal(env.root.dataset.theme, 'light');
    assert.equal(env.root.lang, 'en');
  } finally { env.restore(); }
});

test('system theme follows the operating system while an explicit theme stays selected', () => {
  const env = environment({ theme: 'system' });
  try {
    env.initialize();
    assert.equal(env.root.dataset.theme, 'light');
    env.setSystemDark(true);
    assert.equal(env.root.dataset.theme, 'dark');
    pref.usePreferences.getState().setTheme('light');
    env.setSystemDark(true);
    assert.equal(env.root.dataset.theme, 'light');
    pref.usePreferences.getState().setTheme('system');
    assert.equal(env.root.dataset.theme, 'dark');
    env.setSystemDark(false);
    assert.equal(env.root.dataset.theme, 'light');
    assert.deepEqual(env.stored, { theme: 'system' });
  } finally { env.restore(); }
});

test('cross-tab changes apply only the current storage key, retain English and clean up both listeners', () => {
  const env = environment({ theme: 'light' }, true);
  try {
    env.initialize();
    env.storage({ locale: 'zh', theme: 'dark' }, 'unrelated-preferences');
    assert.equal(env.root.dataset.theme, 'light');
    env.storage({ locale: 'zh', theme: 'dark' });
    assert.equal(env.root.dataset.theme, 'dark');
    assert.equal(env.root.lang, 'en');
    env.storage({ locale: 'zh', theme: 'light' });
    assert.equal(env.root.dataset.theme, 'light');
    env.storage('{not valid JSON');
    assert.equal(env.root.dataset.theme, 'light');
    env.storage(null);
    assert.equal(pref.usePreferences.getState().theme, 'system');
    assert.equal(env.root.dataset.theme, 'dark');
    assert.equal(env.root.lang, 'en');
    env.dispose();
  } finally { env.restore(); }
});

test('blocked browser storage still allows theme selection and an English interface', () => {
  const env = environment({}, true);
  try {
    globalThis.localStorage = { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } };
    env.initialize();
    assert.equal(env.root.dataset.theme, 'dark');
    pref.usePreferences.getState().setTheme('light');
    assert.equal(env.root.dataset.theme, 'light');
    assert.equal(env.root.lang, 'en');
  } finally { env.restore(); }
});
