import {
  Component,
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useProgress } from "@react-three/drei";
import { LabThumb } from "@/components/lab-thumb";
import { LoadingProgress } from "@/components/loading-progress";
const EntryReady = createContext<((ready: boolean) => void) | null>(null);
export function useEntryReady() {
  return useContext(EntryReady);
}
export function SceneProgress({ compact = false }: { compact?: boolean }) {
  const { active, loaded, total } = useProgress();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 45000);
    return () => clearTimeout(timer);
  }, []);
  const downloading = active && loaded < total;
  return (
    <>
      <LoadingProgress
        compact={compact}
        label={downloading ? "Loading model and textures" : "Preparing the 3D view"}
        value={downloading ? (loaded / total) * 100 : undefined}
        detail={
          downloading
            ? `${loaded} of ${total} files loaded`
            : "Preparing lighting and the first complete frame…"
        }
      />
      {slow && (
        <div className="mt-4 text-sm text-mist">
          <p>{"This is taking longer than expected. You can keep waiting or reload the lab."}</p>
          <button
            type="button"
            className="mt-2 min-h-11 rounded-full border border-white/20 px-5 text-chalk"
            onClick={() => window.location.reload()}
          >
            {"Retry loading"}
          </button>
        </div>
      )}
    </>
  );
}
export function LabLoadFallback({ slug, title }: { slug: string; title: string }) {
  return (
    <div className="lab-entry-panel flex min-h-[70vh] w-full flex-col items-center justify-center bg-void px-6 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15">
        <div className="aspect-[16/10] bg-trench">
          <LabThumb slug={slug} />
        </div>
      </div>
      <p className="mt-6 text-center text-2xl font-medium text-chalk">{title}</p>
      <div className="mt-6 w-full max-w-md">
        <SceneProgress />
      </div>
      <a
        href="/explore"
        className="mt-6 min-h-11 px-4 py-3 text-sm text-mist underline underline-offset-4"
      >
        {"Back to labs"}
      </a>
    </div>
  );
}
/** Mount behind the entry screen so resource Suspense and GPU preparation can finish. */
export function LabEntry({
  slug,
  title,
  children,
}: {
  slug: string;
  title: string;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback((value: boolean) => {
    if (value) setReady(true);
  }, []);
  return (
    <EntryReady.Provider value={markReady}>
      <EntryBoundary>
        <div className="relative min-h-[70vh]" data-lab-entry={ready ? "ready" : "loading"}>
          <div
            inert={!ready}
            aria-hidden={!ready}
            style={{ visibility: ready ? "visible" : "hidden" }}
          >
            {children}
          </div>
          {!ready && (
            <div className="absolute inset-0 z-40 overflow-auto bg-void">
              <LabLoadFallback slug={slug} title={title} />
            </div>
          )}
        </div>
      </EntryBoundary>
    </EntryReady.Provider>
  );
}
class EntryBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div
        className="flex min-h-[60vh] flex-col items-center justify-center gap-5 p-6 text-center"
        role="alert"
      >
        <p>{"The lab could not finish loading. Check your connection and try again."}</p>
        <button
          className="min-h-11 rounded-full border border-white/25 px-6"
          onClick={() => window.location.reload()}
        >
          {"Try again"}
        </button>
        <a href="/explore" className="underline">
          {"Back to labs"}
        </a>
      </div>
    ) : (
      this.props.children
    );
  }
}
