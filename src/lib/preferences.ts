/** Theme preference only: Geolens has a single English interface. */
import { create } from "zustand";
export type Theme = "system" | "light" | "dark";
const KEY = "geolens-preferences-v1";
export const usePreferences = create<{
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}>((set) => ({
  theme: "system",
  resolvedTheme: "dark",
  setTheme: (theme) => {
    set({ theme });
    try {
      localStorage.setItem(KEY, JSON.stringify({ theme }));
    } catch {}
    applyPreferences();
  },
}));
function applyPreferences() {
  if (typeof document === "undefined") return;
  const { theme } = usePreferences.getState(),
    resolvedTheme =
      theme === "system"
        ? matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
  document.documentElement.lang = "en";
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", resolvedTheme === "dark" ? "#07090c" : "#f4f6f3");
  usePreferences.setState({ resolvedTheme });
}
export function initialisePreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    usePreferences.setState({
      theme: ["light", "dark"].includes(saved.theme) ? saved.theme : "system",
    });
  } catch {}
  applyPreferences();
  const system = matchMedia("(prefers-color-scheme: dark)"),
    onChange = () => applyPreferences();
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    try {
      const saved = JSON.parse(e.newValue ?? "{}");
      usePreferences.setState({
        theme: ["light", "dark"].includes(saved.theme) ? saved.theme : "system",
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
