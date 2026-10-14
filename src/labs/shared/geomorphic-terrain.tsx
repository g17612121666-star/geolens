import { useEffect, useMemo, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { waterRibbonGeometry } from "./river-terrain";
import { terrainBlockGeometry } from "./science-geometry";
import { SectionMaterial, withSurfaceY } from "./section-material";
import { landSectionGlsl, cliffFaceGlsl, type LandSection } from "./land-section";
import { landscapeNoise } from "./landscape-noise";
import { TerrainMaterial } from "./natural-world";
import { FlowWaterMaterial } from "./flow-water";
import { AlpineMaterial } from "./alpine-material";
/** Closed terrain whose cut faces show soil, weathered rock and bedded bedrock, with an explicitly
 * supplied surface colour that is mottled and gives way to bare rock on steep slopes. */
export function GeomorphicTerrain({
  height,
  colour,
  width = 6,
  depth = 4,
  base = -0.3,
  resolution = 128,
  material = "grass",
  section,
  cliff = 0.62,
  mottle = 0.12,
  sideGlsl,
  sideUniforms,
}: {
  height: (x: number, z: number) => number;
  colour: (x: number, y: number, z: number) => string;
  width?: number;
  depth?: number;
  base?: number;
  resolution?: number;
  material?: "grass" | "rock" | "sand" | "beach" | "soil" | "snow" | "alpine";
  /** Cut-face layers; see `landSectionGlsl`. */
  section?: LandSection;
  /** Slopes whose normal has a vertical component below this show bare rock; 0 disables. */
  cliff?: number;
  /** Strength of the large-scale colour variation across the surface. */
  mottle?: number;
  /** A complete SectionMaterial shader for the cut faces, replacing `section`. */
  sideGlsl?: string;
  sideUniforms?: Record<string, { value: unknown }>;
}) {
  const sectionKey = JSON.stringify(section ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const glsl = useMemo(() => landSectionGlsl(section), [sectionKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const face = useMemo(() => cliffFaceGlsl(section), [sectionKey]);
  const geometry = useMemo(() => {
    const g = withSurfaceY(terrainBlockGeometry(height, width, depth, resolution, base), height),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      topCount = (resolution + 1) ** 2,
      col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      col.set(colour(x, p.getY(i), z));
      if (i < topCount) {
        const n =
          landscapeNoise(x * 2.3 + 11, z * 2.3) * 0.65 + landscapeNoise(x * 9, z * 9) * 0.35;
        col.multiplyScalar(1 - mottle + 2 * mottle * n);
      }
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [height, colour, width, depth, base, resolution, mottle]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {material === "alpine" ? (
        <AlpineMaterial attach="material-0" />
      ) : (
        // The scene's own colours carry the landform; steep ground shows the bedrock beds.
        <SectionMaterial
          attach="material-0"
          glsl={face}
          cliff={cliff > 0 ? cliff : -1}
          cacheKey={`land-face-${sectionKey}`}
          color="#d4d4d4"
          vertexColors
          roughness={0.95}
        />
      )}
      <SectionMaterial
        attach="material-1"
        glsl={sideGlsl ?? glsl}
        uniforms={sideUniforms}
        surface
        cacheKey={sideGlsl ? `land-custom-${sideGlsl.length}` : `land-${sectionKey}`}
        roughness={0.95}
      />
    </mesh>
  );
}
/** Sampled, UV-mapped channel surface. Arc-length UVs keep flow coherent through bends and waterfalls. */
export function WaterRibbon({
  path,
  width = 0.12,
  color = "#3f8db0",
  opacity = 0.9,
  frozen = false,
}: {
  path: [number, number, number][];
  width?: number;
  color?: string;
  opacity?: number;
  frozen?: boolean;
}) {
  const pathKey = path.map((p) => p.join(",")).join(";");
  const geometry = useMemo(() => waterRibbonGeometry(path, width), [pathKey, width]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      {frozen ? (
        <meshPhysicalMaterial
          color={color}
          roughness={0.39}
          clearcoat={0.15}
          side={THREE.DoubleSide}
        />
      ) : (
        <FlowWaterMaterial color={color} opacity={opacity} flow={[1, 0]} speed={0.8} />
      )}
    </mesh>
  );
}
/** Repeated exposed clasts use one draw call; these are geometric material details, never quantitative grains. */
export function DebrisField({
  points,
  size = 0.04,
  color = "#9f947e",
}: {
  points: [number, number, number][];
  size?: number;
  color?: string;
}) {
  const pointsKey = points.map((p) => p.join(",")).join(";");
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D();
    points.forEach((p, i) => {
      dummy.position.set(...p);
      dummy.rotation.set(i * 0.81, i * 2.399, i * 0.31);
      const r = size * (0.55 + 0.45 * Math.sin(i * 19) ** 2);
      dummy.scale.set(r * 1.4, r * 0.72, r);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [pointsKey, size]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, points.length]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 1]} />
      <TerrainMaterial kind="rock" color={color} roughness={0.98} />
    </instancedMesh>
  );
}
/** Bladed grasses are a single geometry, rooted on the supplied surface. */
export function GrassPatch({
  positions,
  height = 0.14,
  color = "#6b8151",
}: {
  positions: [number, number, number][];
  height?: number;
  color?: string;
}) {
  const positionsKey = positions.map((p) => p.join(",")).join(";");
  const geometry = useMemo(() => {
    const p: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    positions.forEach(([x, y, z], i) => {
      for (let b = 0; b < 5; b++) {
        const a = i * 2.399 + b * 1.257,
          h = height * (0.55 + 0.45 * Math.sin(i * 9 + b * 3) ** 2),
          w = h * 0.09,
          dx = Math.cos(a),
          dz = Math.sin(a),
          k = p.length / 3;
        p.push(
          x - w * dx,
          y,
          z - w * dz,
          x + w * dx,
          y,
          z + w * dz,
          x + h * 0.18 * dz - w * 0.5 * dx,
          y + h * 0.65,
          z + h * 0.18 * dx - w * 0.5 * dz,
          x + h * 0.18 * dz + w * 0.5 * dx,
          y + h * 0.65,
          z + h * 0.18 * dx + w * 0.5 * dz,
          x + h * 0.32 * dz,
          y + h,
          z + h * 0.32 * dx,
        );
        uv.push(0, 0, 1, 0, 0, 0.65, 1, 0.65, 0.5, 1);
        idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2, k + 2, k + 3, k + 4);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [positionsKey, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
    </mesh>
  );
}
/** A branching root cut-face, with radius tapering towards the tips. */
export function RootNetwork({
  x = 0,
  y = 0,
  z = 0,
  depth = 0.5,
  spread = 0.2,
  seed = 0,
}: {
  x?: number;
  y?: number;
  z?: number;
  depth?: number;
  spread?: number;
  seed?: number;
}) {
  const geometry = useMemo(() => {
    const p: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    const branch = (start: THREE.Vector3, end: THREE.Vector3, r: number) => {
      const curve = new THREE.CatmullRomCurve3([
        start,
        start
          .clone()
          .lerp(end, 0.45)
          .add(new THREE.Vector3(spread * 0.12 * Math.sin(seed + end.x * 8), 0, 0.012)),
        end,
      ]);
      const g = new THREE.TubeGeometry(curve, 12, r, 5, false),
        pos = g.attributes.position,
        tex = g.attributes.uv,
        base = p.length / 3;
      p.push(...Array.from(pos.array));
      uv.push(...Array.from(tex.array));
      idx.push(...Array.from(g.index!.array).map((v) => v + base));
      g.dispose();
    };
    for (let i = 0; i < 7; i++) {
      const end = new THREE.Vector3(
        x + spread * Math.sin(i * 2.399 + seed),
        y - depth * (0.35 + (0.65 * (i + 1)) / 7),
        z + 0.02 * Math.cos(i * 3),
      );
      branch(new THREE.Vector3(x, y, z), end, 0.006 * (1 - i * 0.07));
      for (const side of [-1, 1])
        branch(
          end.clone().lerp(new THREE.Vector3(x, y, z), 0.4),
          end.clone().add(new THREE.Vector3(side * spread * 0.3, -depth * 0.15, 0.018)),
          0.0025,
        );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [x, y, z, depth, spread, seed]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color="#a68a5f" roughness={1} />
    </mesh>
  );
}

/** Enlarged pore markers are instanced to keep cutaways usable on classroom phones. */
export function PoreMarkers({
  positions,
  colours,
  radius = 0.024,
}: {
  positions: [number, number, number][];
  colours: string[];
  radius?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null),
    key = positions.map((p) => p.join(",")).join(";") + colours.join(",");
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const dummy = new THREE.Object3D(),
      colour = new THREE.Color();
    positions.forEach((p, i) => {
      dummy.position.set(...p);
      dummy.scale.setScalar(radius);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
      mesh.current!.setColorAt(i, colour.set(colours[i] ?? "#80c8d6"));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [key, radius]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, positions.length]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}
