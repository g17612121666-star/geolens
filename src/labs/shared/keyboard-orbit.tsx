import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useLabControls } from "@/lib/store/lab-controls";

/** How far one key press turns or tilts the view, in radians (10°). */
const STEP = Math.PI / 18;
/** How much one key press zooms. */
const ZOOM = 1.15;

/** The parts of three-stdlib's OrbitControls that the keys use. */
type Orbit = {
  getAzimuthalAngle: () => number;
  setAzimuthalAngle: (angle: number) => void;
  getPolarAngle: () => number;
  setPolarAngle: (angle: number) => void;
  dollyIn: (scale?: number) => void;
  dollyOut: (scale?: number) => void;
  update: () => void;
};

/**
 * Lets the keyboard turn, tilt, zoom and reset a lab's 3D view while the view has focus. It
 * drives the scene's own orbit controls, so their distance and tilt limits still apply. The keys
 * it uses go no further, so the arrows do not also scrub the lab's time while the view has focus.
 */
export function KeyboardOrbit() {
  const controls = useThree((s) => s.controls) as unknown as Orbit | null;
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const host = gl.domElement.closest<HTMLElement>("[data-orbit-keys]");
    if (!host || !controls) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target !== host || e.altKey || e.ctrlKey || e.metaKey) return;
      switch (e.key) {
        case "ArrowLeft":
          controls.setAzimuthalAngle(controls.getAzimuthalAngle() - STEP);
          break;
        case "ArrowRight":
          controls.setAzimuthalAngle(controls.getAzimuthalAngle() + STEP);
          break;
        case "ArrowUp":
          controls.setPolarAngle(controls.getPolarAngle() - STEP);
          break;
        case "ArrowDown":
          controls.setPolarAngle(controls.getPolarAngle() + STEP);
          break;
        // three.js names these the other way round: dollyOut brings the camera closer.
        case "+":
        case "=":
          controls.dollyOut(ZOOM);
          break;
        case "-":
        case "_":
          controls.dollyIn(ZOOM);
          break;
        case "0":
          useLabControls.getState().resetView();
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      controls.update();
      invalidate();
    };
    host.addEventListener("keydown", onKey);
    return () => host.removeEventListener("keydown", onKey);
  }, [controls, gl, invalidate]);
  return null;
}
