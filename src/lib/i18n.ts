import { createContext, useCallback, useContext } from "react";
import { usePreferences, type Lang } from "./preferences.ts";
import { ES } from "./i18n-es.ts";

export type { Lang };
export type Vars = Record<string, string | number>;

/**
 * An English interface string in the reader's language, with {name} placeholders filled. The
 * English text is the key, so a string without a Spanish translation simply stays in English.
 */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const base = lang === "es" ? (ES[text] ?? text) : text;
  return vars
    ? base.replace(/\{(\w+)\}/g, (m: string, k: string) => (k in vars ? String(vars[k]) : m))
    : base;
}

/**
 * Marks English text for translation where it is defined outside a component (a list of layers,
 * say); translate it with t() where it is shown. scripts/i18n.test.mjs checks these too.
 */
export const msg = <T extends string>(text: T): T => text;

const Scope = createContext<Lang | null>(null);
/**
 * Sets the language for part of a page: a lab without a Spanish translation stays wholly in
 * English, so its interface matches its content.
 */
export const LangScope = Scope.Provider;

/** The reader's interface language here. */
export function useLang(): Lang {
  const scoped = useContext(Scope);
  const preferred = usePreferences((s) => s.lang);
  return scoped ?? preferred;
}

/** `t(english, vars)` in the reader's language. */
export function useT() {
  const lang = useLang();
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}
