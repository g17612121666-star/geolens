import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
/**
 * Fit projected geometry vertices so wide classroom canvases use the available space.
 * A scene can mark a group with userData.noFit (for example a large sea that should run off
 * the edges) and add an invisible mesh with userData.fitProxy to stand for its subject.
 */
export function FitScienceView({
  children,
  revision,
  ground = true,
}: {
  children: ReactNode;
  revision: string;
  /** Soft contact shadow under the fitted model so it sits on the stage. */
  ground?: boolean;
}) {
  const [floor, setFloor] = useState<{ y: number; x: number; z: number; size: number } | null>(
    null,
  );
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
        const box = fittedBox(root.current);
        root.current.traverse((object) => {
          if (object.userData.fitLabelWidth)
            box.expandByPoint(object.getWorldPosition(new THREE.Vector3()));
        });
        if (box.isEmpty()) return;
        const extent = box.getSize(new THREE.Vector3());
        const nextFloor = {
          y: box.min.y - Math.max(0.004, extent.y * 0.004),
          x: (box.min.x + box.max.x) / 2,
          z: (box.min.z + box.max.z) / 2,
          size: Math.max(extent.x, extent.z) * 1.35,
        };
        setFloor((prev) =>
          prev &&
          Math.abs(prev.y - nextFloor.y) < 1e-3 &&
          Math.abs(prev.size - nextFloor.size) < 1e-3 &&
          Math.abs(prev.x - nextFloor.x) < 1e-3 &&
          Math.abs(prev.z - nextFloor.z) < 1e-3
            ? prev
            : nextFloor,
        );
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
        // In camera axes around `center` (x right, y up, z toward the camera), a point fits when
        // |p.x - u| <= (D - p.z) * kx and |p.y - v| <= (D - p.z) * ky for a camera at (u, v, D).
        // Geometry shares one k per axis, so only its two extreme lines matter; labels shrink k by
        // their size on screen. Choosing u and v as well as D centers what is actually seen,
        // instead of the bounding box, which perspective leaves off-center.
        const kx = (tan * aspect) / 1.1,
          ky = tan / 1.1,
          lines = { x: [-Infinity, Infinity], y: [-Infinity, Infinity] },
          labels: { x: number; y: number; z: number; kx: number; ky: number }[] = [];
        const point = new THREE.Vector3();
        const add = (p: THREE.Vector3) => {
          lines.x[0] = Math.max(lines.x[0], p.x + p.z * kx);
          lines.x[1] = Math.min(lines.x[1], p.x - p.z * kx);
          lines.y[0] = Math.max(lines.y[0], p.y + p.z * ky);
          lines.y[1] = Math.min(lines.y[1], p.y - p.z * ky);
        };
        root.current.traverse((object) => {
          if (object.userData.fitLabelWidth) {
            object.getWorldPosition(point).sub(center).applyQuaternion(inverse);
            const availableX = Math.max(0.15, 1 - object.userData.fitLabelWidth / size.width),
              availableY = Math.max(0.15, 1 - object.userData.fitLabelHeight / size.height);
            labels.push({
              x: point.x,
              y: point.y,
              z: point.z,
              kx: (tan * aspect * availableX) / 1.14,
              ky: (tan * availableY) / 1.14,
            });
          }
          const geometry = (object as THREE.Mesh).geometry;
          if (!geometry || (!object.visible && !object.userData.fitProxy) || excluded(object))
            return;
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
                    for (const z of [bounds.min.z, bounds.max.z])
                      add(
                        point.set(x, y, z).applyMatrix4(world).sub(center).applyQuaternion(inverse),
                      );
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
            for (let i = 0; i < attribute.count; i += stride)
              add(
                point
                  .fromBufferAttribute(attribute, i)
                  .applyMatrix4(object.matrixWorld)
                  .sub(center)
                  .applyQuaternion(inverse),
              );
          }
        });
        const x = fitAxis(
            lines.x,
            kx,
            labels.map((l) => [l.x, l.z, l.kx]),
          ),
          y = fitAxis(
            lines.y,
            ky,
            labels.map((l) => [l.y, l.z, l.ky]),
          ),
          distance = Math.max(0.1, x.distance, y.distance),
          target = center
            .clone()
            .add(new THREE.Vector3(x.offset, y.offset, 0).applyQuaternion(camera.quaternion));
        camera.position.copy(target).addScaledVector(direction, distance);
        camera.near = Math.max(0.001, distance / 1000);
        camera.far = Math.max(100, distance * 100);
        camera.updateProjectionMatrix();
        orbit?.target?.copy(target);
        orbit?.update?.();
        invalidate();
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [camera, size.width, size.height, controls, view, revision, invalidate]);
  return (
    <>
      <group ref={root}>{children}</group>
      {ground && floor && <GroundShadow {...floor} />}
    </>
  );
}

/**
 * Smallest camera distance along one screen axis, and the sideways offset that achieves it.
 * Geometry gives two lines, (a - u) / k and (u - b) / k; each label gives z + |c - u| / k.
 * The distance is the upper envelope of these lines, which is convex in u.
 */
function fitAxis(
  [a, b]: number[],
  k: number,
  labels: [c: number, z: number, k: number][],
): { offset: number; distance: number } {
  const geometry = Number.isFinite(a) && Number.isFinite(b);
  const distanceAt = (u: number) => {
    let d = geometry ? Math.max((a - u) / k, (u - b) / k) : -Infinity;
    for (const [c, z, kl] of labels) d = Math.max(d, z + Math.abs(c - u) / kl);
    return d;
  };
  const ends = [...(geometry ? [a, b] : []), ...labels.map(([c]) => c)];
  if (!ends.length) return { offset: 0, distance: 0 };
  let lo = Math.min(...ends) - 1,
    hi = Math.max(...ends) + 1;
  for (let i = 0; i < 80; i++) {
    const m1 = lo + (hi - lo) / 3,
      m2 = hi - (hi - lo) / 3;
    if (distanceAt(m1) <= distanceAt(m2)) hi = m2;
    else lo = m1;
  }
  const offset = (lo + hi) / 2;
  return { offset, distance: distanceAt(offset) };
}

/** True when the object or one of its ancestors asks to be left out of the framing. */
function excluded(object: THREE.Object3D) {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (o.userData.noFit) return true;
  return false;
}

/** World bounds of everything that takes part in the framing, labels included. */
function fittedBox(root: THREE.Object3D) {
  const box = new THREE.Box3(),
    part = new THREE.Box3();
  let skipping = false;
  root.traverse((object) => {
    if (object.userData.noFit) skipping = true;
  });
  if (!skipping) return box.setFromObject(root);
  root.traverse((object) => {
    const geometry = (object as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (!geometry || (!object.visible && !object.userData.fitProxy) || excluded(object)) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (geometry.boundingBox)
      box.union(part.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld));
  });
  return box;
}

let shadowTexture: THREE.CanvasTexture | null = null;
function softShadowTexture() {
  if (shadowTexture || typeof document === "undefined") return shadowTexture;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.3)");
  g.addColorStop(0.5, "rgba(0,0,0,0.14)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTexture = new THREE.CanvasTexture(canvas);
  return shadowTexture;
}

function GroundShadow({ x, y, z, size }: { x: number; y: number; z: number; size: number }) {
  const map = useMemo(() => softShadowTexture(), []);
  if (!map) return null;
  return (
    <mesh
      position={[x, y, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
      raycast={() => null}
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={map} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
