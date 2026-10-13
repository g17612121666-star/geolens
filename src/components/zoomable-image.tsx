import { LoadingProgress } from "@/components/loading-progress";
import { useEffect, useRef, useState } from "react";

type View = { scale: number; x: number; y: number };
const initial: View = { scale: 1, x: 0, y: 0 };
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
function bounded(view: View, width: number, height: number): View {
  return {
    ...view,
    x: clamp(view.x, width * (1 - view.scale), 0),
    y: clamp(view.y, height * (1 - view.scale), 0),
  };
}

/** Original photograph/scientific image, enlarged locally without trapping page scroll. */
export function ZoomableImage({
  src,
  alt,
  className,
  describedBy,
}: {
  src: string;
  alt: string;
  className: string;
  describedBy?: string;
}) {
  const image = useRef<HTMLImageElement>(null),
    [imageState, setImageState] = useState<"loading" | "ready" | "error">("loading"),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (image.current?.complete && image.current.naturalWidth) setImageState("ready");
  }, [src, attempt]);
  const frame = useRef<HTMLDivElement>(null),
    drag = useRef<{ id: number; px: number; py: number; view: View } | null>(null);
  const [view, setView] = useState<View>(initial),
    [dragging, setDragging] = useState(false);
  const zoomAt = (factor: number, px: number, py: number) => {
    const rect = frame.current?.getBoundingClientRect();
    if (!rect) return;
    setView((previous) => {
      const scale = clamp(previous.scale * factor, 1, 5);
      if (scale === 1) return initial;
      const ratio = scale / previous.scale;
      return bounded(
        { scale, x: px - (px - previous.x) * ratio, y: py - (py - previous.y) * ratio },
        rect.width,
        rect.height,
      );
    });
  };
  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = element.getBoundingClientRect(),
        delta =
          event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      zoomAt(
        Math.exp(-clamp(delta, -160, 160) * 0.003),
        event.clientX - rect.left,
        event.clientY - rect.top,
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    const resize = new ResizeObserver(() => {
      const r = element.getBoundingClientRect();
      setView((v) => bounded(v, r.width, r.height));
    });
    resize.observe(element);
    return () => {
      element.removeEventListener("wheel", wheel);
      resize.disconnect();
    };
  }, []);
  return (
    <div
      ref={frame}
      data-wheel-zoom="ctrl"
      data-image-scale={view.scale.toFixed(3)}
      className="relative overflow-hidden focus-visible:outline-2 focus-visible:outline-glacier"
      tabIndex={0}
      role="group"
      aria-label={`${alt} ${"Ctrl + scroll to zoom; plus and minus keys also zoom; Escape resets."}`}
      title={"Hold Ctrl and scroll to zoom. Drag the enlarged image to move it."}
      style={{
        minHeight: imageState === "ready" ? undefined : "9rem",
        touchAction: view.scale > 1 ? "none" : "auto",
        cursor: view.scale > 1 ? (dragging ? "grabbing" : "grab") : undefined,
      }}
      onKeyDown={(e) => {
        if (!["+", "=", "-", "0", "Escape"].includes(e.key)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "0" || e.key === "Escape") setView(initial);
        else {
          const r = frame.current!.getBoundingClientRect();
          zoomAt(e.key === "-" ? 1 / 1.25 : 1.25, r.width / 2, r.height / 2);
        }
      }}
      onPointerDown={(e) => {
        if (
          view.scale <= 1 ||
          e.button !== 0 ||
          (e.target instanceof Element && e.target.closest("button"))
        )
          return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: e.pointerId, px: e.clientX, py: e.clientY, view };
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || d.id !== e.pointerId) return;
        const r = e.currentTarget.getBoundingClientRect();
        setView(
          bounded(
            { ...d.view, x: d.view.x + e.clientX - d.px, y: d.view.y + e.clientY - d.py },
            r.width,
            r.height,
          ),
        );
      }}
      onPointerUp={() => {
        drag.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
      onLostPointerCapture={() => {
        drag.current = null;
        setDragging(false);
      }}
    >
      <img
        key={attempt}
        ref={image}
        onLoad={() => setImageState("ready")}
        onError={() => setImageState("error")}
        src={src}
        alt={alt}
        className={className}
        loading="lazy"
        decoding="async"
        aria-describedby={describedBy}
        draggable={false}
        style={{
          display: "block",
          transformOrigin: "0 0",
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
        }}
      />
      {imageState === "loading" && (
        <div className="pointer-events-none absolute inset-x-3 bottom-3 rounded-lg bg-basalt/95 p-3">
          <LoadingProgress compact label={"Loading photograph"} />
        </div>
      )}
      {imageState === "error" && (
        <div
          className="flex min-h-28 flex-col items-center justify-center gap-2 p-4 text-sm"
          role="alert"
        >
          <span>{"Photograph unavailable."}</span>
          <button
            className="min-h-11 underline"
            onClick={() => {
              setImageState("loading");
              setAttempt((n) => n + 1);
            }}
          >
            {"Retry photograph"}
          </button>
        </div>
      )}
      {view.scale > 1 && (
        <button
          type="button"
          onClick={() => setView(initial)}
          className="absolute right-2 top-2 min-h-11 rounded-full border border-white/20 bg-basalt/95 px-3 text-sm text-chalk"
          aria-label={"Reset image zoom"}
        >
          {"Reset · "}
          {view.scale.toFixed(1)}×
        </button>
      )}
    </div>
  );
}
