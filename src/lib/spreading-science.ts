/** Deliberately invented reversal history (experiment Ma), not the geomagnetic time scale. */
export const EXPERIMENT_REVERSALS = [
  0, 0.35, 0.9, 1.15, 1.9, 2.2, 2.9, 3.4, 4, 4.15, 4.7, 5.1, 5.5, 6,
];
export function spreadingCrust(distanceKm: number, fullRateMmYr: number, timeMa: number) {
  // 1 mm/year = 1 km/Ma; the half rate applies to one ridge flank.
  const halfRate = fullRateMmYr / 2,
    ageMa = Math.abs(distanceKm) / halfRate,
    formationMa = timeMa - ageMa;
  const polarity = EXPERIMENT_REVERSALS.filter((t) => t <= formationMa).length % 2;
  return { ageMa, formationMa, polarity, subsidenceM: 350 * Math.sqrt(ageMa), halfRate };
}

const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Smooth variation along the ridge (z), different for each fault block i. */
function alongRidge(i: number, z: number) {
  const u = z * 1.4 + 10 * hash(i),
    k = Math.floor(u),
    f = u - k,
    s = f * f * (3 - 2 * f);
  return hash(i * 17 + k) * (1 - s) + hash(i * 17 + k + 1) * s;
}
/** Average width of an abyssal-hill fault block, in scene units of 20 km. */
export const HILL_BLOCK = 0.12;
/**
 * Abyssal hills, in scene units before vertical exaggeration (relative heights), at distance a
 * from the ridge axis and position z along it. Each hill is a fault block about 2.4 km wide with
 * a steep scarp facing the axis and a back slope tilted away; heights change along the ridge, and
 * sediment softens the hills on older floor. Slow ridges (`slow` = 1) have larger hills.
 */
export function abyssalHills(a: number, z: number, slow: number) {
  // Blocks of uneven width: a gently warped distance, still increasing away from the axis.
  const u =
      (a +
        0.04 * Math.sin(a * 7.3 + 1.1) +
        0.02 * Math.sin(a * 17.1 + 2.3) +
        0.018 * Math.sin(z * 2.1)) /
      HILL_BLOCK,
    i = Math.floor(u),
    f = u - i;
  if (i < 2) return 0;
  const rise = Math.min(1, f / 0.12),
    scarp = rise * rise * (3 - 2 * rise),
    height = (0.35 + 0.65 * alongRidge(i, z)) * (0.6 + 0.4 * hash(i * 3.7)),
    drape = 1 - 0.55 * Math.min(1, Math.max(0, (a - 1) / 1.4)),
    start = Math.min(1, Math.max(0, (a - 0.25) / 0.25));
  return 0.04 * (0.5 + 0.5 * slow) * height * scarp * (1 - f) ** 1.4 * drape * start;
}
