import { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { FlowWaterMaterial } from "../shared/flow-water";
import { OCEAN, isothermX, seaSurfaceTemperature, sstColor } from "./sst";

/**
 * The ocean's top face as an idealized sea-surface temperature map, with an isotherm every
 * 1 °C: the warm pool in the west and, in the east, a cold tongue along the equator.
 */
export function SeaSurface({ west, east, trade }: { west: number; east: number; trade: number }) {
  const width = OCEAN.east - OCEAN.west;
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(width, OCEAN.depth, 100, 32);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position,
      colors = new Float32Array(p.count * 3),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      sstColor(seaSurfaceTemperature(p.getX(i), p.getZ(i), west, east), c);
      // The water material darkens its color by about a third for its ripples.
      colors.set([c.r * 1.4, c.g * 1.4, c.b * 1.4], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [west, east, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const isotherms = useMemo(() => {
    const lines: [number, number, number][][] = [],
      lo = Math.ceil(Math.min(west, east) + 0.05),
      hi = Math.floor(Math.max(west, east) - 0.05);
    for (let level = lo; level <= hi; level++) {
      let run: [number, number, number][] = [];
      for (let k = 0; k <= 40; k++) {
        const z = -OCEAN.depth / 2 + 0.02 + ((OCEAN.depth - 0.04) * k) / 40,
          x = isothermX(level, z, west, east);
        if (x === null) {
          if (run.length > 1) lines.push(run);
          run = [];
        } else run.push([x, 0.006, z]);
      }
      if (run.length > 1) lines.push(run);
    }
    return lines;
  }, [west, east]);
  return (
    <>
      <mesh geometry={geometry} renderOrder={1}>
        <FlowWaterMaterial
          color="#ffffff"
          vertexColors
          opacity={0.95}
          roughness={0.62}
          flow={[-trade, 0]}
          speed={0.3}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {isotherms.map((points, i) => (
        <Line key={i} points={points} color="#22323a" transparent opacity={0.5} lineWidth={1} />
      ))}
    </>
  );
}
