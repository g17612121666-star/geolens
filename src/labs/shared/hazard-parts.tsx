import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Building } from "./hazard-utils";

/**
 * Instanced walls and gabled roofs. `ground` gives the surface height; the optional `motion`
 * returns [lift, tiltX, tiltZ] so buildings can sway with an exaggerated ground motion.
 */
export function Buildings({
  items,
  ground,
  motion,
  revision = 0,
}: {
  items: Building[];
  ground: (x: number, z: number) => number;
  motion?: (x: number, z: number) => [number, number, number];
  revision?: number;
}) {
  const walls = useRef<THREE.InstancedMesh>(null),
    roofs = useRef<THREE.InstancedMesh>(null);
  const roofGeometry = useMemo(() => {
    // Triangular prism, ridge along x, base at y = 0, unit footprint.
    const g = new THREE.CylinderGeometry(0.5, 0.5, 1, 3, 1);
    g.rotateZ(Math.PI / 2);
    g.rotateX(-Math.PI / 2);
    g.computeBoundingBox();
    const box = g.boundingBox!;
    g.translate(0, -box.min.y, 0);
    g.scale(1, 1 / (box.max.y - box.min.y), 1 / (box.max.z - box.min.z));
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => roofGeometry.dispose(), [roofGeometry]);
  useLayoutEffect(() => {
    const m = new THREE.Object3D(),
      c = new THREE.Color();
    items.forEach((b, i) => {
      const [lift, tx, tz] = motion ? motion(b.x, b.z) : [0, 0, 0],
        y = ground(b.x, b.z) + lift;
      m.position.set(b.x, y + b.h / 2, b.z);
      m.rotation.set(tx, b.rot, tz);
      m.scale.set(b.w, b.h, b.d);
      m.updateMatrix();
      walls.current?.setMatrixAt(i, m.matrix);
      walls.current?.setColorAt(i, c.set(b.wall));
      m.position.set(b.x, y + b.h, b.z);
      m.scale.set(b.w * 1.12, b.h * 0.7, b.d * 1.15);
      m.updateMatrix();
      roofs.current?.setMatrixAt(i, m.matrix);
      roofs.current?.setColorAt(i, c.set(b.roof));
    });
    for (const mesh of [walls.current, roofs.current])
      if (mesh) {
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
        mesh.computeBoundingSphere();
      }
  }, [items, ground, motion, revision]);
  if (!items.length) return null;
  return (
    <group>
      <instancedMesh
        ref={walls}
        args={[undefined, undefined, items.length]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.86} />
      </instancedMesh>
      <instancedMesh
        ref={roofs}
        args={[roofGeometry, undefined, items.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.78} />
      </instancedMesh>
    </group>
  );
}
