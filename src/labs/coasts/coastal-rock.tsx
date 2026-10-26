import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { weatherCliff } from "./cliff-geometry";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";

const CHALK = cliffFaceGlsl({ rock: "chalk", beds: 3.2, bedOffset: 0.3 });

/** Chalk with flint bands on the cliff faces and arch roofs; grass on the upward-facing tops. */
export function CoastalRockMaterial({ top = "#7d9a57" }: { top?: string }) {
  return (
    <SectionMaterial glsl={CHALK} cliff={0.62} cacheKey="coast-chalk" color={top} roughness={0.9} />
  );
}

export function CoastalRock({
  points,
  depth = 1.8,
  position = [0, 0, 0],
  top,
}: {
  points: [number, number][];
  depth?: number;
  position?: [number, number, number];
  /** Color of upward-facing surfaces; grass by default, bare wave-washed rock for a stump. */
  top?: string;
}) {
  const signature = JSON.stringify(points);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p)));
    const g = new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    return weatherCliff(g);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on signature (points as JSON) so a fresh points array with the same vertices does not rebuild the geometry
  }, [signature, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <CoastalRockMaterial top={top} />
    </mesh>
  );
}
