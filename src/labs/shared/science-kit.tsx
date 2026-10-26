import { Children, isValidElement, useEffect, useRef, type ReactNode } from "react";
import { ScientificText } from "@/components/scientific-text";
import * as THREE from "three";
import { LabStudio } from "./studio";
import { Starfield } from "@/components/globe/earth";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { useLabControls } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { usePreferences } from "@/lib/preferences";

export function ScienceStudio({
  slug,
  children,
  scale,
  trueScale,
  camera = [4, 2.3, 6],
  lights = true,
  space = false,
  ground,
  horizon = false,
  fitKey = "",
}: {
  slug: string;
  children: ReactNode;
  scale: string;
  trueScale?: string;
  camera?: [number, number, number];
  lights?: boolean;
  /** Astronomy scenes: deep-space background and stars instead of the page color. */
  space?: boolean;
  /** Soft ground shadow under the model; on by default except in space. */
  ground?: boolean;
  /** Ground-based scene: stop the camera a little below the horizon. */
  horizon?: boolean;
  /** Change this when async content (such as loaded terrain) changes the model's size. */
  fitKey?: string;
}) {
  const lab = LAB_BY_SLUG[slug];
  const revision = useLabControls((s) =>
    JSON.stringify([s.params, s.trueScale, s.slice, s.explode]),
  );
  const compact = useIsCompact(),
    projector = useLabControls((s) => s.layout === "projector"),
    real = useLabControls((s) => s.trueScale),
    setScale = useLabControls((s) => s.setTrueScale);
  return (
    <>
      <div
        style={{
          top: compact
            ? "48px"
            : projector
              ? "calc(var(--lab-heading-bottom, 104px) + 16px)"
              : "calc(var(--lab-heading-bottom, 160px) + 12px)",
          bottom: compact
            ? "calc(var(--science-readout-height, 64px) + 8px)"
            : "calc(var(--lab-controls-height, 130px) + var(--science-readout-height, 64px) + 2rem)",
        }}
        className={`absolute ${compact ? "inset-x-0" : projector ? "inset-x-6" : "left-6 right-[25rem]"}`}
      >
        <LabStudio
          slug={slug}
          title={lab.title}
          camera={{ position: camera, fov: 40 }}
          lights={lights}
          groundShadows={false}
          fit
          fitRevision={revision + fitKey}
          fitGround={ground ?? !space}
          backdrop={space ? <SpaceBackdrop /> : undefined}
          maxPolarAngle={horizon ? Math.PI * 0.56 : undefined}
          target={[0, 0, 0]}
          minDistance={0.3}
          maxDistance={28}
        >
          {children}
        </LabStudio>
      </div>
      <details
        style={{
          top: compact
            ? "4px"
            : projector
              ? "calc(var(--lab-heading-bottom, 104px) + 8px)"
              : "calc(var(--lab-heading-bottom, 160px) + 4px)",
        }}
        className={`absolute z-20 max-w-sm rounded-xl border border-white/15 bg-basalt/95 text-sm text-mist ${compact ? "left-3 right-3" : projector ? "right-6" : "right-[25rem]"}`}
      >
        <summary className="min-h-11 cursor-pointer px-3 py-2.5">Model scale</summary>
        <div className="space-y-3 px-4 pb-4">
          <p>{(real ? (trueScale ?? scale) : scale).replaceAll(" · ", ". ")}.</p>
          <button
            type="button"
            aria-pressed={real}
            onClick={() => setScale(!real)}
            className="min-h-11 rounded-lg border border-glacier/40 px-3 text-glacier"
          >
            {real ? "Restore teaching scale" : "Compare physical scale"}
          </button>
        </div>
      </details>
    </>
  );
}

function SpaceBackdrop() {
  return (
    <>
      <color attach="background" args={["#05070c"]} />
      <Starfield />
    </>
  );
}

export function ScienceReadout({ children }: { children: ReactNode }) {
  const layout = useLabControls((s) => s.layout);
  const compact = useIsCompact();
  const ref = useRef<HTMLDivElement>(null),
    playing = useLabControls((s) => s.playing);
  const content = Children.toArray(children);
  const breakAt = content.findIndex((child) => isValidElement(child) && child.type === "br");
  const main = breakAt < 0 ? content : content.slice(0, breakAt);
  const detail = breakAt < 0 ? [] : content.slice(breakAt + 1);
  useEffect(() => {
    const element = ref.current,
      root = element?.parentElement;
    if (!element || !root) return;
    const observer = new ResizeObserver(() =>
      root.style.setProperty(
        "--science-readout-height",
        `${element.getBoundingClientRect().height}px`,
      ),
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--science-readout-height");
    };
  }, []);
  return (
    <div
      ref={ref}
      style={compact ? undefined : { bottom: "calc(var(--lab-controls-height, 130px) + 1.5rem)" }}
      className={`pointer-events-auto absolute ${compact || layout === "projector" ? "inset-x-3 mx-auto max-w-3xl" : "left-6 right-[25rem]"} rounded-xl border border-white/15 bg-basalt/95 px-4 py-3 text-chalk ${layout === "projector" ? "text-base" : "text-sm"} ${compact ? "bottom-3" : ""}`}
    >
      <div role="status" aria-live={playing ? "off" : "polite"}>
        <ScientificText>{main}</ScientificText>
      </div>
      {detail.length > 0 && (
        <details className="mt-2 border-t border-white/10 pt-2 text-mist">
          <summary className="cursor-pointer text-sm">How to read these results</summary>
          <div className="pt-2 leading-6">
            <ScientificText>{detail}</ScientificText>
          </div>
        </details>
      )}
    </div>
  );
}

export function Arrow({
  from,
  to,
  color = "#7fd4ff",
  width = 2,
}: {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  width?: number;
}) {
  const theme = usePreferences((s) => s.resolvedTheme),
    ink = new THREE.Color(color);
  if (theme === "light") {
    const hsl = { h: 0, s: 0, l: 0 };
    ink.getHSL(hsl);
    ink.setHSL(hsl.h, Math.max(0.38, hsl.s), Math.min(0.38, hsl.l));
  }
  const a = new THREE.Vector3(...from),
    b = new THREE.Vector3(...to),
    length = a.distanceTo(b);
  if (length < 1e-6) return null;
  const d = b.clone().sub(a).normalize(),
    q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
  const head = Math.min(length * 0.3, 0.105 * width),
    radius = Math.min(length * 0.065, 0.028 * width),
    // A thicker shaft keeps arrows readable when the camera fits a large scene from far away.
    shaft = Math.max(0.002, radius * 0.4);
  return (
    <group position={a} quaternion={q}>
      <mesh position={[0, (length - head) / 2, 0]}>
        <cylinderGeometry args={[shaft, shaft, length - head, 12]} />
        <meshStandardMaterial color={ink} roughness={0.4} emissive={ink} emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[0, length - head / 2, 0]}>
        <coneGeometry args={[radius, head, 20]} />
        <meshStandardMaterial color={ink} roughness={0.4} emissive={ink} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}
