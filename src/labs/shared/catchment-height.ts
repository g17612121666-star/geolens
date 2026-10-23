import { landscapeNoise as noise } from "./landscape-noise";

/** The main channel heads at x = -1.8, inside the divide, so the valley closes upstream. */
export const streamDistance = (x: number, z: number) =>
  Math.min(
    x >= -1.8 ? Math.abs(z) : Math.hypot(z, x + 1.8),
    x >= -1.7 && x <= 0 ? Math.abs(Math.abs(z) + (x * 1.2) / 1.7) : 10,
  );
export const catchmentHeight = (x: number, z: number) =>
  0.08 +
  0.52 * ((2 - x) / 4) ** 2 +
  0.5 * Math.sin((z * Math.PI) / 3.2) ** 2 +
  0.025 * (noise(x * 4, z * 5) - 0.5) * Math.min(1, streamDistance(x, z) * 8) -
  0.055 * Math.exp(-((streamDistance(x, z) / 0.1) ** 4));
