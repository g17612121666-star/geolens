import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { RockMaterial } from "./rock-material";
/** Closed extruded geological section, in the caller's explicitly declared coordinate scale. */
export function RockPrism({
  points,
  depth = 1.8,
  color = "#9a8b73",
  position = [0, 0, 0],
}: {
  points: [number, number][];
  depth?: number;
  color?: string;
  position?: [number, number, number];
}) {
  const signature = JSON.stringify(points);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p))),
      g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [signature, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <RockMaterial color={color} roughness={0.94} envMapIntensity={0.12} />
    </mesh>
  );
}
