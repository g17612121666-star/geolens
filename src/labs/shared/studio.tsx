import { useEffect, useId, type ReactNode } from "react";
import type { CanvasProps } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { SceneProgress } from "@/components/lab/load-gate";
import { useEntryReady } from "@/components/lab/entry-ready";
import { FitScienceView } from "./fit-science-view";
import { ClientCanvas } from "@/components/globe/client-canvas";
import { useWebGL } from "@/components/globe/use-webgl";
import { LabThumb } from "@/components/lab-thumb";
import { useLabControls } from "@/lib/store/lab-controls";
import { LabTimeInvalidator } from "@/labs/tick";
import { GenericFallback } from "./fallback";
import { LabLights, StudioOrbit } from "./kit";
import { KeyboardOrbit } from "./keyboard-orbit";
import { MODEL_DESCRIPTION_ID, MODEL_LABEL_ID } from "./model-access";
import { useT } from "@/lib/i18n";
import { LabelLayout } from "./label-layout";
import { useQuality } from "./perf";

export function LabStudio({
  slug,
  title,
  camera,
  children,
  fallback,
  liveText,
  exaggeration,
  minDistance,
  maxDistance,
  target,
  lights = true,
  trueScaleText,
  groundShadows = true,
  fit = false,
  fitRevision = "",
  fitGround = true,
  backdrop,
  maxPolarAngle,
}: {
  slug: string;
  title: string;
  camera?: CanvasProps["camera"];
  children: ReactNode;
  fallback?: ReactNode;
  liveText?: string;
  exaggeration?: string;
  minDistance?: number;
  maxDistance?: number;
  target?: [number, number, number];
  lights?: boolean;
  trueScaleText?: string;
  groundShadows?: boolean;
  fit?: boolean;
  fitRevision?: string;
  fitGround?: boolean;
  /** Rendered outside the auto-fit group (sky, stars) so it never changes the framing. */
  backdrop?: ReactNode;
  /** Limit orbiting below the horizon for ground-based scenes. */
  maxPolarAngle?: number;
}) {
  const webgl = useWebGL();
  const entryReady = useEntryReady();
  useEffect(() => {
    if (webgl === false) entryReady?.(true);
  }, [webgl, entryReady]);
  const playing = useLabControls((s) => s.playing);
  const trueScale = useLabControls((s) => s.trueScale);
  const setTrueScale = useLabControls((s) => s.setTrueScale);
  const inspect = useLabControls((s) => s.inspect);
  const setInspect = useLabControls((s) => s.setInspect);
  const q = useQuality();
  const keysId = useId();
  const tr = useT();

  if (webgl === null) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-void p-6">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10">
          <div className="aspect-[4/3] bg-trench">
            <LabThumb slug={slug} />
          </div>
        </div>
        <div className="mt-4 w-full max-w-md">
          <SceneProgress />
        </div>
      </div>
    );
  }

  if (!webgl) {
    return fallback ?? <GenericFallback slug={slug} title={title} caption={liveText} />;
  }

  return (
    <>
      {/* The 3D view takes keyboard focus: arrows turn and tilt it, + and − zoom, 0 resets. */}
      <div
        data-orbit-keys=""
        tabIndex={0}
        role="application"
        aria-roledescription={tr("3D model")}
        aria-labelledby={MODEL_LABEL_ID}
        aria-label={tr("{title}: 3D model", { title })}
        aria-describedby={`${MODEL_DESCRIPTION_ID} ${keysId}`}
        className="orbit-view group absolute inset-0"
      >
        <ClientCanvas
          camera={camera ?? { position: [0, 1.4, 5.4], fov: 40 }}
          dpr={q.dpr}
          frameloop={playing ? "always" : "demand"}
          shadows={q.shadows}
        >
          <LabTimeInvalidator />
          {lights && <LabLights />}
          <LabelLayout>
            {backdrop}
            {fit ? (
              <FitScienceView revision={fitRevision} ground={fitGround}>
                {children}
              </FitScienceView>
            ) : (
              children
            )}
          </LabelLayout>
          {lights && groundShadows && q.shadows && (
            <ContactShadows
              opacity={0.42}
              scale={18}
              blur={2.4}
              far={8}
              resolution={512}
              color="#000000"
            />
          )}
          <StudioOrbit
            minDistance={minDistance}
            maxDistance={maxDistance}
            target={target}
            autoFit={fit}
            maxPolarAngle={maxPolarAngle}
          />
          <KeyboardOrbit />
        </ClientCanvas>
        <p
          id={keysId}
          className="pointer-events-none absolute left-1/2 top-3 z-10 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-lg border border-white/10 bg-basalt/90 px-3 py-1.5 text-center text-[13px] text-chalk opacity-0 backdrop-blur-md transition-opacity group-focus-visible:opacity-100"
        >
          {tr("Arrow keys turn and tilt the model · + and − zoom · 0 resets the view")}
        </p>
      </div>
      {liveText && (
        <p className="sr-only" aria-live="polite">
          {liveText}
        </p>
      )}
      {exaggeration && (
        <button
          type="button"
          onClick={() => setTrueScale(!trueScale)}
          className="pointer-events-auto absolute left-1/2 top-2 z-10 min-h-11 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-xl border border-white/10 bg-basalt/90 px-3 py-2 text-center font-mono text-[13px] text-mist backdrop-blur-md hover:text-chalk md:top-[10rem] md:max-w-[32rem]"
        >
          {trueScale
            ? (trueScaleText ?? "True relative geometry · click for teaching view")
            : exaggeration}
        </button>
      )}
      {inspect && (
        <div className="pointer-events-auto absolute bottom-28 left-1/2 z-10 w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-basalt/85 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold leading-6 text-chalk">{inspect.name}</h3>
              <p className="mt-2 text-sm leading-6 text-mist">{inspect.note}</p>
            </div>
            <button
              type="button"
              className="shrink-0 font-mono text-[13px] text-mist hover:text-chalk"
              onClick={() => setInspect(null)}
            >
              {"Close"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
