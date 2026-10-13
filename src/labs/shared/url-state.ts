import { useEffect } from "react";
import { useLabControls } from "@/lib/store/lab-controls";
import type { LabMeta } from '@/lib/labs/types';

const KEYS = ["t", "step", "labels", "explode", "slice", "speed", "geometryScale"] as const;

export function applyLabUrl(lab?:LabMeta) {
  const u = readLabUrl();
  const s = useLabControls.getState();
  if (u.t != null) s.setT(u.t);
  if (u.step != null) s.setStep(Math.max(0, Math.floor(u.step)));
  if (u.labels != null) s.setLabels(u.labels);
  if (u.explode != null) s.setExplode(u.explode);
  if (u.slice != null) s.setSlice(u.slice);
  if (u.speed != null) s.setSpeed(u.speed);
  if (u.layout) s.setLayout(u.layout);
  if(u.geometryScale!=null)s.setTrueScale(u.geometryScale);
  for (const [k, v] of Object.entries(u.params)) {
    const extra=lab?.controls.extra?.find(e=>e.key===k),toggle=lab?.controls.toggles?.find(e=>e.key===k);
    if(extra)s.setParam(k,Math.max(extra.min,Math.min(extra.max,v)));
    else if(toggle)s.setParam(k,v>.5?1:0);
  }
}

function write() {
  if (typeof window === "undefined") return;
  const s = useLabControls.getState();
  const q = new URLSearchParams();
  q.set("t", s.t.toFixed(3));
  q.set("step", String(s.step));
  q.set("labels", s.labels ? "1" : "0");
  if (s.explode > 0.01) q.set("explode", s.explode.toFixed(2));
  q.set("slice", s.slice.toFixed(2));
  if(s.trueScale)q.set('geometryScale','1');
  if (s.speed !== 1) q.set("speed", String(s.speed));
  if (s.layout === "projector") q.set("layout", "projector");
  for (const [k, v] of Object.entries(s.params)) {
    if (typeof v === "number" && Number.isFinite(v)) q.set(k, String(Number(v.toFixed(3))));
  }
  const next = `${window.location.pathname}?${q.toString()}`;
  const cur = `${window.location.pathname}${window.location.search}`;
  if (next !== cur) window.history.replaceState(null, "", next);
}

export function readLabUrl(): {
  t?: number;
  step?: number;
  labels?: boolean;
  explode?: number;
  slice?: number;
  speed?: number;
  geometryScale?:boolean;
  layout?: "hud" | "projector";
  params: Record<string, number>;
} {
  if (typeof window === "undefined") return { params: {} };
  const q = new URLSearchParams(window.location.search);
  const params: Record<string, number> = {};
  q.forEach((v, k) => {
    if ((KEYS as readonly string[]).includes(k) || k === "layout") return;
    const n = Number(v);
    if (Number.isFinite(n)) params[k] = n;
  });
  const num = (k: string) => {
    const v = q.get(k);
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    t: num("t"),
    step: num("step"),
    labels: q.has("labels") ? q.get("labels") !== "0" : undefined,
    explode: num("explode"),
    slice: num("slice"),
    speed: num("speed"),
    geometryScale:q.has('geometryScale')?q.get('geometryScale')==='1':undefined,
    layout: q.get("layout") === "projector" ? "projector" : undefined,
    params,
  };
}

/** Persist lab state into the query string. Hydrate from LabPlayer after defaults. */
export function useLabUrlSync() {
  useEffect(() => {
    let timer = 0;
    const unsub = useLabControls.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(write, 80);
    });
    return () => {
      window.clearTimeout(timer);
      unsub();
    };
  }, []);
}

export function labShareUrl(): string {
  if (typeof window === "undefined") return "";
  write();
  return window.location.href;
}
