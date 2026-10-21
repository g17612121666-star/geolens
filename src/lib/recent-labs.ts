import { useEffect, useState } from "react";

/** Recently opened labs, kept only in this browser. */
const KEY = "geolens-recent-labs-v1";
const MAX = 6;

function read(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}

export function recordLabVisit(slug: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify([slug, ...read().filter((s) => s !== slug)].slice(0, MAX)),
    );
  } catch {
    // Storage blocked: nothing to remember.
  }
}

export function forgetRecentLabs() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function useRecentLabs(): [string[], () => void] {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => setSlugs(read()), []);
  return [
    slugs,
    () => {
      forgetRecentLabs();
      setSlugs([]);
    },
  ];
}
