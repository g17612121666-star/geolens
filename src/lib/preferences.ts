/** Theme, display units and interface language (English, or Spanish where it is translated). */
import { create } from "zustand";
import type { UnitSystem } from "./units";
export type Theme = "system" | "light" | "dark";
export type Lang = "en" | "es";
const KEY = "geolens-preferences-v1";
export const usePreferences = create<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  /** Metric unless a reader picks US customary units for everyday quantities. */
  units: UnitSystem;
  /**
   * English unless a reader picks Spanish; the server always renders English. The page itself
   * stays `lang="en"` except while it shows a translated lab, and Spanish parts carry `lang="es"`.
   */
  lang: Lang;
  setTheme: (theme: Theme) => void;
  setUnits: (units: UnitSystem) => void;
  setLang: (lang: Lang) => void;
}>((set) => ({
  theme: "system",
  resolvedTheme: "dark",
  units: "metric",
  lang: "en",
  setTheme: (theme) => {
    set({ theme });
    save();
    applyPreferences();
  },
  setUnits: (units) => {
    set({ units });
    save();
  },
  setLang: (lang) => {
    set({ lang });
    save();
    applyPreferences();
  },
}));
function save() {
  const { theme, units, lang } = usePreferences.getState();
  try {
    localStorage.setItem(KEY, JSON.stringify({ theme, units, lang }));
  } catch {}
}
const savedTheme = (saved: { theme?: unknown }): Theme =>
  saved.theme === "light" || saved.theme === "dark" ? saved.theme : "system";
const savedUnits = (saved: { units?: unknown }): UnitSystem =>
  saved.units === "us" ? "us" : "metric";
const savedLang = (saved: { lang?: unknown }): Lang => (saved.lang === "es" ? "es" : "en");
function applyPreferences() {
  if (typeof document === "undefined") return;
  const { theme } = usePreferences.getState(),
    resolvedTheme =
      theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#0a0f13" : "#f6f3ec");
  usePreferences.setState({ resolvedTheme });
}
export function initialisePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    usePreferences.setState({
      theme: savedTheme(saved),
      units: savedUnits(saved),
      lang: savedLang(saved),
    });
  } catch {}
  document.documentElement.lang = "en";
  applyPreferences();
  const system = matchMedia("(prefers-color-scheme: dark)"),
    onChange = () => applyPreferences();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      const saved = JSON.parse(e.newValue ?? "{}") ?? {};
      usePreferences.setState({
        theme: savedTheme(saved),
        units: savedUnits(saved),
        lang: savedLang(saved),
      });
      applyPreferences();
    } catch {}
  };
  system.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    system.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}
export const preferenceBootScript = `try{var p=JSON.parse(localStorage.getItem('${KEY}')||'{}');var t=p.theme==='light'||p.theme==='dark'?p.theme:matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t}catch(e){}`;
