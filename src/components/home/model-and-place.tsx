import { Link } from "@tanstack/react-router";
import { useRef, useState, type KeyboardEvent } from "react";
import { photoSrcSet } from "@/lib/responsive-image";
import { cn } from "@/lib/utils";

type Pair = {
  /** Short name for the tab. */
  tab: string;
  place: string;
  /** Picture in public/home/models, taken by scripts/capture-home-models.mjs. */
  model: string;
  modelNote: string;
  photo: { src: string; alt: string };
  lab: { slug: string; title: string; href: string };
  caseSlug: string;
  text: string;
};

/** Photographs are from the verified register and already credited on the Image credits page. */
const PAIRS: Pair[] = [
  {
    tab: "Yosemite",
    place: "Yosemite Valley, California",
    model: "yosemite",
    modelNote: "Lab model, built from USGS elevation data and aerial photographs",
    photo: {
      src: "/photos/verified/yosemite-tunnel-view.jpg",
      alt: "Yosemite Valley's forested floor between steep granite walls, viewed from Tunnel View.",
    },
    lab: { slug: "glaciers", title: "Glacial landforms", href: "/lab/glaciers?view=2" },
    caseSlug: "yosemite",
    text: "Glaciers deepened and widened a river valley cut in granite, leaving sheer walls and a flat floor. Turn the model to compare it with the photograph, then switch the lab to a valley glacier to watch ice at work.",
  },
  {
    tab: "Grand Canyon",
    place: "Grand Canyon, Arizona",
    model: "grand-canyon",
    modelNote: "Lab model, built from USGS elevation data and aerial photographs",
    photo: {
      src: "/photos/verified/grand-canyon-hopi-point.jpg",
      alt: "Layered cliffs, mesas and deeply incised valleys of the Grand Canyon in evening light.",
    },
    lab: { slug: "river-erosion", title: "River erosion", href: "/lab/river-erosion?feature=3" },
    caseSlug: "grand-canyon",
    text: "The Colorado River cut down through layered rock as the land rose. Hard beds stand as cliffs and soft beds wear back into slopes.",
  },
  {
    tab: "Hawaiʻi",
    place: "The Hawaiian Islands",
    model: "hotspots",
    modelNote: "Lab model, schematic and not to scale",
    photo: {
      src: "/photos/verified/hawaii-windward-leeward.jpg",
      alt: "Hawaiian islands with greener windward slopes, drier leeward slopes and silvery sunglint on the Pacific.",
    },
    lab: { slug: "hotspots", title: "Hotspots", href: "/lab/hotspots" },
    caseSlug: "hawaii",
    text: "The Pacific Plate carries each volcano away from a plume of hot mantle, so the islands are older and more worn down toward the northwest.",
  },
];

const SIZES = "(min-width: 1280px) 620px, (min-width: 640px) 50vw, 100vw";

/**
 * Three labs set in real US landscapes. One place shows at a time, its model and a photograph
 * side by side at the same size, with tabs to switch places.
 */
export function ModelAndPlace() {
  const [active, setActive] = useState(0);
  // Pictures in the hidden panels start loading once a reader reaches for the tabs.
  const [warm, setWarm] = useState(false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const select = (i: number) => {
    setActive(i);
    tabs.current[i]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = PAIRS.length;
    if (e.key === "ArrowRight") select((active + 1) % n);
    else if (e.key === "ArrowLeft") select((active + n - 1) % n);
    else if (e.key === "Home") select(0);
    else if (e.key === "End") select(n - 1);
    else return;
    e.preventDefault();
  };
  return (
    <section
      aria-labelledby="places-heading"
      className="mt-20 border-y border-white/10 bg-basalt md:mt-28"
    >
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:py-24">
        <div className="max-w-3xl">
          <h2 id="places-heading" className="font-display text-3xl text-chalk md:text-[2.5rem]">
            Real places, rebuilt in 3D
          </h2>
          <p className="mt-3 text-lg leading-8 text-mist">
            Several labs open on real landscapes in the United States. Compare the model with a
            photograph of the place, then change the model to see how the landscape formed.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Places"
          className="mt-8 flex gap-7 overflow-x-auto border-b border-white/10"
          onKeyDown={onKeyDown}
          onPointerEnter={() => setWarm(true)}
          onFocus={() => setWarm(true)}
        >
          {PAIRS.map((pair, i) => (
            <button
              key={pair.model}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`place-tab-${i}`}
              aria-selected={i === active}
              aria-controls={`place-panel-${i}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "min-h-12 shrink-0 whitespace-nowrap border-b-2 px-1 text-[0.95rem] transition-colors",
                i === active
                  ? "border-glacier font-medium text-chalk"
                  : "border-transparent text-mist hover:text-chalk",
              )}
            >
              {pair.tab}
            </button>
          ))}
        </div>
        {PAIRS.map((pair, i) => (
          <article
            key={pair.model}
            role="tabpanel"
            id={`place-panel-${i}`}
            aria-labelledby={`place-tab-${i}`}
            hidden={i !== active}
            className="pt-8"
          >
            <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
              <figure className="min-w-0">
                <img
                  src={`/home/models/${pair.model}-640.webp`}
                  srcSet={`/home/models/${pair.model}-640.webp 640w, /home/models/${pair.model}.webp 1280w`}
                  sizes={SIZES}
                  width={640}
                  height={480}
                  loading={warm ? "eager" : "lazy"}
                  decoding="async"
                  alt={`${pair.lab.title} lab: a 3D model of ${pair.place}`}
                  className="aspect-[4/3] w-full rounded-[10px] bg-[#f7f3eb] object-cover"
                />
                <figcaption className="mt-2 text-xs leading-5 text-mist">
                  {pair.modelNote}
                </figcaption>
              </figure>
              <figure className="min-w-0">
                <img
                  src={pair.photo.src}
                  srcSet={photoSrcSet(pair.photo.src)}
                  sizes={SIZES}
                  loading={warm ? "eager" : "lazy"}
                  decoding="async"
                  alt={pair.photo.alt}
                  className="aspect-[4/3] w-full rounded-[10px] bg-trench object-cover"
                />
                <figcaption className="mt-2 text-xs leading-5 text-mist">Photograph</figcaption>
              </figure>
            </div>
            <div className="mt-6 grid gap-x-12 gap-y-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <div>
                <h3 className="font-display text-2xl text-chalk md:text-[1.9rem]">{pair.place}</h3>
                <p className="mt-2 max-w-2xl leading-7 text-mist">{pair.text}</p>
              </div>
              <p className="flex flex-wrap items-center gap-x-6 gap-y-3 lg:justify-end lg:self-center">
                <a
                  href={pair.lab.href}
                  className="inline-flex min-h-11 items-center rounded-md bg-glacier px-5 font-medium text-void hover:bg-glacier/90"
                >
                  {`Open ${pair.lab.title}`}
                </a>
                <Link
                  to="/case/$slug"
                  params={{ slug: pair.caseSlug }}
                  className="py-2.5 text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
                >
                  Read the case study
                </Link>
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
