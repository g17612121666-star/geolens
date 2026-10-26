import { useMemo, useEffect } from "react";
import * as THREE from "three";
/** Closed scientific water volume; colors encode a stated variable. */
export function WaterPrism({
  points,
  depth = 1.6,
  color,
  colour2,
  opacity = 0.68,
}: {
  points: [number, number][];
  depth?: number;
  color: string;
  colour2?: string;
  opacity?: number;
}) {
  const signature = JSON.stringify(points);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(...p))),
      g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth / 2);
    if (colour2) {
      const p = g.attributes.position,
        c = new Float32Array(p.count * 3),
        left = Math.min(...points.map((p) => p[0])),
        width = Math.max(...points.map((p) => p[0])) - left,
        a = new THREE.Color(color),
        b = new THREE.Color(colour2);
      for (let i = 0; i < p.count; i++) {
        const v = a.clone().lerp(b, (p.getX(i) - left) / width);
        c.set([v.r, v.g, v.b], i * 3);
      }
      g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    }
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on signature (points as JSON) so a fresh points array with the same vertices does not rebuild the geometry
  }, [signature, depth, color, colour2]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color={colour2 ? "#ffffff" : color}
        vertexColors={!!colour2}
        transparent={opacity < 1}
        opacity={opacity}
        roughness={0.24}
        metalness={0}
        ior={1.333}
        clearcoat={0.5}
        clearcoatRoughness={0.2}
        envMapIntensity={0.35}
        depthWrite={opacity === 1}
      />
    </mesh>
  );
}
