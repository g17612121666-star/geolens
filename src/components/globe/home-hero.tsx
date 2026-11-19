import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const HeroEarth = lazy(() => import("./hero-earth").then((m) => ({ default: m.HeroEarth })));

/**
 * The globe shows at once as a still picture of the 3D model (made by
 * scripts/capture-home-earth.mjs), and the model takes its place when its first frame is drawn.
 * Without WebGL the picture simply stays.
 */
export function HomeHero({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [live, setLive] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={cn("relative aspect-square", className)}
      role="img"
      aria-label="Earth seen from space, as a globe you can drag to turn"
      data-home-earth=""
    >
      <img
        src="/home/earth-560.webp"
        srcSet="/home/earth-560.webp 560w, /home/earth-1120.webp 1120w"
        sizes="(min-width: 768px) 560px, 88vw"
        width={560}
        height={560}
        alt=""
        fetchPriority="high"
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-500",
          live && "opacity-0",
        )}
      />
      <Suspense fallback={null}>
        <HeroEarth active={onScreen} onReady={setLive} />
      </Suspense>
    </div>
  );
}
