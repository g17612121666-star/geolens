import { useEffect, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
/** Fit projected geometry vertices so wide classroom canvases use the available space. */
export function FitScienceView({ children, revision }: { children: ReactNode; revision: string }) {
  const root = useRef<THREE.Group>(null),
    { camera, size, controls, invalidate } = useThree(),
    view = useLabControls((s) => s.viewKey);
  const initialDirection = useRef(camera.position.clone().normalize());
  const lastView = useRef(-1);
  useEffect(() => {
    // Zustand also updates child scene components. Fit after their R3F host objects
    // and async material commits have reached the scene, not against the old model.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (!root.current || !(camera instanceof THREE.PerspectiveCamera)) return;
        root.current.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(root.current);
        root.current.traverse((object) => {
          if (object.userData.fitLabelWidth)
            box.expandByPoint(object.getWorldPosition(new THREE.Vector3()));
        });
        if (box.isEmpty()) return;
        const orbit = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
        const center = box.getCenter(new THREE.Vector3()),
          direction =
            lastView.current === view
              ? camera.position
                  .clone()
                  .sub(orbit?.target ?? center)
                  .normalize()
              : initialDirection.current;
        lastView.current = view;
        camera.position.copy(center).add(direction);
        camera.lookAt(center);
        camera.updateMatrixWorld();
        const inverse = camera.quaternion.clone().invert(),
          tan = Math.tan((camera.fov * Math.PI) / 360),
          aspect = size.width / size.height;
        let distance = 0.1;
        const point = new THREE.Vector3();
        root.current.traverse((object) => {
          if (object.userData.fitLabelWidth) {
            object.getWorldPosition(point).sub(center).applyQuaternion(inverse);
            const availableX = Math.max(0.15, 1 - object.userData.fitLabelWidth / size.width),
              availableY = Math.max(0.15, 1 - object.userData.fitLabelHeight / size.height);
            distance = Math.max(
              distance,
              point.z + (Math.abs(point.y) / (tan * availableY)) * 1.14,
              point.z + (Math.abs(point.x) / (tan * aspect * availableX)) * 1.14,
            );
          }
          const geometry = (object as THREE.Mesh).geometry;
          if (!geometry || !object.visible) return;
          if (object instanceof THREE.InstancedMesh) {
            geometry.computeBoundingBox();
            const bounds = geometry.boundingBox,
              instance = new THREE.Matrix4(),
              world = new THREE.Matrix4();
            if (bounds)
              for (let i = 0; i < object.count; i++) {
                object.getMatrixAt(i, instance);
                world.multiplyMatrices(object.matrixWorld, instance);
                for (const x of [bounds.min.x, bounds.max.x])
                  for (const y of [bounds.min.y, bounds.max.y])
                    for (const z of [bounds.min.z, bounds.max.z]) {
                      point.set(x, y, z).applyMatrix4(world).sub(center).applyQuaternion(inverse);
                      distance = Math.max(
                        distance,
                        point.z + (Math.abs(point.y) / tan) * 1.1,
                        point.z + (Math.abs(point.x) / (tan * aspect)) * 1.1,
                      );
                    }
              }
            return;
          }
          // Wide-line geometry stores endpoints separately; its position attribute is only a screen-space quad.
          const attributes = geometry.attributes.instanceStart
            ? [geometry.attributes.instanceStart, geometry.attributes.instanceEnd]
            : [geometry.attributes.position];
          for (const attribute of attributes) {
            if (!attribute) continue;
            const stride = Math.max(1, Math.floor(attribute.count / 5000));
            for (let i = 0; i < attribute.count; i += stride) {
              point
                .fromBufferAttribute(attribute, i)
                .applyMatrix4(object.matrixWorld)
                .sub(center)
                .applyQuaternion(inverse);
              distance = Math.max(
                distance,
                point.z + (Math.abs(point.y) / tan) * 1.1,
                point.z + (Math.abs(point.x) / (tan * aspect)) * 1.1,
              );
            }
          }
        });
        camera.position.copy(center).addScaledVector(direction, distance);
        camera.near = Math.max(0.001, distance / 1000);
        camera.far = Math.max(100, distance * 100);
        camera.updateProjectionMatrix();
        orbit?.target?.copy(center);
        orbit?.update?.();
        invalidate();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, size.width, size.height, controls, view, revision, invalidate]);
  return <group ref={root}>{children}</group>;
}
