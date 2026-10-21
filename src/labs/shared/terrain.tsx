import { useMemo } from "react";
import * as THREE from "three";
import { useRockNormal } from "./materials";
import { heightGeometry } from "./terrain-utils";

export function HeightField({
  fn,
  width,
  depth,
  segX,
  segZ,
  colorFn,
  position = [0, 0, 0],
  receiveShadow = true,
  vScale = 1,
}: {
  fn: (x: number, y: number) => number;
  width: number;
  depth: number;
  segX: number;
  segZ: number;
  colorFn?: (h: number, slope?: number) => THREE.Color;
  position?: [number, number, number];
  receiveShadow?: boolean;
  vScale?: number;
}) {
  const geom = useMemo(
    () => heightGeometry(fn, { width, depth, segX, segZ, colorFn, vScale }),
    [fn, width, depth, segX, segZ, colorFn, vScale],
  );
  const nrm = useRockNormal();
  const nrmScale = useMemo(() => new THREE.Vector2(0.55, 0.55), []);
  return (
    <mesh
      geometry={geom}
      rotation={[-Math.PI / 2, 0, 0]}
      position={position}
      receiveShadow={receiveShadow}
      castShadow
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.86}
        metalness={0.03}
        normalMap={nrm}
        normalScale={nrmScale}
      />
    </mesh>
  );
}
