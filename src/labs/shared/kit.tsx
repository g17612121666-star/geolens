import { ScientificText } from "@/components/scientific-text";
import { Environment, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { cn } from "@/lib/utils";
import { useIsCompact } from "@/hooks/use-media";
import { newLabelSlot, showLabelSlot } from "./label-crowding";
import { useLabelLayout } from "./label-store";
import { useRockNormal } from "./materials";
import { IceBody, WaterBody } from "./parts";

const TONES: Record<string, string> = {
  chalk: "text-chalk",
  glacier: "text-glacier",
  magma: "text-magma",
  sandstone: "text-sandstone",
  ice: "text-ice",
  moss: "text-moss",
  fault: "text-fault",
};

export function Tag({
  pos,
  text,
  title,
  tone = "chalk",
  occlude = true,
  note,
  priority = 0,
  short,
  variant,
}: {
  pos: [number, number, number];
  text: string;
  /** Shorter text for phones and small tablets; the explanation card keeps the full name. */
  short?: string;
  /** Full numbered subject for the explanation card when the scene uses a short label. */
  title?: string;
  tone?: "chalk" | "glacier" | "magma" | "sandstone" | "ice" | "moss" | "fault";
  occlude?: boolean;
  note?: string;
  /**
   * When two labels collide on screen, the one with the lower priority fades out until there
   * is room for it (default 0; ties go to the label drawn first).
   */
  priority?: number;
  /** "axis": a small, quiet label for tick values such as grid numbers. */
  variant?: "axis";
}) {
  const compact = useIsCompact();
  const labels = useLabControls((s) => s.labels);
  const layout = useLabControls((s) => s.layout);
  const inspect = useLabControls((s) => s.inspect);
  const setInspect = useLabControls((s) => s.setInspect);
  const projector = layout === "projector";
  const hideBehind = occlude && !projector;
  const name = title ?? text.split(" · ")[0] ?? text,
    shown = compact && short ? short : text;
  const active = inspect?.name === name,
    axis = variant === "axis";
  // drei only re-checks occlusion when a label moves on screen. A label mounted before the
  // scene's meshes finish loading could stay visible through a globe, so check once more.
  const [recheck, setRecheck] = useState(0);
  useEffect(() => {
    if (!hideBehind) return;
    const id = window.setTimeout(() => setRecheck(1), 900);
    return () => window.clearTimeout(id);
  }, [hideBehind]);
  // Collision layout: the label the student opened always stays in view.
  const crowd = useLabelLayout();
  const [slot] = useState(newLabelSlot);
  const rank = priority + (active ? 1000 : 0);
  useEffect(() => {
    if (labels && crowd) return crowd.add(slot);
  }, [labels, crowd, slot]);
  useEffect(() => {
    slot.priority = rank;
    crowd?.invalidate();
  }, [slot, crowd, rank]);
  const anchorRef = useCallback(
    (group: THREE.Group | null) => {
      slot.anchor = group;
    },
    [slot],
  );
  // Ref cleanups (React 19) only forget their own element: drei mounts a label's replacement
  // in a separate React root, which can attach before the old one detaches.
  const hostRef = useCallback(
    (el: HTMLButtonElement | null) => {
      if (!el) return;
      slot.host = el;
      slot.occluded = false;
      showLabelSlot(slot);
      crowd?.invalidate();
      return () => {
        if (slot.host === el) slot.host = null;
      };
    },
    [slot, crowd],
  );
  const pillRef = useCallback(
    (el: HTMLSpanElement | null) => (el && crowd ? crowd.measure(el, slot) : undefined),
    [crowd, slot],
  );
  if (!labels) return null;
  const inspectNote = note ?? "";
  return (
    <group ref={anchorRef} position={pos}>
      <Html
        key={recheck}
        userData={{
          fitLabelWidth: axis
            ? shown.length * (projector ? 8 : 7) + 14
            : shown.length * (projector ? 9 : 8) + 28,
          fitLabelHeight: axis ? (projector ? 26 : 22) : projector ? 36 : 32,
        }}
        center
        occlude={hideBehind ? true : undefined}
        onOcclude={(hidden) => {
          slot.occluded = hidden;
          showLabelSlot(slot);
          crowd?.invalidate();
        }}
        zIndexRange={projector ? [20, 0] : [10, 0]}
        style={{ pointerEvents: "auto" }}
      >
        {/* On a touch screen a label with an explanation is a 44 px tap target around a slimmer
            pill, so it stays easy to tap without hiding the model. */}
        <button
          ref={hostRef}
          type="button"
          aria-label={name}
          disabled={!note}
          onClick={(e) => {
            e.stopPropagation();
            if (note) setInspect(active ? null : { name, note: inspectNote });
          }}
          className={cn(
            "grid place-items-center rounded-full transition-[opacity,visibility] duration-150 motion-reduce:transition-none",
            compact && note && "min-h-11",
          )}
        >
          <span
            ref={pillRef}
            data-scene-label=""
            className={cn(
              "whitespace-nowrap rounded-full border font-mono",
              axis
                ? cn(
                    "bg-basalt/80 px-1.5",
                    projector ? "text-sm leading-5" : "text-[11px] leading-[18px]",
                    tone === "chalk" ? "text-mist" : TONES[tone],
                  )
                : cn(
                    "bg-basalt/90 px-2.5 py-1 shadow-lg",
                    projector ? "text-base leading-5 tracking-[0.02em]" : "text-[13px]",
                    TONES[tone],
                  ),
              active
                ? "border-glacier/60 text-glacier"
                : axis
                  ? "border-white/10"
                  : "border-white/15",
            )}
          >
            <ScientificText>{shown}</ScientificText>
          </span>
        </button>
      </Html>
    </group>
  );
}

export { Part } from "./parts";

export function InspectHotspot({
  name,
  note,
  children,
}: {
  name: string;
  note: string;
  children: ReactNode;
}) {
  const setInspect = useLabControls((s) => s.setInspect);
  return (
    <group
      onClick={(e) => {
        e.stopPropagation();
        setInspect({ name, note });
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      {children}
    </group>
  );
}

export function Readout({
  pos = [0, 2.2, 0],
  children,
}: {
  pos?: [number, number, number];
  children: ReactNode;
}) {
  const labels = useLabControls((s) => s.labels);
  if (!labels) return null;
  return (
    <Html position={pos} center style={{ pointerEvents: "none", width: "min(440px, 80vw)" }}>
      <div className="rounded-[16px] border border-white/10 bg-basalt/80 px-3 py-2 text-center font-mono text-[13px] text-chalk backdrop-blur-md">
        {children}
      </div>
    </Html>
  );
}

export function SceneToggles({ children }: { children: ReactNode }) {
  return (
    <div className="pointer-events-auto absolute right-3 top-[6.5rem] z-10 hidden flex-col gap-2 md:right-6 md:flex lg:top-[7.5rem]">
      {children}
    </div>
  );
}

export function SceneBtn({
  onClick,
  children,
  active,
}: {
  onClick: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full border border-white/10 bg-basalt/70 px-3 py-2 text-left font-mono text-[13px] text-chalk backdrop-blur-xl",
        active && "border-glacier/40 text-glacier",
      )}
    >
      {children}
    </button>
  );
}

/** Local studio illumination; failures are handled by ClientCanvas. */
export function StudioEnvironment() {
  const { gl } = useThree();
  useEffect(() => {
    const prev = gl.toneMappingExposure;
    gl.toneMappingExposure = 1.02;
    return () => {
      gl.toneMappingExposure = prev;
    };
  }, [gl]);
  return (
    <Environment
      files="/hdri/studio_small_03_1k.hdr"
      background={false}
      environmentIntensity={0.32}
    />
  );
}

/**
 * Key + fill + rim + studio IBL so rock, ice, water and metal read as different substances.
 * The key and rim lights ride with the camera (above-left and behind), so whichever side a
 * student orbits to stays modeled instead of falling into an unlit back face.
 */
export function LabLights({
  ambient = 0.12,
  keyIntensity = 1.2,
}: {
  ambient?: number;
  keyIntensity?: number;
}) {
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target?: THREE.Vector3 } | null;
  useFrame(() => {
    const target = controls?.target ?? ORIGIN;
    const offset = TMP.copy(camera.position).sub(target);
    const distance = Math.max(offset.length(), 1);
    // Camera-space offsets: key light up and to the left; rim light behind and above.
    const right = RIGHT.set(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = UP.set(0, 1, 0).applyQuaternion(camera.quaternion);
    if (key.current) {
      key.current.position
        .copy(target)
        .addScaledVector(offset.normalize(), distance)
        .addScaledVector(right, -0.95 * distance)
        .addScaledVector(up, 1.05 * distance);
      key.current.target.position.copy(target);
      key.current.target.updateMatrixWorld();
    }
    if (rim.current) {
      rim.current.position
        .copy(target)
        .addScaledVector(TMP.copy(camera.position).sub(target).normalize(), -distance)
        .addScaledVector(up, 0.9 * distance)
        .addScaledVector(right, 0.4 * distance);
      rim.current.target.position.copy(target);
      rim.current.target.updateMatrixWorld();
    }
  });
  return (
    <>
      <StudioEnvironment />
      <hemisphereLight args={["#c4dbe4", "#2a231c", 0.32]} />
      <ambientLight intensity={ambient} color="#d3dcd8" />
      <directionalLight
        ref={key}
        position={[4.2, 5.8, 3.2]}
        intensity={keyIntensity}
        color="#fff3df"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
        shadow-camera-near={0.2}
        shadow-camera-far={40}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <directionalLight ref={rim} position={[-3.4, 1.6, -2.8]} intensity={0.55} color="#8fd8ff" />
      <directionalLight position={[0.2, -2.4, 4]} intensity={0.18} color="#f4efe6" />
    </>
  );
}

const ORIGIN = new THREE.Vector3();
const TMP = new THREE.Vector3();
const RIGHT = new THREE.Vector3();
const UP = new THREE.Vector3();

export function StudioOrbit({
  minDistance = 1.4,
  maxDistance = 18,
  target = [0, 0.2, 0] as [number, number, number],
  autoFit = false,
  maxPolarAngle = Math.PI * 0.9,
}) {
  const viewKey = useLabControls((s) => s.viewKey);
  return (
    <OrbitControls
      key={viewKey}
      enablePan
      enableDamping
      dampingFactor={0.08}
      minDistance={minDistance}
      maxDistance={maxDistance}
      maxPolarAngle={maxPolarAngle}
      {...(autoFit ? {} : { target })}
      makeDefault
    />
  );
}

export function StudioFloor({ size = 14 }: { size?: number }) {
  const nrm = useRockNormal();
  const geo = useMemo(() => new THREE.CircleGeometry(size * 0.5, 64), [size]);
  useFrame(() => undefined);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} geometry={geo} receiveShadow>
      <meshStandardMaterial
        color="#14181c"
        roughness={0.92}
        metalness={0.04}
        normalMap={nrm ?? undefined}
      />
    </mesh>
  );
}

export { IceBody, WaterBody };
