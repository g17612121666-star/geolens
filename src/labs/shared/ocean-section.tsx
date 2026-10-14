import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { RockMaterial } from "./rock-material";
import { FlowWaterMaterial } from "./flow-water";
type Sample = { x: number; bed: number; surface: number };
/** Fixed topology: update vertices without triangulating a new extruded shape each frame. */
function useSection(samples: Sample[], top: "bed" | "surface", bottom: "bed" | number) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      quads = 4 * (samples.length - 1) + 2;
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(quads * 12), 3).setUsage(THREE.DynamicDrawUsage),
    );
    g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(quads * 8), 2));
    const indices: number[] = [];
    for (let q = 0; q < quads; q++) {
      const v = q * 4;
      indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    }
    g.setIndex(indices);
    return g;
  }, [samples.length]);
  useLayoutEffect(() => {
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv;
    let offset = 0;
    const quad = (points: number[][]) => {
      for (const v of points) {
        p.setXYZ(offset, v[0], v[1], v[2]);
        uv.setXY(offset, v[0] + v[2], v[1]);
        offset++;
      }
    };
    const low = (s: Sample) => (typeof bottom === "number" ? bottom : s[bottom]);
    for (let i = 0; i < samples.length - 1; i++) {
      const a = samples[i],
        b = samples[i + 1],
        al = low(a),
        bl = low(b),
        ah = a[top],
        bh = b[top];
      quad([
        [a.x, al, 0.9],
        [b.x, bl, 0.9],
        [b.x, bh, 0.9],
        [a.x, ah, 0.9],
      ]);
      quad([
        [b.x, bl, -0.9],
        [a.x, al, -0.9],
        [a.x, ah, -0.9],
        [b.x, bh, -0.9],
      ]);
      quad([
        [a.x, ah, 0.9],
        [b.x, bh, 0.9],
        [b.x, bh, -0.9],
        [a.x, ah, -0.9],
      ]);
      quad([
        [a.x, al, -0.9],
        [b.x, bl, -0.9],
        [b.x, bl, 0.9],
        [a.x, al, 0.9],
      ]);
    }
    const a = samples[0],
      b = samples[samples.length - 1];
    quad([
      [a.x, low(a), -0.9],
      [a.x, low(a), 0.9],
      [a.x, a[top], 0.9],
      [a.x, a[top], -0.9],
    ]);
    quad([
      [b.x, low(b), 0.9],
      [b.x, low(b), -0.9],
      [b.x, b[top], -0.9],
      [b.x, b[top], 0.9],
    ]);
    p.needsUpdate = true;
    uv.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
  }, [geometry, samples, top, bottom]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}
/** Closed water and bed sections. Height and horizontal units are supplied by the experiment. */
export function OceanSection({
  samples,
  base,
  colour = "#448098",
}: {
  samples: Sample[];
  base: number;
  colour?: string;
}) {
  const bed = useSection(samples, "bed", base),
    water = useSection(samples, "surface", "bed");
  return (
    <>
      <mesh geometry={bed}>
        <RockMaterial color="#8a806c" roughness={1} envMapIntensity={0.1} />
      </mesh>
      <mesh geometry={water}>
        <meshPhysicalMaterial
          color={colour}
          transparent
          opacity={0.23}
          roughness={0.52}
          envMapIntensity={0.08}
          depthWrite={false}
        />
      </mesh>
      <OceanSurface points={samples.map((p) => [p.x, p.surface])} depth={1.8} color={colour} />
      <Line points={samples.map((p) => [p.x, p.surface, 0.91])} color="#9cd3df" lineWidth={2} />
    </>
  );
}

/** Optical ripples sit on the modelled free surface; they do not add invented wave displacement. */
export function OceanSurface({
  points,
  depth = 1.6,
  color = "#4c8797",
  flow = [1, 0],
  opacity = 0.63,
}: {
  points: [number, number][];
  depth?: number;
  color?: string;
  flow?: [number, number];
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      position = new Float32Array(points.length * 6),
      uv = new Float32Array(points.length * 4),
      index: number[] = [];
    points.forEach(([x, y], i) => {
      position.set([x, y, -depth / 2, x, y, depth / 2], i * 6);
      uv.set([(i / (points.length - 1)) * 3, 0, (i / (points.length - 1)) * 3, 1], i * 4);
      if (i < points.length - 1) {
        const j = i * 2;
        index.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
      }
    });
    g.setAttribute("position", new THREE.BufferAttribute(position, 3));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setIndex(index);
    g.computeVertexNormals();
    return g;
  }, [points, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <FlowWaterMaterial
        color={color}
        opacity={opacity}
        flow={flow}
        speed={0.3}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}
