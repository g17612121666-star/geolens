import { ScientificText } from "@/components/scientific-text";
import { Environment, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { cn } from "@/lib/utils";
import { useIsCompact } from "@/hooks/use-media";
import { useRockNormal } from "./materials";
import { IceBody, WaterBody, jointedBlockGeometry } from "./parts";

export function Tag({
  pos,
  text,
  title,
  tone = "chalk",
  occlude = true,
  note,
}: {
  pos: [number, number, number];
  text: string;
  /** Full numbered subject for the explanation card when the scene uses a short label. */
  title?: string;
  tone?: "chalk" | "glacier" | "magma" | "sandstone" | "ice" | "moss" | "fault";
  occlude?: boolean;
  note?: string;
}) {
  const compact = useIsCompact();
  const labels = useLabControls((s) => s.labels);
  const layout = useLabControls((s) => s.layout);
  const inspect = useLabControls((s) => s.inspect);
  const setInspect = useLabControls((s) => s.setInspect);
  if (!labels) return null;
  const tones: Record<string, string> = {
    chalk: "text-chalk",
    glacier: "text-glacier",
    magma: "text-magma",
    sandstone: "text-sandstone",
    ice: "text-ice",
    moss: "text-moss",
    fault: "text-fault",
  };
  const name = title ?? text.split(" · ")[0] ?? text;
  const inspectNote = note ?? "";
  const active = inspect?.name === name;
  const projector = layout === "projector";
  const hideBehind = occlude && !projector;
  return (
    <Html
      position={pos}
      userData={{
        fitLabelWidth: text.length * (projector ? 9 : 8) + 28,
        fitLabelHeight: compact ? 44 : projector ? 36 : 32,
      }}
      center
      occlude={hideBehind ? true : undefined}
      zIndexRange={projector ? [20, 0] : [10, 0]}
      style={{ pointerEvents: "auto" }}
    >
      <button
        type="button"
        aria-label={name}
        disabled={!note}
        onClick={(e) => {
          e.stopPropagation();
          if (note) setInspect(active ? null : { name, note: inspectNote });
        }}
        className={cn(
          "whitespace-nowrap rounded-full border bg-basalt/90 px-2.5 py-1 font-mono shadow-lg",
          projector ? "text-base leading-5 tracking-[0.02em]" : "text-[13px]",
          compact && "min-h-11",
          tones[tone],
          active ? "border-glacier/60 text-glacier" : "border-white/15",
        )}
      >
        <ScientificText>{text}</ScientificText>
      </button>
    </Html>
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
      environmentIntensity={0.42}
    />
  );
}

/**
 * Key + fill + rim + studio IBL so rock, ice, water and metal read as different substances.
 * The key and rim lights ride with the camera (above-left and behind), so whichever side a
 * student orbits to stays modelled instead of falling into an unlit back face.
 */
export function LabLights({
  ambient = 0.2,
  keyIntensity = 1.6,
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
      <hemisphereLight args={["#b8d6e2", "#2a231c", 0.42]} />
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

export { IceBody, WaterBody, jointedBlockGeometry };
