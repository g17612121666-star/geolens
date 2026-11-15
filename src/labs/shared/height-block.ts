import * as THREE from "three";

/** A rectangular block of ground: a height field with closed sides and a flat base. */
export type HeightBlockSpec = {
  /** Extent of the block: x from x0 to x1, z from z0 (back) to z1 (front). */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** Grid cells along x and along z. */
  nx: number;
  nz: number;
  /** Height of the flat base. */
  base: number;
};
export type HeightBlock = HeightBlockSpec & {
  geometry: THREE.BufferGeometry;
  /** Vertex index of each side-wall top vertex, and the surface grid point it follows. */
  wallTops: [number, number][];
};

/** Grid point (i, j): i along x from x0, j along z from z0. Index j * (nx + 1) + i. */
export const blockX = (b: HeightBlockSpec, i: number) => b.x0 + (i * (b.x1 - b.x0)) / b.nx;
export const blockZ = (b: HeightBlockSpec, j: number) => b.z0 + (j * (b.z1 - b.z0)) / b.nz;

/**
 * The block's geometry, laid out like terrainBlockGeometry but with separate resolutions along
 * x and z: the surface is group 0 (with a color attribute and UVs in units of 2 scene units for
 * terrain textures), the sides and base group 1. Heights can later be changed in place with
 * `setBlockHeights`, which avoids rebuilding the geometry while a scene animates.
 */
export function heightBlockGeometry(
  spec: HeightBlockSpec,
  height: (x: number, z: number) => number,
): HeightBlock {
  const { x0, x1, z0, z1, nx, nz, base } = spec,
    top = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  top.rotateX(-Math.PI / 2);
  top.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  const p = top.attributes.position,
    positions = Array.from(p.array),
    indices = Array.from(top.index!.array),
    topCount = indices.length,
    wallTops: [number, number][] = [];
  for (let k = 0; k < p.count; k++) positions[k * 3 + 1] = height(p.getX(k), p.getZ(k));
  const at = (i: number, j: number) => j * (nx + 1) + i,
    edge: number[] = [];
  for (let j = 0; j <= nz; j++) edge.push(at(0, j));
  for (let i = 1; i <= nx; i++) edge.push(at(i, nz));
  for (let j = nz - 1; j >= 0; j--) edge.push(at(nx, j));
  for (let i = nx - 1; i >= 0; i--) edge.push(at(i, 0));
  for (let e = 1; e < edge.length; e++) {
    const a = edge[e - 1],
      b = edge[e],
      start = positions.length / 3;
    for (const v of [a, b])
      positions.push(p.getX(v), positions[v * 3 + 1], p.getZ(v), p.getX(v), base, p.getZ(v));
    // Order: a top, a base, b top, b base.
    wallTops.push([start, a], [start + 2, b]);
    indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
  }
  const b = positions.length / 3;
  positions.push(x0, base, z0, x0, base, z1, x1, base, z1, x1, base, z0);
  indices.push(b, b + 2, b + 1, b, b + 3, b + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const colors = new Float32Array(positions.length).fill(1);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const uv = new Float32Array((positions.length / 3) * 2);
  for (let k = 0; k < p.count; k++) {
    uv[k * 2] = (p.getX(k) - x0) / 2;
    uv[k * 2 + 1] = (p.getZ(k) - z0) / 2;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(indices);
  g.addGroup(0, topCount, 0);
  g.addGroup(topCount, indices.length - topCount, 1);
  g.computeVertexNormals();
  top.dispose();
  return { ...spec, geometry: g, wallTops };
}

/** Moves the surface (and the top edges of the sides) to new heights, one per grid point. */
export function setBlockHeights(block: HeightBlock, heights: ArrayLike<number>) {
  const p = block.geometry.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < (block.nx + 1) * (block.nz + 1); k++) p.setY(k, heights[k]);
  for (const [v, k] of block.wallTops) p.setY(v, heights[k]);
  p.needsUpdate = true;
  block.geometry.computeVertexNormals();
  block.geometry.computeBoundingSphere();
}
