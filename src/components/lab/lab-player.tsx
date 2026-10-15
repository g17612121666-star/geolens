import { hasPlayback } from "@/lib/labs/playback";
import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import type { LabMeta } from "@/lib/labs/types";
import { defaultParams } from "@/lib/labs/defaults";
import { useLabControls } from "@/lib/store/lab-controls";
import { StepRail } from "./step-rail";
import { WhyPanel } from "./why-panel";
import { ControlBar } from "./control-bar";
import { useIsCompact, useMediaQuery } from "@/hooks/use-media";
import { labShareUrl, applyLabUrl, useLabUrlSync } from "@/labs/shared/url-state";

const KEYS: { key: string; does: string }[] = [
  { key: "Space", does: "Play / pause" },
  { key: "← →", does: "Scrub time" },
  { key: "L", does: "Show or hide labels" },
  { key: "R", does: "Reset the experiment" },
  { key: "F", does: "Fullscreen" },
  { key: "P", does: "Switch projector view" },
  { key: "T", does: "Compare model scales" },
  { key: "Click", does: "Inspect a named part" },
  { key: "Drag", does: "Rotate the model" },
  { key: "Ctrl + scroll", does: "Zoom in or out" },
  { key: "?", does: "This list" },
];

export function LabPlayer({ lab, scene }: { lab: LabMeta; scene: ReactNode }) {
  const [interactive, setInteractive] = useState(false);
  const hydrate = useLabControls((s) => s.hydrate);
  const toggle = useLabControls((s) => s.toggle);
  const reset = useLabControls((s) => s.reset);
  const setT = useLabControls((s) => s.setT);
  const t = useLabControls((s) => s.t);
  const setLabels = useLabControls((s) => s.setLabels);
  const labels = useLabControls((s) => s.labels);
  const setExplode = useLabControls((s) => s.setExplode);
  const explode = useLabControls((s) => s.explode);
  const setSlice = useLabControls((s) => s.setSlice);
  const slice = useLabControls((s) => s.slice);
  const layout = useLabControls((s) => s.layout);
  const setLayout = useLabControls((s) => s.setLayout);
  const setPanelTab = useLabControls((s) => s.setPanelTab);
  const setTrueScale = useLabControls((s) => s.setTrueScale);
  const trueScale = useLabControls((s) => s.trueScale);
  const params = useLabControls((s) => s.params);
  const playback = hasPlayback(lab, params, explode);
  useEffect(() => {
    if (!playback) useLabControls.getState().pause();
  }, [playback]);
  const compact = useIsCompact();
  const shortViewport = useMediaQuery("(max-height: 800px)");
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = heading.current,
      container = root.current;
    if (!element || !container || compact) return;
    const measure = () =>
      container.style.setProperty(
        "--lab-heading-bottom",
        `${element.getBoundingClientRect().bottom - container.getBoundingClientRect().top + 12}px`,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, [compact, layout, lab.slug]);
  const [fs, setFs] = useState(false);
  const [drawer, setDrawer] = useState<"steps" | "why" | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("Copy this lab’s link");
  const [barHeight, setBarHeight] = useState(130);
  useEffect(() => {
    const bar = root.current?.querySelector("[data-lab-controls]");
    if (!bar) return;
    const observer = new ResizeObserver(() => setBarHeight(bar.getBoundingClientRect().height));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [compact, lab.slug]);
  const projector = layout === "projector" && !compact;
  useEffect(() => {
    const changed = () => setFs(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  useLabUrlSync();

  useEffect(() => {
    hydrate(defaultParams(lab));
    setInteractive(true);
    if (lab.controls.slice) {
      useLabControls.getState().setSlice(0.42);
    }
    applyLabUrl(lab);
    if (useLabControls.getState().step === 3) {
      useLabControls.getState().setPanelTab("check");
      setDrawer("why");
    } else if (new URLSearchParams(window.location.search).get("lesson") === "1") {
      setDrawer("steps");
    }
  }, [lab.slug, hydrate, lab]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (root.current?.closest('[data-lab-entry="loading"]')) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement | null)?.isContentEditable
      )
        return;
      if (
        e.code === "Space" &&
        (e.target as HTMLElement | null)?.closest('button,a,[role="button"]')
      )
        return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setKeysOpen((v) => !v);
        return;
      }
      if (e.key === "Escape") {
        setKeysOpen(false);
        return;
      }
      if (e.code === "Space" && playback) {
        e.preventDefault();
        toggle();
      } else if (e.key === "r" || e.key === "R") {
        reset(defaultParams(lab));
      } else if (e.key === "l" || e.key === "L") {
        setLabels(!labels);
      } else if ((e.key === "e" || e.key === "E") && lab.controls.explode) {
        setExplode(explode > 0.5 ? 0 : 1);
      } else if ((e.key === "x" || e.key === "X") && lab.controls.slice) {
        setSlice(slice > 0.5 ? 0 : 1);
      } else if (e.key === "p" || e.key === "P") {
        setLayout(layout === "projector" ? "hud" : "projector");
      } else if (e.key === "f" || e.key === "F") {
        void toggleFs();
      } else if (e.key === "t" || e.key === "T") {
        setTrueScale(!trueScale);
      } else if (e.key === "ArrowRight" && playback) {
        e.preventDefault();
        setT(t + 0.02);
      } else if (e.key === "ArrowLeft" && playback) {
        e.preventDefault();
        setT(t - 0.02);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    toggle,
    reset,
    lab,
    playback,
    setT,
    t,
    setLabels,
    labels,
    setExplode,
    explode,
    setSlice,
    slice,
    layout,
    setLayout,
    setTrueScale,
    trueScale,
  ]);

  async function toggleFs() {
    if (!root.current) return;
    if (!document.fullscreenElement) {
      await root.current.requestFullscreen().catch(() => undefined);
    } else {
      await document.exitFullscreen().catch(() => undefined);
    }
  }

  const extraKeys = [
    ...(lab.controls.explode ? [{ key: "E", does: "Explode" }] : []),
    ...(lab.controls.slice ? [{ key: "X", does: "Slice" }] : []),
  ];

  const keysPanel = keysOpen && (
    <div
      role="dialog"
      aria-label="Model controls"
      className="pointer-events-auto fixed left-1/2 top-24 z-50 max-h-[70vh] w-[min(26rem,calc(100%-2rem))] -translate-x-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-basalt/95 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <p className="section-label">{"Keys"}</p>
        <button
          type="button"
          className="text-sm text-mist hover:text-chalk"
          onClick={() => setKeysOpen(false)}
        >
          {"Close"}
        </button>
      </div>
      <ul className="mt-3 space-y-1.5 font-mono text-sm text-chalk">
        {[
          ...KEYS.filter((row) => playback || !["Space", "← →"].includes(row.key)),
          ...extraKeys,
        ].map((row) => (
          <li key={row.key} className="flex justify-between gap-4">
            <span className="text-glacier">{row.key}</span>
            <span className="text-mist">{row.does}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  const titleBlock = (
    <div ref={heading} className={projector ? "max-w-3xl" : "max-w-2xl"}>
      <h1 className="font-display text-[24px] leading-8 text-chalk md:text-[32px] md:leading-10">
        {lab.title}
      </h1>
      {!projector && (compact || !shortViewport) && (
        <>
          <p className="mt-2 text-sm leading-6 text-chalk/85">{lab.objective}</p>
          <p className="mt-1 text-xs text-mist">
            Drag to rotate · Ctrl + scroll to zoom · pinch on a touch screen
          </p>
        </>
      )}
      {projector && <p className="sr-only">{lab.objective}</p>}
    </div>
  );

  if (compact) {
    return (
      <div
        ref={root}
        data-lab-slug={lab.slug}
        data-lab-ready={interactive}
        inert={!interactive}
        id="main"
        className="min-h-dvh bg-void pt-16"
      >
        <div className="px-4 pb-3">{titleBlock}</div>
        <div className="relative h-[62svh] min-h-[400px]">{scene}</div>
        <div className="relative z-10 border-t border-white/10 bg-basalt">
          <div className="p-3">
            <ControlBar
              lab={lab}
              fullscreen={fs}
              onToggleFullscreen={() => void toggleFs()}
              onOpenKeys={() => setKeysOpen((v) => !v)}
            />
          </div>
          <p className="px-4 pt-2 text-xs text-mist">
            <button
              type="button"
              className="text-glacier underline"
              onClick={() => {
                if (!navigator.clipboard) {
                  setShareStatus("Use the address bar to share");
                  return;
                }
                void navigator.clipboard
                  .writeText(labShareUrl())
                  .then(() => setShareStatus("Link copied"))
                  .catch(() => setShareStatus("Use the address bar to share"));
              }}
            >
              {shareStatus}
            </button>
            {" · "}
            <button
              type="button"
              className="text-glacier underline"
              onClick={() => setKeysOpen((v) => !v)}
            >
              {"Keys"}
            </button>
          </p>
          <div className="grid gap-3 p-3 sm:grid-cols-2">
            <StepRail lab={lab} />
            <WhyPanel lab={lab} />
          </div>
        </div>
        {keysPanel}
      </div>
    );
  }

  return (
    <div
      ref={root}
      data-lab-slug={lab.slug}
      data-lab-ready={interactive}
      inert={!interactive}
      id="main"
      style={{ "--lab-controls-height": `${barHeight}px` } as CSSProperties}
      className="relative h-dvh overflow-hidden bg-void"
    >
      <div className="absolute inset-0">{scene}</div>

      {projector && (
        <div className="pointer-events-none absolute inset-x-0 top-14 z-10 px-4 pt-3 md:px-6">
          <div className="pointer-events-auto">{titleBlock}</div>
        </div>
      )}

      {!projector && (
        <>
          <div className="pointer-events-auto absolute left-6 right-[25rem] top-20 z-10">
            {titleBlock}
          </div>
          <div
            style={{ scrollbarWidth: "thin" }}
            className="pointer-events-auto absolute bottom-4 right-6 top-20 z-10 flex w-[22rem] flex-col gap-4 overflow-x-hidden overflow-y-auto pr-1"
          >
            <StepRail lab={lab} />
            <WhyPanel lab={lab} />
          </div>
        </>
      )}

      {projector && (
        <div className="pointer-events-auto absolute right-4 top-16 z-20 flex gap-2 md:right-6">
          <button
            type="button"
            className="h-11 rounded-full border border-white/10 bg-basalt/80 px-4 text-sm text-chalk"
            onClick={() => setDrawer(drawer === "steps" ? null : "steps")}
          >
            {"Steps"}
          </button>
          <button
            type="button"
            className="h-11 rounded-full border border-white/10 bg-basalt/80 px-4 text-sm text-chalk"
            onClick={() => {
              setPanelTab("why");
              setDrawer(drawer === "why" ? null : "why");
            }}
          >
            {"Why"}
          </button>
        </div>
      )}

      {projector && drawer === "steps" && (
        <div className="pointer-events-auto absolute bottom-24 left-4 top-28 z-20 w-72 overflow-y-auto md:left-6">
          <StepRail lab={lab} />
        </div>
      )}
      {projector && drawer === "why" && (
        <div className="pointer-events-auto absolute bottom-24 right-4 top-28 z-20 w-[22rem] overflow-y-auto md:right-6">
          <WhyPanel lab={lab} />
        </div>
      )}

      <div
        className={`pointer-events-none absolute bottom-4 z-10 ${projector ? "inset-x-6 mx-auto max-w-[1100px]" : "left-6 right-[25rem]"}`}
      >
        <ControlBar
          lab={lab}
          fullscreen={fs}
          onToggleFullscreen={() => void toggleFs()}
          onOpenKeys={() => setKeysOpen((v) => !v)}
        />
      </div>

      {keysPanel}
    </div>
  );
}
