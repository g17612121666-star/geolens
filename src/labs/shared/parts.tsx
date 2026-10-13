import { useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { PBR, useRockNormal, useSoilNormal } from "./materials";
import { useQuality } from "./perf";
import { fbm as fbmGeo, iceTongueGeometry, seaVolumeGeometry, jointDisplace } from "./geo";

export const fbm = fbmGeo;
export { iceTongueGeometry };

/** Click the mesh itself — not only the floating tag. */
export function Part({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: ReactNode;
}) {
  const setInspect = useLabControls((s) => s.setInspect);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setInspect({ name, note });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {children}
    </group>
  );
}

/** Glacier tongue with thickness, taper, and crevasse slots. */
export function IceBody({
  length,
  width,
  thick,
  position,
  rotation = [0.12, 0, 0],
}: {
  length: number;
  width: number;
  thick: number;
  position: [number, number, number];
  rotation?: [number, number, number];
}) {
  const q = useQuality();
  const geom = useMemo(
    () => iceTongueGeometry(length, width, thick, Math.max(32, Math.floor(q.terrain / 5)), 18),
    [length, width, thick, q.terrain],
  );
  return (
    <mesh geometry={geom} position={position} rotation={rotation} castShadow>
      <meshPhysicalMaterial
        vertexColors
        roughness={0.18}
        metalness={0.02}
        transmission={0.28}
        thickness={1.4}
        ior={1.31}
        transparent
        opacity={0.94}
        clearcoat={0.35}
        clearcoatRoughness={0.22}
        attenuationColor="#6aa8c4"
        attenuationDistance={2.2}
      />
    </mesh>
  );
}

/** Water as a volume with a moving free surface and optional breaking foam. Not a sticker plane. */
export function WaterBody({
  width,
  depth,
  y = 0.02,
  color = "#163e5c",
  opacity = 0.82,
  chop = 0.035,
  thick = 0.34,
  foam = false,
}: {
  width: number;
  depth: number;
  y?: number;
  color?: string;
  opacity?: number;
  chop?: number;
  thick?: number;
  foam?: boolean;
}) {
  const q = useQuality();
  const geom = useMemo(
    () =>
      seaVolumeGeometry(
        width,
        depth,
        thick,
        Math.max(28, q.terrain / 7),
        Math.max(18, q.terrain / 10),
      ),
    [width, depth, thick, q.terrain],
  );
  const t = useRef(0);
  useFrame((_, d) => {
    t.current += Math.min(d, 0.1);
    const pos = geom.attributes.position;
    const orig = geom.userData.orig as Float32Array;
    const u = t.current;
    const half = thick * 0.48;
    for (let i = 0; i < pos.count; i++) {
      const ox = orig[i * 3]!;
      const oy = orig[i * 3 + 1]!;
      const oz = orig[i * 3 + 2]!;
      if (oy < half * 0.4) {
        pos.setXYZ(i, ox, oy, oz);
        continue;
      }
      const shore = foam ? Math.max(0, (oz + depth * 0.45) / (depth * 0.35)) : 0;
      const wave =
        chop * Math.sin(ox * 2.2 + u * 1.8) * 0.55 +
        chop * Math.sin(oz * 3.4 - u * 1.35) * 0.4 +
        chop * 1.6 * shore * Math.max(0, Math.sin(ox * 1.6 + u * 3.2));
      pos.setXYZ(i, ox, oy + wave, oz);
    }
    pos.needsUpdate = true;
    if ((t.current * 10) % 2 < 0.12) geom.computeVertexNormals();
  });
  return (
    <group position={[0, y - thick * 0.45, 0]}>
      <mesh geometry={geom} receiveShadow>
        <meshPhysicalMaterial
          color={color}
          roughness={0.04}
          metalness={0.04}
          transmission={0.38}
          thickness={0.9}
          ior={1.333}
          transparent
          opacity={opacity}
          envMapIntensity={1.05}
        />
      </mesh>
    </group>
  );
}

/** Jointed crustal block — rock mass, not a raw box landform. */
export function jointedBlockGeometry(
  w: number,
  h: number,
  d: number,
  segs = 18,
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, segs, Math.max(6, Math.floor(segs / 2)), segs);
  return jointDisplace(g, 0.016);
}

export function JointedBlock({
  size,
  position,
  rotation = [0, 0, 0],
  color = PBR.rock.color,
  opacity = 1,
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  const nrm = useRockNormal();
  const nrmScale = useMemo(() => new THREE.Vector2(0.7, 0.7), []);
  const q = useQuality();
  const geom = useMemo(
    () => jointedBlockGeometry(size[0], size[1], size[2], Math.max(12, Math.floor(q.sphere / 8))),
    [size, q.sphere],
  );
  return (
    <mesh geometry={geom} position={position} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        metalness={0.04}
        normalMap={nrm}
        normalScale={nrmScale}
        transparent={opacity < 0.99}
        opacity={opacity}
      />
    </mesh>
  );
}

/** Unsorted till ridge — a dump of debris, not a green crate. */
export function tillRidgeGeometry(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d, 22, 6, 10);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const edge = 1 - Math.abs(z) / (d * 0.55);
    const ny = y > 0 ? y * Math.max(0.15, edge) + Math.sin(x * 9) * 0.03 : y;
    pos.setXYZ(i, x + Math.sin(z * 7) * 0.04, ny, z + Math.sin(x * 5) * 0.03);
  }
  g.computeVertexNormals();
  return g;
}

