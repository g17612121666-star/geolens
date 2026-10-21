import { useMemo } from "react";
import * as THREE from "three";
import { fbm, volcanoEdificeGeometry } from "./geo";

export function heightGeometry(
  fn: (x: number, y: number) => number,
  opts: {
    width: number;
    depth: number;
    segX: number;
    segZ: number;
    colorFn?: (h: number, slope?: number) => THREE.Color;
    vScale?: number;
  },
): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(opts.width, opts.depth, opts.segX, opts.segZ);
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const v = opts.vScale ?? 1;
  const dx = opts.width / Math.max(1, opts.segX);
  const dz = opts.depth / Math.max(1, opts.segZ);
  const heights = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h = fn(x, y) * v;
    heights[i] = h;
    pos.setZ(i, h);
  }
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const hTrue = heights[i]! / Math.max(0.001, v);
    const sL = fn(x - dx, y);
    const sR = fn(x + dx, y);
    const sD = fn(x, y - dz);
    const sU = fn(x, y + dz);
    const slope = Math.min(1.4, Math.hypot((sR - sL) / (2 * dx), (sU - sD) / (2 * dz)));
    if (opts.colorFn) {
      opts.colorFn(hTrue, slope).toArray(colors, i * 3);
    } else {
      landscapeColor(hTrue, slope).toArray(colors, i * 3);
    }
  }
  void c;
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Height + slope → rock / veg / snow / sand. Steep faces read as rock, not painted DEM bands. */
export function landscapeColor(h: number, slope = 0, snow = 1.55): THREE.Color {
  const c = new THREE.Color();
  if (slope > 0.85) return c.set("#6a6560");
  if (slope > 0.55 && h > 0.35) return c.set("#8a8478");
  if (h > snow) return c.set("#F4EFE6");
  if (h > snow * 0.72) return c.set("#c8c2b4");
  if (h > 0.55) return c.set("#7C9A6A");
  if (h > 0.22) return c.set("#6a8a58");
  if (h > 0.08) return c.set("#c4a574");
  return c.set("#2d4a38");
}

/** Lathe a 2D profile (x=radius, y=height) into a solid of revolution. */
export function latheGeometry(profile: [number, number][], segments: number): THREE.LatheGeometry {
  const pts = profile.map(([x, y]) => new THREE.Vector2(Math.max(0.001, x), y));
  const g = new THREE.LatheGeometry(pts, segments);
  g.computeVertexNormals();
  return g;
}

/**
 * Viscosity 0 = shield (Mauna Loa), 0.5 = strato (Fuji), 1 = steep plug.
 * Kept for hotspots/plates that still pass a profile. Prefer volcanoEdificeGeometry.
 */
export function volcanoProfile(visc: number): [number, number][] {
  const t = THREE.MathUtils.clamp(visc, 0, 1);
  const rBase = THREE.MathUtils.lerp(3.8, 0.95, t);
  const h = THREE.MathUtils.lerp(0.38, 2.55, t);
  const craterR = THREE.MathUtils.lerp(0.32, 0.14, t);
  const craterD = THREE.MathUtils.lerp(0.04, 0.26, t);
  const shoulder = THREE.MathUtils.lerp(0.78, 0.16, t);
  const mid = THREE.MathUtils.lerp(0.28, 0.52, t);
  return [
    [0.001, h - craterD],
    [craterR * 0.2, h - craterD * 0.88],
    [craterR * 0.55, h - craterD * 0.32],
    [craterR, h],
    [rBase * shoulder * 0.42, h * 0.82],
    [rBase * shoulder, h * mid],
    [rBase * 0.62, h * 0.22],
    [rBase * 0.86, h * 0.08],
    [rBase, 0.015],
    [rBase * 1.18, 0],
  ];
}

export function useVolcanoGeometry(visc: number, segments: number) {
  return useMemo(() => volcanoEdificeGeometry(visc, Math.max(48, segments)), [visc, segments]);
}

export function tubeGeometry(
  pts: [number, number, number][],
  radius: number,
  tubular = 64,
  radial = 10,
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, tubular, radius, radial, false);
  g.computeVertexNormals();
  return g;
}

void fbm;
