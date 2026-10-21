import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useEffect, useMemo } from "react";

/** Existing Poly Haven rock textures; clone sampling settings for each model. */
export function useRockPbr(repeat = 2) {
  const originals = useTexture([
    "/textures/pbr/rock_diff.jpg",
    "/textures/pbr/rock_nor.jpg",
    "/textures/pbr/rock_rough.jpg",
  ]);
  const [diffMap, norMap, roughMap] = originals;
  const maps = useMemo(
    () =>
      [diffMap, norMap, roughMap].map((original, i) => {
        const t = original.clone();
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(repeat, repeat);
        t.anisotropy = 8;
        t.colorSpace = i === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        return t;
      }),
    [diffMap, norMap, roughMap, repeat],
  );
  useEffect(() => () => maps.forEach((t) => t.dispose()), [maps]);
  return {
    map: maps[0],
    normalMap: maps[1],
    roughnessMap: maps[2],
    normalScale: new THREE.Vector2(0.35, 0.35),
  };
}

/** PBR presets. Colours encode mechanism, not decoration. */
export const PBR = {
  rock: { color: "#5c564c", roughness: 0.92, metalness: 0.04 },
  crust: { color: "#7C9A6A", roughness: 0.88, metalness: 0.02 },
  mantle: { color: "#4f463c", roughness: 0.93, metalness: 0.06 },
  outerCore: { color: "#c4a05a", roughness: 0.28, metalness: 0.72 },
  innerCore: { color: "#e8d5a3", roughness: 0.18, metalness: 0.82 },
  water: { color: "#1a4a6e", roughness: 0.08, metalness: 0.06 },
  ice: { color: "#d5eaf4", roughness: 0.14, metalness: 0.04 },
  soil: { color: "#6b5344", roughness: 0.96, metalness: 0.02 },
  sand: { color: "#c4a574", roughness: 0.9, metalness: 0.02 },
  magma: {
    color: "#ff6a3d",
    roughness: 0.35,
    metalness: 0.1,
    emissive: "#ff3b00",
    emissiveIntensity: 0.45,
  },
  ash: { color: "#3a4038", roughness: 0.95, metalness: 0.02 },
  limestone: { color: "#d8d0c0", roughness: 0.7, metalness: 0.04 },
  basalt: { color: "#3d3a38", roughness: 0.86, metalness: 0.08 },
  granite: { color: "#b8a090", roughness: 0.72, metalness: 0.06 },
} as const;

export function useRockNormal() {
  const t = useTexture("/textures/rock-normal.png");
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

export function useSoilNormal() {
  const t = useTexture("/textures/soil-normal.png");
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 3);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

export function useCloudMap() {
  const t = useTexture("/textures/clouds.png");
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function useMoonMap() {
  const t = useTexture("/textures/moon.jpg");
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export { soilTexture as usdaClass } from "@/lib/soil-science";

export const WATER_PHYSICAL = {
  roughness: 0.06,
  metalness: 0.06,
  transmission: 0.28,
  thickness: 0.55,
  ior: 1.333,
  transparent: true,
  opacity: 0.78,
  envMapIntensity: 0.85,
} as const;

export const ICE_PHYSICAL = {
  roughness: 0.14,
  metalness: 0.04,
  transmission: 0.42,
  thickness: 1.2,
  ior: 1.31,
  transparent: true,
  opacity: 0.88,
  envMapIntensity: 0.9,
} as const;
