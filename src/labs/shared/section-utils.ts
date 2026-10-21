import { useMemo } from "react";
import * as THREE from "three";

/** Keeps a stable uniforms object whose values are refreshed on every render. */
export function useSectionUniforms(values: Record<string, unknown>) {
  const uniforms = useMemo(
    () => Object.fromEntries(Object.keys(values).map((k) => [k, { value: values[k] }])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the uniforms object must stay stable; its values are refreshed below on every render
    [],
  ) as Record<string, { value: unknown }>;
  for (const k of Object.keys(values)) uniforms[k].value = values[k];
  return uniforms;
}

/** Adds the ground height above every vertex, so section shaders can measure depth below it. */
export function withSurfaceY<T extends THREE.BufferGeometry>(
  g: T,
  height: (x: number, z: number) => number,
) {
  const p = g.attributes.position,
    s = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) s[i] = height(p.getX(i), p.getZ(i));
  g.setAttribute("surfaceY", new THREE.BufferAttribute(s, 1));
  return g;
}
