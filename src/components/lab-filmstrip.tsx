import { ProgressImage } from "@/components/progress-media";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { LABS, REALMS } from "@/lib/labs/catalog";
import { labFigure } from "@/lib/figures";

const FEATURED_SLUGS = [
  "seasons",
  "plate-boundaries",
  "atmosphere-layers",
  "rivers",
  "coasts",
  "glaciers",
  "earthquakes",
  "water-cycle",
];
/** A short selection with native touch and keyboard navigation. */
export function LabFilmstrip() {
  const ref = useRef<HTMLDivElement>(null);
  const resume = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [motion, setMotion] = useState(false);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotion(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      clearTimeout(resume.current);
    };
  }, []);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el || !motion || hover || focus || interacting || !visible) return;
    let previous = 0,
      id = 0,
      offset = el.scrollLeft;
    const frame = (now: number) => {
      if (!document.hidden && previous) {
        offset += Math.min(40, now - previous) * 0.024;
        const width = el.scrollWidth / 2;
        if (width && offset >= width) offset -= width;
        el.scrollLeft = offset;
      }
      previous = now;
      id = requestAnimationFrame(frame);
    };
    id = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(id);
  }, [motion, hover, focus, interacting, visible]);

  const pauseForGesture = () => {
    setInteracting(true);
    clearTimeout(resume.current);
  };
  const resumeAfterGesture = () => {
    clearTimeout(resume.current);
    resume.current = setTimeout(() => setInteracting(false), 1800);
  };

  return (
    <section aria-label={"Browse the labs"} className="mt-6">
      <div
        ref={ref}
        className="lab-showcase-window"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocusCapture={() => setFocus(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocus(false);
        }}
        onTouchStart={pauseForGesture}
        onTouchEnd={resumeAfterGesture}
        onTouchCancel={resumeAfterGesture}
        onWheel={() => {
          pauseForGesture();
          resumeAfterGesture();
        }}
      >
        {[0, 1].map((copy) => (
          <div className="lab-showcase-row" key={copy} aria-hidden={copy === 1 ? true : undefined}>
            {LABS.filter((lab) => FEATURED_SLUGS.includes(lab.slug)).map((lab) => {
              const photo = labFigure(lab.slug);
              return (
                <Link
                  className="lab-showcase-card group"
                  key={lab.slug}
                  to="/lab/$slug"
                  params={{ slug: lab.slug }}
                  tabIndex={copy === 1 ? -1 : 0}
                >
                  <div className="aspect-[16/10] shrink-0 overflow-hidden bg-trench">
                    {photo && (
                      <ProgressImage
                        src={photo.src}
                        alt={photo.alt}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transform-none"
                      />
                    )}
                  </div>
                  <div className="flex-1 p-5">
                    <p className="text-sm text-glacier">
                      {REALMS.find((realm) => realm.slug === lab.realm)?.title}
                    </p>
                    <h3 className="mt-2 font-display text-2xl leading-tight text-chalk">
                      {lab.title}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}
