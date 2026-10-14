import * as THREE from "three";

/** Closed spherical layer with a longitudinal wedge removed. Radii share one scale. */
export function shellSection(inner: number, outer: number, opening: number, segments = 128) {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const rings = 64,
    start = opening / 2,
    end = Math.PI * 2 - opening / 2;
  const vertex = (r: number, theta: number, phi: number, u: number, v: number) => {
    positions.push(
      r * Math.sin(theta) * Math.cos(phi),
      r * Math.cos(theta),
      r * Math.sin(theta) * Math.sin(phi),
    );
    uvs.push(u, v);
  };
  for (const r of [outer, inner]) {
    const base = positions.length / 3;
    for (let j = 0; j <= rings; j++)
      for (let i = 0; i <= segments; i++) {
        const phi = THREE.MathUtils.lerp(start, end, i / segments);
        vertex(r, (Math.PI * j) / rings, phi, 0.5 - phi / (Math.PI * 2), 1 - j / rings);
      }
    for (let j = 0; j < rings; j++)
      for (let i = 0; i < segments; i++) {
        const a = base + j * (segments + 1) + i,
          b = a + segments + 1;
        if (r === outer) indices.push(a, a + 1, b, b, a + 1, b + 1);
        else indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
  }
  const surfaceCount = indices.length;
  for (const phi of [start, end]) {
    const base = positions.length / 3;
    for (let j = 0; j <= rings; j++)
      for (const r of [inner, outer]) {
        const theta = (Math.PI * j) / rings;
        vertex(r, theta, phi, r * Math.sin(theta), r * Math.cos(theta));
      }
    for (let j = 0; j < rings; j++) {
      const a = base + j * 2;
      if (phi === start) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.addGroup(0, surfaceCount, 0);
  geometry.addGroup(surfaceCount, indices.length - surfaceCount, 1);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Kepler orbit about its focus; t is elapsed fraction of a period. */
export function orbitPosition(t: number, eccentricity: number, a = 1): [number, number, number] {
  const e = THREE.MathUtils.clamp(eccentricity, 0, 0.8),
    mean = t * Math.PI * 2;
  let anomaly = mean;
  for (let i = 0; i < 12; i++)
    anomaly -= (anomaly - e * Math.sin(anomaly) - mean) / (1 - e * Math.cos(anomaly));
  return [a * (Math.cos(anomaly) - e), 0, -a * Math.sqrt(1 - e * e) * Math.sin(anomaly)];
}

export function terrainGeometry(
  height: (x: number, z: number) => number,
  width = 6,
  depth = 4,
  n = 128,
) {
  const g = new THREE.PlaneGeometry(width, depth, n, n);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, height(p.getX(i), p.getZ(i)));
  p.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/** Height field with closed sides and a base. Group 0 surface; group 1 exposed substrate. */
export function terrainBlockGeometry(
  height: (x: number, z: number) => number,
  width = 6,
  depth = 4,
  n = 128,
  base = -0.65,
) {
  const top = terrainGeometry(height, width, depth, n),
    p = top.attributes.position,
    uv = top.attributes.uv;
  const positions = Array.from(p.array),
    uvs = Array.from(uv.array),
    indices = Array.from(top.index!.array),
    topCount = indices.length;
  const edge: number[] = [];
  for (let j = 0; j <= n; j++) edge.push(j * (n + 1));
  for (let i = 1; i <= n; i++) edge.push(n * (n + 1) + i);
  for (let j = n - 1; j >= 0; j--) edge.push(j * (n + 1) + n);
  for (let i = n - 1; i >= 0; i--) edge.push(i);
  for (let i = 1; i < edge.length; i++) {
    const a = edge[i - 1],
      b = edge[i],
      start = positions.length / 3;
    positions.push(
      p.getX(a),
      p.getY(a),
      p.getZ(a),
      p.getX(a),
      base,
      p.getZ(a),
      p.getX(b),
      p.getY(b),
      p.getZ(b),
      p.getX(b),
      base,
      p.getZ(b),
    );
    uvs.push((i - 1) / n, p.getY(a) - base, (i - 1) / n, 0, i / n, p.getY(b) - base, i / n, 0);
    indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
  }
  const b = positions.length / 3;
  positions.push(
    -width / 2,
    base,
    -depth / 2,
    -width / 2,
    base,
    depth / 2,
    width / 2,
    base,
    depth / 2,
    width / 2,
    base,
    -depth / 2,
  );
  uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
  indices.push(b, b + 2, b + 1, b, b + 3, b + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.addGroup(0, topCount, 0);
  g.addGroup(topCount, indices.length - topCount, 1);
  g.computeVertexNormals();
  top.dispose();
  return g;
}
