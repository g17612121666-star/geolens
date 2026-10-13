import { useEffect } from "react";
import { Timer } from "three";
import { useLabControls } from "@/lib/store/lab-controls";

/**
 * Advance lab time from a RAF loop so it works both inside and outside a Canvas.
 * Uses THREE.Timer (Clock.getDelta() is not safe to call twice per frame).
 * rate = full cycles per second at speed 1.
 */
export function useLabTick(rate: number) {
  const tick = useLabControls((s) => s.tick);
  useEffect(() => {
    const timer = new Timer();
    let id = 0;
    const loop = () => {
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.1);
      // Labs start paused. Explicit Play is consent to animate, including with reduced motion.
      tick(dt, rate);
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [tick, rate]);
}
