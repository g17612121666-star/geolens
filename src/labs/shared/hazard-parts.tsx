import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { landscapeNoise, landscapeRandom } from "./landscape-noise";

/** Two-octave value noise, roughly 0–1. */
export const fbm = (x: number, z: number) =>
  0.62 * landscapeNoise(x, z) + 0.38 * landscapeNoise(x * 2.13 + 7.1, z * 2.13 - 3.4);

export type Building = {
  x: number;
  z: number;
  /** Footprint width, depth and wall height in scene units. */
  w: number;
  d: number;
  h: number;
  rot: number;
  wall: string;
  roof: string;
};

const WALLS = ["#e6dccb", "#d9cdb8", "#efe7da", "#cbbfae", "#ddd2c4"];
const ROOFS = ["#9c4a35", "#7d3f31", "#5d5f63", "#8a5a3c", "#a8573d"];

/** A loose settlement of small pitched-roof buildings around a centre. Deterministic. */
export function settlement(
  cx: number,
  cz: number,
  count: number,
  spread: number,
  size: number,
  seed = 1,
  inside: (x: number, z: number) => boolean = () => true,
): Building[] {
  const out: Building[] = [];
  for (let i = 0; out.length < count && i < count * 6; i++) {
    const a = i * 2.399 + seed,
      r = spread * Math.sqrt((i + 0.5) / count) * (0.75 + 0.5 * landscapeRandom(seed + i * 3.1)),
      x = cx + r * Math.cos(a),
      z = cz + r * Math.sin(a);
    if (!inside(x, z)) continue;
    const k = landscapeRandom(seed * 7 + i);
    out.push({
      x,
      z,
      w: size * (0.8 + 0.6 * k),
      d: size * (0.65 + 0.4 * landscapeRandom(i + seed * 3)),
      h: size * (0.55 + 0.5 * landscapeRandom(i * 1.7 + seed)),
      rot: Math.round(landscapeRandom(i * 5.3 + seed) * 4) * (Math.PI / 2) + 0.15 * Math.sin(i),
      wall: WALLS[i % WALLS.length],
      roof: ROOFS[(i * 3 + seed) % ROOFS.length],
    });
  }
  return out;
}

/**
 * Instanced walls and gabled roofs. `ground` gives the surface height; the optional `motion`
 * returns [lift, tiltX, tiltZ] so buildings can sway with an exaggerated ground motion.
 */
export function Buildings({
  items,
  ground,
  motion,
  revision = 0,
}: {
  items: Building[];
  ground: (x: number, z: number) => number;
  motion?: (x: number, z: number) => [number, number, number];
  revision?: number;
}) {
  const walls = useRef<THREE.InstancedMesh>(null),
    roofs = useRef<THREE.InstancedMesh>(null);
  const roofGeometry = useMemo(() => {
    // Triangular prism, ridge along x, base at y = 0, unit footprint.
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1);
    g.rotateZ(Math.PI / 2);
    g.rotateX(-Math.PI / 2);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    g.translate(0, -box.min.y, 0);
    g.scale(1, 1 / (box.max.y - box.min.y), 1 / (box.max.z - box.min.z));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => roofGeometry.dispose(), [roofGeometry]);
  useLayoutEffect(() => {
    const m = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((b, i) => {
      const [lift, tx, tz] = motion ? motion(b.x, b.z) : [0, 0, 0],
        y = ground(b.x, b.z) + lift;
      m.position.set(b.x, y + b.h / 2, b.z);
      m.rotation.set(tx, b.rot, tz);
      m.scale.set(b.w, b.h, b.d);
      m.updateMatrix();
      walls.current?.setMatrixAt(i, m.matrix);
      walls.current?.setColorAt(i, c.set(b.wall));
      m.position.set(b.x, y + b.h, b.z);
      m.scale.set(b.w * 1.12, b.h * 0.7, b.d * 1.15);
      m.updateMatrix();
      roofs.current?.setMatrixAt(i, m.matrix);
      roofs.current?.setColorAt(i, c.set(b.roof));
    });
    for (const mesh of [walls.current, roofs.current])
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
  }, [items, ground, motion, revision]);
  if (!items.length) return null;
  return (
    <group>
      <instancedMesh
        ref={walls}
        args={[undefined, undefined, items.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.86} />
      </instancedMesh>
      <instancedMesh
        ref={roofs}
        args={[roofGeometry, undefined, items.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>
    </group>
  );
}

/** Field patchwork colour for lowland farmland, with hedgerow-darkened borders. */
export function farmland(x: number, z: number, cell = 0.42) {
  const u = (x + 0.3 * Math.sin(z * 1.3)) / cell,
    v = (z + 0.2 * Math.sin(x * 1.1)) / (cell * 0.8),
    i = Math.floor(u),
    j = Math.floor(v),
    k = landscapeRandom(i * 31.7 + j * 17.3),
    fields = ["#7f9b52", "#93a95c", "#b3a863", "#6f8a48", "#a2a35a", "#88a157"],
    edge = Math.min(u - i, 1 - (u - i), v - j, 1 - (v - j));
  const colour = new THREE.Color(fields[Math.floor(k * fields.length)]);
  if (edge < 0.05) colour.multiplyScalar(0.72);
  return colour;
}
