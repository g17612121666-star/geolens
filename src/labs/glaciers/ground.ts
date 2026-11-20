import * as THREE from "three";

/** Ground colors shared by the valley and the cirques. */
export const ROCK = new THREE.Color("#6d675d"),
  POLISHED = new THREE.Color("#858075"),
  MEADOW = new THREE.Color("#7a9255"),
  TILL = new THREE.Color("#8d8577"),
  OUTWASH = new THREE.Color("#a39b88"),
  SNOW = new THREE.Color("#eef2f4");

/**
 * Steepness of the ground (the tangent of its slope angle) and its curvature (> 0 in hollows and
 * gullies, < 0 on ribs and crests).
 */
export function shape(height: (x: number, z: number) => number, x: number, z: number) {
  const d = 0.03,
    h = height(x, z),
    e = height(x + d, z),
    w = height(x - d, z),
    s = height(x, z + d),
    n = height(x, z - d);
  return {
    gradient: Math.hypot(e - w, s - n) / (2 * d),
    curvature: (e + w + s + n - 4 * h) / (d * d),
  };
}

/**
 * Gray gneiss for the steep walls and the cut faces: faint foliation, darker streaks where water
 * runs down the faces, and joints.
 */
export const GNEISS = `
  vec2 q = vec2(p.x + p.z, p.y);
  float m = sNoise(q * 3.) * .5 + sNoise(q * 9. + 2.) * .3 + g * .2;
  vec3 c = mix(vec3(.46, .44, .41), vec3(.63, .61, .57), m);
  c *= 1. - .14 * smoothstep(.6, .9, sNoise(vec2(q.x * 7., q.y * .9)));
  float j = fract(q.x * 3. + .5 * sNoise(vec2(q.y * 2., 1.)));
  c *= mix(.86, 1., smoothstep(0., .03, min(j, 1. - j)));
  return c;`;
