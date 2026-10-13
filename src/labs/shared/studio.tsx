import { useEffect, type ReactNode } from "react";
import type { CanvasProps } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { SceneProgress, useEntryReady } from "@/components/lab/load-gate";
import { FitScienceView } from "./fit-science-view";
import { ClientCanvas, useWebGL } from "@/components/globe/client-canvas";
import { LabThumb } from "@/components/lab-thumb";
import { useLabControls } from "@/lib/store/lab-controls";
import { GenericFallback } from "./fallback";
import { LabLights, StudioOrbit } from "./kit";
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

  if (webgl === null) {
    return (
      <div className="flex size-full flex-col items-center justify-center bg-void p-6">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10">
          <div className="aspect-[16/10] bg-trench">
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
      <ClientCanvas
        camera={camera ?? { position: [0, 1.4, 5.4], fov: 40 }}
        dpr={q.dpr}
        frameloop={playing ? "always" : "demand"}
        shadows={q.shadows}
      >
        {lights && <LabLights />}
        {fit ? <FitScienceView revision={fitRevision}>{children}</FitScienceView> : children}
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
        />
      </ClientCanvas>
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
