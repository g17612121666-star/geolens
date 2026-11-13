import type { LabMeta } from "./types";

export function defaultParams(lab: Pick<LabMeta, "controls">): Record<string, number> {
  const d: Record<string, number> = {};
  for (const e of lab.controls.extra ?? []) {
    if (e.default !== undefined) d[e.key] = e.default;
    else if (e.key === "tilt") d.tilt = 23.44;
    else if (e.key === "interval") d.interval = 10;
    else if (e.key === "discharge") d.discharge = 0.7;
    else if (e.key === "ageMa") d.ageMa = 0;
    else if (e.key === "abstraction") d.abstraction = 0;
    else d[e.key] = (e.min + e.max) / 2;
  }
  for (const t of lab.controls.toggles ?? []) {
    d[t.key] = t.defaultOn ? 1 : 0;
  }
  return d;
}
