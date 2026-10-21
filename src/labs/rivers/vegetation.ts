import { riverLand, riverBanks } from "../shared/river-terrain.ts";
type Point = [number, number, number];
/** An illustrative temperate catchment, not a habitat map or a fixed river-bank planting rule. */
export function riverVegetation(verticalScale = 1) {
  let state = 48271;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const patches = [
    [-2.2, -1.25, 0.8, 0.62],
    [-1.5, 1.1, 0.92, 0.7],
    [-0.1, -1.05, 0.78, 0.6],
    [0.75, 1.45, 0.7, 0.38],
    [2.05, -1.22, 0.85, 0.63],
    [2.45, 1.1, 0.55, 0.62],
  ];
  const density = (x: number, z: number) =>
    Math.max(
      ...patches.map(([a, b, sx, sz]) => Math.exp(-(((x - a) / sx) ** 2) - ((z - b) / sz) ** 2)),
    );
  const trees: { p: Point; size: number; kind: "conifer" | "broadleaf" }[] = [],
    shrubs: Point[] = [],
    grass: Point[] = [];
  for (let i = 0; i < 1300; i++) {
    const x = -2.83 + random() * 5.66,
      z = -1.83 + random() * 3.66;
    // Clear the largest displayed channel and its active gravel margin at every discharge setting.
    const banks = riverBanks(x, 1.6);
    if (z > banks[0] - 0.14 && z < banks[1] + 0.14) continue;
    const slope = Math.hypot(
      (riverLand(x + 0.025, z) - riverLand(x - 0.025, z)) / 0.05,
      (riverLand(x, z + 0.025) - riverLand(x, z - 0.025)) / 0.05,
    );
    if (slope > 0.83) continue;
    const patch = density(x, z),
      p: Point = [x, riverLand(x, z) * verticalScale, z],
      size = 0.13 + random() * 0.11;
    if (
      random() < patch * 0.66 + 0.018 &&
      trees.every((t) => Math.hypot(x - t.p[0], z - t.p[2]) > 0.19 + (size + t.size) * 0.32)
    ) {
      // Both types overlap. This chosen montane example is not a universal upstream/downstream sequence.
      trees.push({ p, size, kind: random() < 0.2 + (0.5 * (3 - x)) / 6 ? "conifer" : "broadleaf" });
    } else if (random() < 0.1 && shrubs.every((q) => Math.hypot(x - q[0], z - q[2]) > 0.25))
      shrubs.push(p);
    else if (random() < 0.35) grass.push(p);
  }
  return {
    conifers: trees.filter((t) => t.kind === "conifer"),
    broadleaf: trees.filter((t) => t.kind === "broadleaf"),
    shrubs: shrubs.slice(0, 40),
    grass: grass.slice(0, 160),
  };
}
