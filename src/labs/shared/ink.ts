import { createContext, useContext } from "react";
import { usePreferences } from "@/lib/preferences";

/** True inside a lab drawn against the black of space rather than the page color. */
export const SpaceScene = createContext(false);

/**
 * The theme that guides and arrows are inked for. Against space they need light ink whatever
 * the page theme; elsewhere they follow it (darker ink on the daylight page).
 */
export function useInkTheme() {
  const theme = usePreferences((s) => s.resolvedTheme);
  return useContext(SpaceScene) ? "dark" : theme;
}
