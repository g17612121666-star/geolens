import { ScientificText } from "@/components/scientific-text";
import { Environment, Html, OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, type ReactNode } from "react";
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
      environmentIntensity={0.25}
    />
  );
}

/** Key + fill + weak rim + studio IBL so packed glTF metals and rock read as different substances. */
export function LabLights({
  ambient = 0.24,
  keyIntensity = 1.6,
}: {
  ambient?: number;
  keyIntensity?: number;
}) {
  return (
    <>
      <StudioEnvironment />
      <hemisphereLight args={["#9ec4d4", "#1c1814", 0.48]} />
      <ambientLight intensity={ambient} color="#c9d4d0" />
      <directionalLight
        position={[4.2, 5.8, 3.2]}
        intensity={keyIntensity}
        color="#fff4e0"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.00025}
        shadow-camera-near={0.4}
        shadow-camera-far={28}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
      />
      <directionalLight position={[-3.4, 1.6, -2.8]} intensity={0.42} color="#7fd4ff" />
      <directionalLight position={[0.2, -2.4, 4]} intensity={0.24} color="#f4efe6" />
    </>
  );
}

export function StudioOrbit({
  minDistance = 1.4,
  maxDistance = 18,
  target = [0, 0.2, 0] as [number, number, number],
  autoFit = false,
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
      maxPolarAngle={Math.PI * 0.9}
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
