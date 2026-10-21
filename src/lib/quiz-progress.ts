import { useCallback, useEffect, useState } from "react";

/** Quiz answers are kept only in this browser: no account, no server. */
const KEY = "geolens-quiz-v1";
type Store = Record<string, Record<number, number>>;
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
    // Private windows or blocked storage: answers still work for this visit.
  }
  listeners.forEach((fn) => fn());
}

/** Picked answers for one lab, persisted across visits on this device. */
export function useQuizAnswers(slug: string) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  useEffect(() => {
    const load = () => setPicked(read()[slug] ?? {});
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [slug]);
  const pick = useCallback(
    (question: number, choice: number) => {
      const store = read();
      store[slug] = { ...(store[slug] ?? {}), [question]: choice };
      write(store);
    },
    [slug],
  );
  const reset = useCallback(() => {
    const store = read();
    delete store[slug];
    write(store);
  }, [slug]);
  return { picked, pick, reset };
}

/** Number of questions answered correctly per lab, for progress marks elsewhere. */
export function useQuizScores(answerKeys: Record<string, number[]>) {
  const [scores, setScores] = useState<Record<string, { correct: number; total: number }>>({});
  useEffect(() => {
    const load = () => {
      const store = read();
      const out: Record<string, { correct: number; total: number }> = {};
      for (const [slug, picked] of Object.entries(store)) {
        const key = answerKeys[slug];
        if (!key) continue;
        out[slug] = {
          correct: key.filter((answer, i) => picked[i] === answer).length,
          total: key.length,
        };
      }
      setScores(out);
    };
    load();
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [answerKeys]);
  return scores;
}
