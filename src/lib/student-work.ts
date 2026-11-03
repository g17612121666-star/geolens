import { useCallback, useEffect, useState } from "react";

/**
 * A student's written work for each lab (prediction and claim–evidence–reasoning), kept only in
 * this browser. Nothing is sent anywhere; the hand-in slip and code are made from it on demand.
 */
const KEY = "geolens-work-v1";
const NAME_KEY = "geolens-student-name";

export type LabWork = {
  prediction?: string;
  claim?: string;
  evidence?: string;
  reasoning?: string;
};
type Store = Record<string, LabWork>;
const listeners = new Set<() => void>();

function read(): Store {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return raw && typeof raw === "object" ? (raw as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // Private windows or blocked storage: the work still lasts for this visit.
  }
  listeners.forEach((fn) => fn());
}

export function useStudentWork(slug: string) {
  const [work, setWork] = useState<LabWork>({});
  useEffect(() => {
    const load = () => setWork(read()[slug] ?? {});
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [slug]);
  const update = useCallback(
    (changes: Partial<LabWork>) => {
      const store = read();
      store[slug] = { ...(store[slug] ?? {}), ...changes };
      write(store);
    },
    [slug],
  );
  const clear = useCallback(() => {
    const store = read();
    delete store[slug];
    write(store);
  }, [slug]);
  return { work, update, clear };
}

/** The name a student types for their slip; stored on this device only, never in the code. */
export function useStudentName() {
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      setName(localStorage.getItem(NAME_KEY) ?? "");
    } catch {
      /* storage blocked */
    }
  }, []);
  const save = useCallback((value: string) => {
    setName(value);
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch {
      /* storage blocked */
    }
  }, []);
  return [name, save] as const;
}

/** A written answer counts once it has a few words in it. */
export function written(text?: string) {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length >= 3;
}
