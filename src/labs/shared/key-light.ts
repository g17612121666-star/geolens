import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Direction toward the studio key light (up and to the left of the camera, as in LabLights),
 * updated every frame, for shader-lit volumes such as clouds and plumes.
 */
export function useKeyLight() {
  const sun = useMemo(() => new THREE.Vector3(-0.5, 0.8, 0.4).normalize(), []);
  const right = useMemo(() => new THREE.Vector3(), []),
    up = useMemo(() => new THREE.Vector3(), []),
    back = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera }) => {
    camera.matrixWorld.extractBasis(right, up, back);
    sun.copy(back).addScaledVector(right, -0.95).addScaledVector(up, 1.05).normalize();
  });
  return sun;
}
