import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { Atmosphere, EarthMesh } from "./earth";
import { ClientCanvas, useWebGL } from "./client-canvas";
import { usePrefersReducedMotion } from "@/hooks/use-media";
import { GlobePoster } from "./home-hero";
export function HeroEarth() {
  const webgl = useWebGL(),
    reduced = usePrefersReducedMotion();
  const sun = useMemo(() => new THREE.Vector3(-3, 2, 7), []);
  if (!webgl) return <GlobePoster />;
  return (
    <div className="absolute inset-0">
      <ClientCanvas camera={{ position: [0, 0, 3.7], fov: 36 }} frameloop="always">
        <ambientLight intensity={0.4} />
        <directionalLight position={[-3, 2, 7]} intensity={2.2} />
        <group rotation={[0, 0.45, 0.2]}>
          <EarthMesh sunDirection={sun} clouds segments={128} />
          <Atmosphere radius={1.012} />
        </group>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          autoRotate={!reduced}
          autoRotateSpeed={0.35}
        />
      </ClientCanvas>
    </div>
  );
}
