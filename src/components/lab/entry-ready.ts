import { createContext, useContext } from "react";

export const EntryReady = createContext<((ready: boolean) => void) | null>(null);
export function useEntryReady() {
  return useContext(EntryReady);
}
