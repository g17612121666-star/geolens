import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { glacialNoise } from "./geometry";
const centres = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
/** Tapered, convex ice veneer follows the cirque floor; no rectangular ribbon ends. */
function CirqueIce({ angle }: { angle: number }) {
  const geometry = useMemo(() => {
    const p: number[] = [],
      uv: number[] = [],
      indices: number[] = [];
    for (let j = 0; j <= 48; j++) {
      const u = j / 48,
        r = 0.72 + u * 1.26,
        w = 0.43 * Math.sin(Math.PI * u) ** 0.55;
      for (let k = 0; k <= 20; k++) {
        const v = k / 10 - 1,
          q = w * v,
          x = r * Math.cos(angle) - q * Math.sin(angle),
          z = r * Math.sin(angle) + q * Math.cos(angle);
        p.push(x, cirqueHeight(x, z) + 0.009 + 0.09 * Math.sin(Math.PI * u) * (1 - v * v), z);
        uv.push(u, k / 20);
        if (j < 48 && k < 20) {
          const n = j * 21 + k;
          indices.push(n, n + 21, n + 1, n + 1, n + 21, n + 22);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }, [angle]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <meshPhysicalMaterial
        color="#c7dfe3"
        roughness={0.43}
        clearcoat={0.12}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
export function cirqueHeight(x: number, z: number) {
  const radius = Math.hypot(x, z),
    angle = Math.atan2(z, x);
  let h = 0.25 + Math.max(0, 2.9 - radius) * (0.73 + 0.12 * Math.cos(angle * 3 + 0.25));
  for (const a of centres) {
    const along = x * Math.cos(a) + z * Math.sin(a),
      across = -x * Math.sin(a) + z * Math.cos(a);
    if (along > 0.15) {
      const headwall = 0.45 + 0.86 * (Math.max(0, 1.2 - along) / 0.83) ** 4;
      const floor = Math.max(0.25, headwall - 0.075 * Math.max(0, along - 1.2));
      h = Math.min(
        h,
        floor + 0.91 * (Math.abs(across) / (0.57 + 0.14 * Math.max(0, along - 1.1))) ** 4,
      );
    }
  }
  // Small jointed ribs break the perfect cone while keeping three open glacial hollows.
  const ribs =
    0.13 * (glacialNoise(x * 6 + glacialNoise(z, x) * 2, z * 7) - 0.5) +
    0.05 * (glacialNoise(x * 17, z * 19) - 0.5);
  // Hummocky moraine and meltwater hollows on the apron beyond the cirques.
  const apron =
    0.035 * (glacialNoise(x * 2.6 + 9, z * 2.6) - 0.5) + 0.015 * (glacialNoise(x * 7, z * 7) - 0.5);
  return Math.max(0.25 + apron, h + ribs * Math.min(1, Math.max(0, h - 0.55) * 2));
}
export function Cirques({ ice, t }: { ice: boolean; t: number }) {
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const n = glacialNoise(x * 3, z * 3),
        c = new THREE.Color("#7a8f58").lerp(
          new THREE.Color("#8c8a6c"),
          glacialNoise(x * 5 + 2, z * 5) * 0.6,
        );
      c.lerp(new THREE.Color("#8a8a78"), THREE.MathUtils.smoothstep(y, 0.4, 0.8));
      c.lerp(new THREE.Color("#a29d92"), THREE.MathUtils.smoothstep(y, 0.9, 1.3));
      // Snow lingers on gentler high ground and in the shaded cirque floors.
      c.lerp(new THREE.Color("#eef2f3"), THREE.MathUtils.smoothstep(y, 1.45 + 0.25 * n, 1.75));
      return c.getStyle();
    },
    [],
  );
  return (
    <>
      <GeomorphicTerrain
        height={cirqueHeight}
        colour={colour}
        width={6}
        depth={6}
        resolution={220}
        base={-0.1}
        cliff={0.58}
        mottle={0.08}
        section={{ rock: "granite", soil: 0.015, regolith: 0.05, soilTone: "thin" }}
      />
      {centres.map((a, i) => {
        const path = Array.from({ length: 41 }, (_, j) => {
          const r = 0.8 + (j / 40) * 0.95,
            x = r * Math.cos(a),
            z = r * Math.sin(a);
          return [x, cirqueHeight(x, z) + 0.11, z] as [number, number, number];
        });
        return (
          <group key={i}>
            {ice && <CirqueIce angle={a} />}{" "}
            {ice &&
              Array.from({ length: 5 }, (_, k) => {
                const p = path[Math.floor(((t + k / 5) % 1) * 40)];
                return (
                  <mesh key={k} position={p}>
                    <sphereGeometry args={[0.025, 12, 8]} />
                    <meshBasicMaterial color="#e7ccb1" />
                  </mesh>
                );
              })}
          </group>
        );
      })}
      <Tag
        pos={[0, 2.7, 0]}
        text="Horn"
        note="Several cirques eroding back into one summit leave a pyramidal peak. This three-cirque form is an invented example, not a surveyed mountain."
        occlude={false}
      />
      <Tag
        pos={[-1.55, 1.7, 0]}
        text="Arête"
        note="A narrow ridge left between neighbouring cirques or glacial valleys. It is rock that remains, not a wall of deposited debris."
        occlude={false}
      />
      <Tag
        pos={[1.5, 0.75, 0.5]}
        text="Cirque"
        note="A bowl-shaped hollow with a steep headwall and a gentler floor, eroded at the head of a glacier. The thin ice and moving symbols show only the flow direction, not ice thickness or speed."
        occlude={false}
      />
    </>
  );
}
