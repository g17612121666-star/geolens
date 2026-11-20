import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";
import { EarthMesh } from "./earth";
import { ClientCanvas } from "./client-canvas";
import { usePrefersReducedMotion } from "@/hooks/use-media";

/** The home-page Earth: a Sun-lit globe with no rim or halo, drawn over a still picture of itself. */
export function HeroEarth({
  active,
  onReady,
}: {
  /** False while the globe is scrolled out of view, so it stops redrawing. */
  active: boolean;
  onReady: (ready: boolean) => void;
}) {
  const reduced = usePrefersReducedMotion();
  const sun = useMemo(() => new THREE.Vector3(-3, 2, 7), []);
  return (
    <ClientCanvas
      camera={{ position: [0, 0, 3.7], fov: 36 }}
      frameloop={active && !reduced ? "always" : "demand"}
      dpr={[1, 2]}
      transparent
      quiet
      onReady={onReady}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[-3, 2, 7]} intensity={2.2} />
      {/* North America faces the viewer. No halo: the page shows the globe with no rim or frame. */}
      <group rotation={[0.55, -1.32, 0.1]}>
        <EarthMesh
          sunDirection={sun}
          clouds
          cloudCover={0.3}
          segments={160}
          halo={false}
          glint={false}
        />
      </group>
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        enableDamping
        autoRotate={!reduced}
        autoRotateSpeed={0.35}
      />
    </ClientCanvas>
  );
}
