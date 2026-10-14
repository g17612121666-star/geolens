import { useMemo, useEffect, useRef, useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";
import type { ThreeElements } from "@react-three/fiber";
import * as THREE from "three";
import { treeGeometry, type TreeKind } from "./natural-geometry";

function useSurfaceMaps(
  name: "bark_brown_02" | "forest_ground_04" | "sparse_grass" | "rock" | "sand" | "beach",
  repeat = 3,
) {
  const paths =
    name === "sparse_grass"
      ? ["diff", "nor", "rough"].map((k) => `sparse_grass_${k}.webp`)
      : name === "beach"
        ? ["diff", "nor_gl", "rough"].map((k) => `aerial_beach_01_${k}.jpg`)
        : name === "rock"
          ? ["rock_diff.jpg", "rock_nor.jpg", "rock_rough.jpg"]
          : name === "sand"
            ? ["sand_diff.jpg", "sand_nor.jpg"]
            : ["diff", "nor_gl", "rough"].map((k) => `${name}_${k}.webp`);
  const originals = useTexture(paths.map((p) => `/textures/pbr/${p}`));
  const maps = useMemo(
    () =>
      originals.map((source, i) => {
        const t = source.clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        return t;
      }),
    [...originals, repeat],
  );
  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps]);
  return { map: maps[0], normalMap: maps[1], roughnessMap: maps[2] };
}
export function TerrainMaterial({
  kind = "grass",
  ...props
}: ThreeElements["meshStandardMaterial"] & {
  kind?: "grass" | "rock" | "sand" | "beach" | "soil" | "snow";
}) {
  const maps = useSurfaceMaps(
    kind === "grass"
      ? "sparse_grass"
      : kind === "beach"
        ? "beach"
        : kind === "rock"
          ? "rock"
          : kind === "sand" || kind === "snow"
            ? "sand"
            : "forest_ground_04",
  );
  return (
    <meshStandardMaterial
      {...maps}
      {...(kind === "snow" ? { map: null } : {})}
      color={kind === "grass" ? "#829363" : kind === "snow" ? "#e8f1f2" : "#ffffff"}
      normalScale={new THREE.Vector2(0.36, 0.36)}
      roughness={0.93}
      {...props}
    />
  );
}
/** Two instanced draws per stand, including explicit branches and individual foliage. */
export function PlantStand({
  positions,
  scale = 1,
  scales,
  kind = "conifer",
  seed = 1,
}: {
  positions: [number, number, number][];
  scale?: number;
  scales?: number[];
  kind?: TreeKind;
  seed?: number;
}) {
  const geometry = useMemo(() => treeGeometry(kind, seed), [kind, seed]),
    maps = useSurfaceMaps("bark_brown_02", 1);
  const trunks = useRef<THREE.InstancedMesh>(null),
    leaves = useRef<THREE.InstancedMesh>(null);
  useEffect(
    () => () => {
      geometry.trunk.dispose();
      geometry.foliage.dispose();
    },
    [geometry],
  );
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    positions.forEach((pos, i) => {
      m.position.set(...pos);
      m.rotation.set(0, seed + i * 2.399, 0);
      m.scale.setScalar((scales?.[i] ?? scale) * (0.88 + 0.24 * Math.sin(i * 6.13 + seed) ** 2));
      m.updateMatrix();
      trunks.current?.setMatrixAt(i, m.matrix);
      leaves.current?.setMatrixAt(i, m.matrix);
    });
    for (const mesh of [trunks.current, leaves.current])
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
  }, [positions, scale, scales, seed]);
  return (
    <group>
      <instancedMesh
        ref={trunks}
        args={[geometry.trunk, undefined, positions.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          {...maps}
          roughness={0.97}
          normalScale={new THREE.Vector2(0.6, 0.6)}
        />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[geometry.foliage, undefined, positions.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial vertexColors roughness={0.83} side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}
export function NaturalTree({
  position = [0, 0, 0],
  ...props
}: {
  position?: [number, number, number];
  scale?: number;
  kind?: TreeKind;
  seed?: number;
}) {
  return <PlantStand positions={[position]} {...props} />;
}
