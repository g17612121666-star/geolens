import * as THREE from "three";
import { jointDisplace } from "./geo";

/** Jointed crustal block — rock mass, not a raw box landform. */
export function jointedBlockGeometry(
  w: number,
  h: number,
  d: number,
  segs = 18,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, segs, Math.max(6, Math.floor(segs / 2)), segs);
  return jointDisplace(g, 0.016);
}

/** Unsorted till ridge — a dump of debris, not a green crate. */
export function tillRidgeGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, 22, 6, 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const edge = 1 - Math.abs(z) / (d * 0.55);
    const ny = y > 0 ? y * Math.max(0.15, edge) + Math.sin(x * 9) * 0.03 : y;
    pos.setXYZ(i, x + Math.sin(z * 7) * 0.04, ny, z + Math.sin(x * 5) * 0.03);
  }
  g.computeVertexNormals();
  return g;
}

/** Viscosity writes lava: runny = long thin sheet; sticky = short thick lobe. */
export function lavaSheetGeometry(visc: number): THREE.BufferGeometry {
  const t = THREE.MathUtils.clamp(visc, 0, 1);
  const len = THREE.MathUtils.lerp(3.6, 0.7, t);
  const w = THREE.MathUtils.lerp(1.85, 0.38, t);
  const h = THREE.MathUtils.lerp(0.04, 0.26, t);
  const g = new THREE.BoxGeometry(w, h, len, 22, 3, 32);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = (z + len / 2) / len;
    const spread = 1 - u * THREE.MathUtils.lerp(0.12, 0.62, t);
    const lobes = Math.sin(x * 8 + z * 3) * 0.05 * (1 - t);
    const channel = Math.sin(x * 3.2) * 0.03 * (1 - t) * (1 - u);
    pos.setX(i, x * spread + lobes);
    pos.setY(i, y + Math.sin(z * 6) * 0.01 + channel);
  }
  g.computeVertexNormals();
  return g;
}
