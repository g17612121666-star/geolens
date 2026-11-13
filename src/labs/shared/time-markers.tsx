import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useLabFrame } from "@/labs/tick";
import { useLabControls } from "@/lib/store/lab-controls";

/**
 * Small markers carried along by lab time (tracers on a plate, water in a stream). They are moved
 * every drawn frame, so the scene that owns them does not re-render while the lab plays.
 * `at(t, i)` gives marker i's position at lab time t.
 */
export function TimeMarkers({
  count,
  at,
  radius = 0.035,
  color = "#e9c885",
  detail = [16, 12],
}: {
  count: number;
  at: (t: number, i: number) => [number, number, number];
  radius?: number;
  color?: string;
  /** Sphere width and height segments. */
  detail?: [number, number];
}) {
  const [widthSegments, heightSegments] = detail;
  const geometry = useMemo(
    () => new THREE.SphereGeometry(radius, widthSegments, heightSegments),
    [radius, widthSegments, heightSegments],
  );
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color }), [color]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const markers = useRef<(THREE.Mesh | null)[]>([]);
  useLabFrame((t) => {
    for (let i = 0; i < count; i++) markers.current[i]?.position.set(...at(t, i));
  });
  // Start in place, so the camera fit and the first frame see the markers where they belong.
  const start = useLabControls.getState().t;
  return Array.from({ length: count }, (_, i) => (
    <mesh
      key={i}
      geometry={geometry}
      material={material}
      position={at(start, i)}
      ref={(mesh) => {
        markers.current[i] = mesh;
      }}
    />
  ));
}
