import { createContext, useContext } from "react";
import * as THREE from "three";
import { crowdLabels, showLabelSlot, type LabelSlot } from "./label-crowding";

export class LabelStore {
  private slots = new Set<LabelSlot>();
  private next = 0;
  private observer: ResizeObserver | null = null;
  private observed = new Map<Element, LabelSlot>();
  private point = new THREE.Vector3();
  private view = new THREE.Matrix4();
  constructor(readonly invalidate: () => void) {}

  add(slot: LabelSlot) {
    slot.order = this.next++;
    this.slots.add(slot);
    this.invalidate();
    return () => {
      this.slots.delete(slot);
      this.invalidate();
    };
  }

  /** Track the size of a label's visible pill without forcing a layout on every frame. */
  measure(el: HTMLElement, slot: LabelSlot) {
    if (typeof ResizeObserver === "undefined") {
      slot.size = [el.offsetWidth, el.offsetHeight];
      return;
    }
    this.observer ??= new ResizeObserver((records) => {
      for (const record of records) {
        const owner = this.observed.get(record.target),
          box = record.borderBoxSize?.[0];
        if (!owner) continue;
        const target = record.target as HTMLElement;
        owner.size = box
          ? [box.inlineSize, box.blockSize]
          : [target.offsetWidth, target.offsetHeight];
      }
      this.invalidate();
    });
    this.observed.set(el, slot);
    this.observer.observe(el);
    // Ref cleanup: stop watching this element only, even if its replacement mounted first.
    return () => {
      this.observer?.unobserve(el);
      this.observed.delete(el);
    };
  }

  update(camera: THREE.Camera, width: number, height: number) {
    const ready: {
      slot: LabelSlot;
      x: number;
      y: number;
      w: number;
      h: number;
      crowded: boolean;
    }[] = [];
    camera.updateMatrixWorld();
    // The orbit controls can move the camera after this pass within a frame; ask for one more
    // frame whenever the view changed, so the resting view is always checked.
    if (!this.view.equals(camera.matrixWorld)) {
      this.view.copy(camera.matrixWorld);
      this.invalidate();
    }
    for (const slot of this.slots) {
      const { anchor, size } = slot;
      if (!anchor || !slot.host?.isConnected || slot.occluded || !size || size[0] <= 0) {
        if (slot.crowded) {
          slot.crowded = false;
          showLabelSlot(slot);
        }
        continue;
      }
      anchor.updateWorldMatrix(true, false);
      const p = this.point.setFromMatrixPosition(anchor.matrixWorld).project(camera);
      if (p.z > 1) continue;
      ready.push({
        slot,
        x: ((p.x + 1) / 2) * width,
        y: ((1 - p.y) / 2) * height,
        w: size[0],
        h: size[1],
        crowded: slot.crowded,
      });
    }
    ready.sort((a, b) => b.slot.priority - a.slot.priority || a.slot.order - b.slot.order);
    crowdLabels(ready).forEach((crowded, i) => {
      const { slot } = ready[i];
      if (slot.crowded === crowded) return;
      slot.crowded = crowded;
      showLabelSlot(slot);
    });
  }

  dispose() {
    this.observer?.disconnect();
    this.observed.clear();
    this.slots.clear();
  }
}

export const LabelLayoutContext = createContext<LabelStore | null>(null);

export function useLabelLayout() {
  return useContext(LabelLayoutContext);
}
