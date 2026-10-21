import { useIsCompact } from "@/hooks/use-media";

export type Quality = {
  sphere: number;
  terrain: number;
  lathe: number;
  particles: number;
  shadows: boolean;
  dpr: [number, number];
  stars: number;
};

/** Phones and tablets with several cores and memory can afford sharper canvases. */
function capableDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  return cores >= 6 && memory >= 4;
}

export function useQuality(): Quality {
  const compact = useIsCompact();
  if (compact) {
    return {
      sphere: 64,
      terrain: 128,
      lathe: 64,
      particles: 10,
      shadows: false,
      // Labs redraw only when something changes, so a sharper canvas costs little when idle.
      dpr: [1, capableDevice() ? 2 : 1.5],
      stars: 800,
    };
  }
  return {
    sphere: 128,
    terrain: 256,
    lathe: 128,
    particles: 24,
    shadows: true,
    dpr: [1, 2],
    stars: 2200,
  };
}
