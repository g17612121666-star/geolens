import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useQuality } from "@/labs/shared/perf";

export function MoonMesh({ radius = 0.27 }: { radius?: number }) {
  const map = useTexture("/textures/moon.jpg");
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const q = useQuality();
  return (
    <mesh>
      <sphereGeometry args={[radius, q.sphere, q.sphere]} />
      <meshStandardMaterial
        map={map}
        bumpMap={map}
        bumpScale={0.012}
        roughness={0.92}
        metalness={0.02}
        color="#e8e2d6"
      />
    </mesh>
  );
}

export function SunMesh({ radius = 0.28 }: { radius?: number }) {
  const q = useQuality();
  return (
    <group>
      <mesh>
        <sphereGeometry args={[radius, Math.max(32, q.sphere / 2), Math.max(32, q.sphere / 2)]} />
        <meshBasicMaterial color="#E8B86D" />
      </mesh>
      <mesh>
        <sphereGeometry args={[radius * 1.55, 32, 32]} />
        <meshBasicMaterial color="#E8B86D" transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  );
}