export function TillRidge({
  size,
  position,
  rotation = [0, 0, 0],
  color = "#7a6a4c",
}: {
  size: [number, number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
}) {
  const nrm = useSoilNormal();
  const nrmScale = useMemo(() => new THREE.Vector2(0.9, 0.9), []);
  const geom = useMemo(() => tillRidgeGeometry(size[0], size[1], size[2]), [size]);
  return (
    <mesh geometry={geom} position={position} rotation={rotation} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.96}
        metalness={0.02}
        normalMap={nrm}
        normalScale={nrmScale}
      />
    </mesh>
  );
}

/** Streamlined drumlin of till. Blunt up-ice. */
export function Drumlin({
  position,
  scale = [1, 0.38, 0.62],
  rotation = [0, 0.5, 0],
}: {
  position: [number, number, number];
  scale?: [number, number, number];
  rotation?: [number, number, number];
}) {
  const nrm = useSoilNormal();
  const geom = useMemo(() => {
    const g = new THREE.SphereGeometry(0.55, 28, 18);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const taper = z > 0 ? 1.15 : 0.72;
      pos.setX(i, pos.getX(i) * taper);
      pos.setY(i, pos.getY(i) * (0.55 + 0.2 * (1 - Math.abs(z))));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geom} position={position} scale={scale} rotation={rotation} castShadow>
      <meshStandardMaterial color="#C4A574" roughness={0.92} normalMap={nrm} />
    </mesh>
  );
}

/** Viscosity writes lava: runny = long thin sheet; sticky = short thick lobe. */
export function lavaSheetGeometry(visc: number): THREE.BufferGeometry {
  const t = THREE.MathUtils.clamp(visc, 0, 1);
  const len = THREE.MathUtils.lerp(3.6, 0.7, t);
  const w = THREE.MathUtils.lerp(1.85, 0.38, t);
  const h = THREE.MathUtils.lerp(0.04, 0.26, t);
  const g = new THREE.BoxGeometry(w, h, len, 22, 3, 32);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const u = (z + len / 2) / len;
    const spread = 1 - u * THREE.MathUtils.lerp(0.12, 0.62, t);
    const lobes = Math.sin(x * 8 + z * 3) * 0.05 * (1 - t);
    const channel = Math.sin(x * 3.2) * 0.03 * (1 - t) * (1 - u);
    pos.setX(i, x * spread + lobes);
    pos.setY(i, y + Math.sin(z * 6) * 0.01 + channel);
  }
  g.computeVertexNormals();
  return g;
}

export function LavaSheet({ visc, y = 0.06 }: { visc: number; y?: number }) {
  const geom = useMemo(() => lavaSheetGeometry(visc), [visc]);
  const len = THREE.MathUtils.lerp(3.6, 0.7, visc);
  return (
    <mesh geometry={geom} position={[0.15, y, len * 0.28]} rotation={[0.04, 0.12, 0]} castShadow>
      <meshStandardMaterial
        color={PBR.magma.color}
        emissive={PBR.magma.emissive}
        emissiveIntensity={THREE.MathUtils.lerp(0.78, 0.32, visc)}
        roughness={THREE.MathUtils.lerp(0.24, 0.58, visc)}
        metalness={0.08}
      />
    </mesh>
  );
}

export function ScatterVeg({
  pts,
  kind = "tree",
}: {
  pts: [number, number, number][];
  kind?: "tree" | "grass";
}) {
  if (kind === "grass") {
    return (
      <group>
        {pts.map((p, i) => (
          <mesh key={i} position={p} castShadow>
            <coneGeometry args={[0.045, 0.12, 5]} />
            <meshStandardMaterial color="#5a7a48" roughness={0.95} />
          </mesh>
        ))}
      </group>
    );
  }
  return (
    <group>
      {pts.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.018, 0.026, 0.16, 6]} />
            <meshStandardMaterial color="#5a4634" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.28, 0]} castShadow>
            <sphereGeometry args={[0.14 + (i % 3) * 0.02, 8, 6]} />
            <meshStandardMaterial color={i % 2 ? "#4a6a3a" : "#3d5c32"} roughness={0.92} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function SandGrains({
  pts,
  count = 14,
  radius = 0.035,
}: {
  pts: THREE.Vector3[];
  count?: number;
  radius?: number;
}) {
  const t = useLabControls((s) => s.t);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);
  const nrm = useSoilNormal();
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const u = (t + i / count) % 1;
        const p = curve.getPoint(u);
        return (
          <mesh key={i} position={p} castShadow>
            <dodecahedronGeometry args={[radius * (0.7 + (i % 3) * 0.15), 0]} />
            <meshStandardMaterial color="#c4a574" roughness={0.95} normalMap={nrm} />
          </mesh>
        );
      })}
    </group>
  );
}
