import type * as THREE from "three";

/**
 * Scene labels keep their size in pixels while the model shrinks on a small screen or turns
 * with the camera, so two labels can land on top of each other. The layout hides the
 * less important of two colliding labels and shows it again once there is room, as map
 * apps do with place names. Zooming in or turning the model brings hidden labels back.
 */
export interface LabelSlot {
  /** Object at the label's anchor point in the scene. */
  anchor: THREE.Object3D | null;
  /** The element that is shown or hidden. */
  host: HTMLElement | null;
  /** Higher numbers win a collision; ties go to the label drawn first. */
  priority: number;
  order: number;
  /** Hidden behind the model or behind the camera. */
  occluded: boolean;
  /** Hidden because a more important label is in the way. */
  crowded: boolean;
  /** Width and height of the visible pill in CSS pixels, once measured. */
  size: [number, number] | null;
}

export function newLabelSlot(priority = 0): LabelSlot {
  return {
    anchor: null,
    host: null,
    priority,
    order: 0,
    occluded: false,
    crowded: false,
    size: null,
  };
}

/** Write a slot's visibility to its element; only changed values touch the DOM. */
export function showLabelSlot(slot: LabelSlot) {
  const el = slot.host;
  if (!el) return;
  const display = slot.occluded ? "none" : "",
    hidden = slot.crowded && !slot.occluded;
  if (el.style.display !== display) el.style.display = display;
  if (el.style.visibility !== (hidden ? "hidden" : "")) {
    el.style.visibility = hidden ? "hidden" : "";
    el.style.opacity = hidden ? "0" : "";
  }
}

type Box = [number, number, number, number];

/**
 * Greedy collision pass in screen pixels. Labels are taken in priority order; one is crowded
 * out when it overlaps a label already kept. A visible label tolerates a small overlap of
 * the rounded pill ends, and a crowded label needs a clear margin before it returns, so
 * labels do not flicker while the camera moves.
 */
export function crowdLabels(
  labels: { x: number; y: number; w: number; h: number; crowded: boolean }[],
): boolean[] {
  const kept: Box[] = [];
  return labels.map((l) => {
    const pad = l.crowded ? 6 : -3,
      left = l.x - l.w / 2,
      top = l.y - l.h / 2,
      right = l.x + l.w / 2,
      bottom = l.y + l.h / 2;
    const clash = kept.some(
      ([kl, kt, kr, kb]) =>
        Math.min(kr, right + pad) - Math.max(kl, left - pad) > 0 &&
        Math.min(kb, bottom + pad) - Math.max(kt, top - pad) > 0,
    );
    if (!clash) kept.push([left, top, right, bottom]);
    return clash;
  });
}
