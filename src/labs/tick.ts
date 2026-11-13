import { useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
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

/**
 * Move objects with lab time on every drawn frame, without re-rendering React. Lab time changes
 * every frame while a lab plays, so motion that only moves, turns or scales an object belongs
 * here rather than in a component that subscribes to `t`. Use it inside a lab canvas.
 */
export function useLabFrame(apply: (t: number) => void) {
  useFrame(() => apply(useLabControls.getState().t));
}

/**
 * Paused lab canvases draw on demand. Draw a frame whenever lab time changes (the time slider,
 * the arrow keys), so parts animated with `useLabFrame` follow it.
 */
export function LabTimeInvalidator() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(
    () =>
      useLabControls.subscribe((state, previous) => {
        if (state.t !== previous.t) invalidate();
      }),
    [invalidate],
  );
  return null;
}
