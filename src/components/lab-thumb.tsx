import { useEffect, useRef, useState } from "react";
import { LoadingProgress } from "./loading-progress";
import { labFigure } from "@/lib/figures";

/** Explore cards use the lab’s field photograph, not a schematic SVG. */
export function LabThumb({ slug }: { slug: string }) {
  const ref = useRef<HTMLImageElement>(null),
    [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    setLoaded(Boolean(ref.current?.complete && ref.current.naturalWidth));
    setFailed(false);
  }, [slug]);
  const fig = labFigure(slug);
  if (fig) {
    return (
      <div className="relative size-full">
        <img
          ref={ref}
          src={fig.src}
          alt={fig.alt}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className="size-full object-cover"
        />
        {!loaded && !failed && (
          <div className="absolute inset-x-4 bottom-4 rounded-lg bg-basalt/95 p-3">
            <LoadingProgress compact label={"Loading photograph"} />
          </div>
        )}
        {failed && (
          <p role="alert" className="absolute inset-x-3 bottom-3 bg-basalt/95 p-3 text-sm">
            {"Photograph unavailable. The lesson can still open."}
          </p>
        )}
      </div>
    );
  }
  return <GenericThumb slug={slug} />;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function GenericThumb({ slug }: { slug: string }) {
  const h = hash(slug);
  const palette = ["#3EE0C6", "#FF6A3D", "#E8B86D", "#7FD4FF", "#7C9A6A", "#E24B4B"];
  const a = palette[h % palette.length];
  const b = palette[(h >> 3) % palette.length];
  const cx = 110 + (h % 80);
  const cy = 70 + ((h >> 5) % 50);
  return (
    <svg viewBox="0 0 320 200" className="size-full" role="img" aria-label={`${slug} lab mark`}>
      <rect width="320" height="200" fill="#07090C" />
      <circle cx={cx} cy={cy} r={36 + (h % 24)} fill={a} fillOpacity="0.85" />
      <circle cx={cx + 70} cy={cy + 20} r={18} fill={b} />
    </svg>
  );
}
