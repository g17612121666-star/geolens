import { useEffect, useMemo } from "react";
import * as THREE from "three";

type XY = [number, number];

/**
 * A flat energy band in the x–y plane: a polyline swept to a width proportional to its flux,
 * ending in an arrowhead. Bright stripes slide along it in the direction energy moves.
 */
export function FluxBand({
  path,
  width,
  color,
  z = 0,
  phase,
  opacity = 0.9,
}: {
  path: XY[];
  /** Full band width in scene units. */
  width: number;
  color: string;
  z?: number;
  /** Lab time; the stripes move with it. */
  phase: number;
  opacity?: number;
}) {
  const geometry = useMemo(() => bandGeometry(path, width), [path, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(color) },
      phase: { value: 0 },
      opacity: { value: opacity },
      length: { value: 1 },
    }),
    [color, opacity],
  );
  uniforms.phase.value = phase;
  uniforms.length.value = (geometry.userData.length as number) ?? 1;
  if (width < 0.004) return null;
  return (
    <mesh geometry={geometry} position={[0, 0, z]} renderOrder={2}>
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }
        `}
        fragmentShader={`
          uniform vec3 color; uniform float phase; uniform float opacity; uniform float length;
          varying vec2 vUv;
          void main(){
            // vUv.x runs along the band in scene units; vUv.y runs across it (0..1), 2 marks the arrowhead.
            float across = vUv.y > 1.5 ? 0.5 : vUv.y;
            float edge = smoothstep(0.0, 0.08, across) * smoothstep(1.0, 0.92, across);
            float stripe = 0.5 + 0.5 * sin((vUv.x * 7.0 - phase * 40.0));
            float glow = mix(0.78, 1.12, stripe * stripe);
            float rim = 1.0 - smoothstep(0.0, 0.16, min(across, 1.0 - across));
            vec3 c = color * glow + rim * 0.18;
            float fadeIn = smoothstep(0.0, 0.25, vUv.x);
            gl_FragColor = vec4(c, opacity * mix(0.55, 1.0, edge) * fadeIn);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  );
}

/** Sweep the path into a ribbon of constant width and append a triangular arrowhead. */
function bandGeometry(path: XY[], width: number) {
  const half = width / 2,
    head = Math.min(Math.max(width * 1.1, 0.14), 0.5),
    pts = path.map(([x, y]) => new THREE.Vector2(x, y));
  // Shorten the last segment so the arrowhead tip lands on the final point.
  const end = pts[pts.length - 1],
    prev = pts[pts.length - 2],
    dirEnd = end.clone().sub(prev).normalize(),
    shaftEnd = end.clone().addScaledVector(dirEnd, -head);
  const shaft = [...pts.slice(0, -1), shaftEnd];
  const positions: number[] = [],
    uvs: number[] = [],
    index: number[] = [];
  let along = 0;
  shaft.forEach((p, i) => {
    const before = shaft[Math.max(0, i - 1)],
      after = shaft[Math.min(shaft.length - 1, i + 1)],
      tangent = after.clone().sub(before).normalize(),
      normal = new THREE.Vector2(-tangent.y, tangent.x);
    if (i > 0) along += p.distanceTo(shaft[i - 1]);
    positions.push(p.x + normal.x * half, p.y + normal.y * half, 0);
    positions.push(p.x - normal.x * half, p.y - normal.y * half, 0);
    uvs.push(along, 0, along, 1);
    if (i > 0) {
      const a = (i - 1) * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  });
  // Arrowhead: wider than the band so its direction reads at a glance.
  const base = positions.length / 3,
    normalEnd = new THREE.Vector2(-dirEnd.y, dirEnd.x),
    wing = half + Math.max(width * 0.32, 0.05);
  positions.push(
    shaftEnd.x + normalEnd.x * wing,
    shaftEnd.y + normalEnd.y * wing,
    0,
    shaftEnd.x - normalEnd.x * wing,
    shaftEnd.y - normalEnd.y * wing,
    0,
    end.x,
    end.y,
    0,
  );
  uvs.push(along, 2, along, 2, along + head, 2);
  index.push(base, base + 1, base + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  geometry.userData.length = along + head;
  return geometry;
}
