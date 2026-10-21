import { Canvas, useThree, type CanvasProps } from "@react-three/fiber";
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { SceneProgress } from "@/components/lab/load-gate";
import { useEntryReady } from "@/components/lab/entry-ready";
import { LoadingProgress } from "@/components/loading-progress";
import * as THREE from "three";
import { pageScrollUnlessCtrl } from "@/lib/embedded-wheel";
import { usePreferences } from "@/lib/preferences";
import { useWebGL } from "./use-webgl";

export function ClientCanvas({
  children,
  className,
  camera,
  frameloop,
  onCreated,
  gl,
  dpr,
  shadows,
}: {
  children: ReactNode;
  className?: string;
  camera?: CanvasProps["camera"];
  frameloop?: CanvasProps["frameloop"];
  onCreated?: CanvasProps["onCreated"];
  gl?: CanvasProps["gl"];
  dpr?: CanvasProps["dpr"];
  shadows?: boolean;
}) {
  const theme = usePreferences((s) => s.resolvedTheme);
  const [mounted, setMounted] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const webgl = useWebGL();
  const entryReady = useEntryReady();
  const ready = useCallback(
    (value: boolean) => {
      setSceneReady(value);
      entryReady?.(value);
    },
    [entryReady],
  );
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (webgl === false) entryReady?.(true);
  }, [webgl, entryReady]);

  if (!mounted || webgl === null) {
    return (
      <div
        className={`${className ?? "absolute inset-0"} flex items-center justify-center bg-void text-sm text-mist`}
        role="status"
      >
        <div className="w-64">
          <LoadingProgress label={"Checking 3D support"} />
        </div>
      </div>
    );
  }
  if (!webgl)
    return (
      <div
        className={`${className ?? "absolute inset-0"} flex items-center justify-center p-8 text-center text-sm text-mist`}
        role="status"
      >
        {
          "This browser cannot open a 3D view. The calculations, photographs and teaching notes remain available."
        }
      </div>
    );

  return (
    <CanvasBoundary className={className} onFailure={() => entryReady?.(true)}>
      <div className={`${className ?? "absolute inset-0"} overflow-hidden`}>
        <Canvas
          data-scene-ready={sceneReady ? "true" : "false"}
          data-wheel-zoom="ctrl"
          onWheelCapture={pageScrollUnlessCtrl}
          title={"Drag to rotate · Ctrl + scroll to zoom · pinch on touch screens"}
          aria-busy={!sceneReady}
          className="absolute inset-0"
          dpr={dpr ?? [1, 1.75]}
          camera={camera ?? { position: [0, 0.35, 3.4], fov: 42 }}
          frameloop={frameloop}
          shadows={shadows ? "percentage" : false}
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            localClippingEnabled: true,
            ...gl,
          }}
          onCreated={(state) => {
            state.gl.toneMapping = THREE.ACESFilmicToneMapping;
            state.gl.toneMappingExposure = 1.12;
            state.gl.outputColorSpace = THREE.SRGBColorSpace;
            state.gl.localClippingEnabled = true;
            onCreated?.(state);
          }}
        >
          <color attach="background" args={[theme === "light" ? "#f4f6f3" : "#07090C"]} />
          <Suspense fallback={<ScenePending set={ready} />}>
            {children}
            <SceneReady set={ready} />
          </Suspense>
        </Canvas>
        {!sceneReady && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-void p-6">
            <div className="w-full max-w-sm">
              <SceneProgress compact />
            </div>
          </div>
        )}
      </div>
    </CanvasBoundary>
  );
}

function ScenePending({ set }: { set: (ready: boolean) => void }) {
  useLayoutEffect(() => {
    set(false);
  }, [set]);
  return null;
}

function SceneReady({ set }: { set: (ready: boolean) => void }) {
  const { gl, scene, camera, invalidate } = useThree();
  const [error, setError] = useState<Error | null>(null);
  useLayoutEffect(() => {
    let alive = true,
      frame = 0;
    set(false);
    gl.compileAsync(scene, camera)
      .then(() => {
        if (!alive) return;
        invalidate();
        frame = requestAnimationFrame(() => {
          invalidate();
          frame = requestAnimationFrame(() => {
            if (alive) set(true);
          });
        });
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
      set(false);
    };
  }, [gl, scene, camera, invalidate, set]);
  if (error) throw error;
  return null;
}

class CanvasBoundary extends Component<
  { children: ReactNode; className?: string; onFailure: () => void },
  { failed: boolean; attempt: number }
> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailure();
  }
  render() {
    return this.state.failed ? (
      <div
        className={`${this.props.className ?? "absolute inset-0"} flex flex-col items-center justify-center gap-4 p-8 text-center text-sm text-mist`}
        role="alert"
      >
        <p>
          {"The 3D scene could not load. Your teaching controls and notes are still available."}
        </p>
        <button
          className="min-h-11 rounded-full border border-white/20 px-5 text-chalk"
          onClick={() => window.location.reload()}
        >
          {"Retry 3D view"}
        </button>
      </div>
    ) : (
      <div key={this.state.attempt} className="contents">
        {this.props.children}
      </div>
    );
  }
}
