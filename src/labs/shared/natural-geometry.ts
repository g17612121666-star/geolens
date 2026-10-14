import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export type TreeKind = "conifer" | "broadleaf" | "palm";

/** Deterministic botanical study geometry; the foliage consists of individual leaves/needles. */
export function treeGeometry(kind: TreeKind = "conifer", seed = 1) {
  let state = (seed + 1) * 7919;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const wood: THREE.BufferGeometry[] = [],
    positions: number[] = [],
    colours: number[] = [],
    uvs: number[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const branch = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const d = b.clone().sub(a),
      g = new THREE.CylinderGeometry(r * 0.35, r, d.length(), 7, 3);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, d.normalize()));
    g.translate(...a.clone().lerp(b, 0.5).toArray());
    wood.push(g);
  };
  const leaf = (
    root: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    width: number,
    needle = false,
  ) => {
    const axis = direction.clone().normalize(),
      side = new THREE.Vector3()
        .crossVectors(axis, new THREE.Vector3(0.23, 1, 0.14))
        .normalize()
        .multiplyScalar(width);
    const mid = root.clone().addScaledVector(axis, length * 0.46),
      tip = root.clone().addScaledVector(axis, length),
      ridge = mid.clone().add(new THREE.Vector3(0, width * 0.25, 0));
    const a = mid.clone().add(side),
      b = mid.clone().sub(side),
      c = new THREE.Color(needle ? "#476c43" : "#6d934a").multiplyScalar(0.72 + random() * 0.55);
    for (const tri of needle
      ? [
          [root, a, tip],
          [root, tip, b],
        ]
      : [
          [root, a, ridge],
          [root, ridge, b],
          [a, tip, ridge],
          [ridge, tip, b],
        ])
      for (const p of tri) {
        positions.push(...p.toArray());
        colours.push(c.r, c.g, c.b);
        uvs.push(
          p === root ? 0.5 : p === tip ? 0.5 : p === a ? 0 : 1,
          p === root ? 0 : p === tip ? 1 : 0.5,
        );
      }
  };
  if (kind === "conifer") {
    branch(new THREE.Vector3(), new THREE.Vector3(0, 2.45, 0), 0.072);
    for (let tier = 0; tier < 9; tier++)
      for (let arm = 0; arm < 6; arm++) {
        const y = 0.33 + tier * 0.225,
          angle = (arm * Math.PI) / 3 + tier * 1.31 + random() * 0.22,
          len = (1 - tier / 10) * (0.78 + random() * 0.16),
          a = new THREE.Vector3(0, y, 0),
          b = new THREE.Vector3(
            Math.cos(angle) * len,
            y - 0.09 + len * 0.15,
            Math.sin(angle) * len,
          );
        branch(a, b, 0.025 * (1 - tier / 11));
        for (let twig = 1; twig <= 7; twig++)
          for (const sign of [-1, 1]) {
            const root = a.clone().lerp(b, twig / 8),
              ta = angle + sign * 0.72,
              tl = len * 0.36 * (1 - twig / 10),
              end = root.clone().add(new THREE.Vector3(Math.cos(ta) * tl, 0.09, Math.sin(ta) * tl));
            branch(root, end, 0.007);
            for (let n = 0; n < 9; n++)
              for (const s of [-1, 1]) {
                const pos = root.clone().lerp(end, n / 9);
                leaf(
                  pos,
                  new THREE.Vector3(
                    Math.cos(ta + s * 0.9),
                    0.42 + random() * 0.4,
                    Math.sin(ta + s * 0.9),
                  ),
                  0.065 + random() * 0.025,
                  0.006,
                  true,
                );
              }
          }
      }
  } else if (kind === "broadleaf") {
    branch(new THREE.Vector3(), new THREE.Vector3(0.04, 1.7, 0), 0.12);
    for (let arm = 0; arm < 12; arm++) {
      const a = arm * 2.399,
        y = 0.55 + (arm % 4) * 0.23,
        root = new THREE.Vector3(0.02, y, 0),
        end = new THREE.Vector3(
          Math.cos(a) * (0.55 + random() * 0.25),
          1.3 + random() * 0.85,
          Math.sin(a) * (0.55 + random() * 0.25),
        );
      branch(root, end, 0.042);
      for (let twig = 0; twig < 7; twig++) {
        const start = root.clone().lerp(end, 0.35 + twig * 0.09),
          tip = start
            .clone()
            .add(
              new THREE.Vector3(
                Math.cos(a + twig * 1.2) * 0.3,
                0.2 + random() * 0.25,
                Math.sin(a + twig * 1.2) * 0.3,
              ),
            );
        branch(start, tip, 0.012);
        for (let n = 0; n < 17; n++) {
          const p = start.clone().lerp(tip, n / 17);
          leaf(
            p,
            new THREE.Vector3(Math.cos(n * 2.399), 0.3 + random(), Math.sin(n * 2.399)),
            0.16 + random() * 0.12,
            0.06,
          );
        }
      }
    }
  } else {
    branch(new THREE.Vector3(), new THREE.Vector3(0.18, 2.1, 0), 0.09);
    for (let frond = 0; frond < 12; frond++) {
      const a = frond * 2.399,
        points = Array.from(
          { length: 12 },
          (_, i) =>
            new THREE.Vector3(
              0.18 + Math.cos(a) * i * 0.09,
              2.1 + Math.sin((i / 11) * Math.PI) * 0.32 - i * 0.026,
              Math.sin(a) * i * 0.09,
            ),
        );
      for (let i = 1; i < points.length; i++) {
        branch(points[i - 1], points[i], 0.012);
        for (const s of [-1, 1])
          leaf(
            points[i],
            new THREE.Vector3(Math.cos(a + s * 0.9), -0.3, Math.sin(a + s * 0.9)),
            0.3 * (1 - i / 15),
            0.018,
          );
      }
    }
  }
  const trunk = mergeGeometries(wood);
  wood.forEach((g) => g.dispose());
  const foliage = new THREE.BufferGeometry();
  foliage.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  foliage.setAttribute("color", new THREE.Float32BufferAttribute(colours, 3));
  foliage.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  foliage.computeVertexNormals();
  foliage.computeBoundingSphere();
  trunk.computeBoundingSphere();
  return { trunk, foliage };
}
