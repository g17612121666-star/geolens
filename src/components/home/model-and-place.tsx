import { Link } from "@tanstack/react-router";
import { photoSrcSet } from "@/lib/responsive-image";
import { cn } from "@/lib/utils";

type Pair = {
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

function Compare({ pair, large }: { pair: Pair; large: boolean }) {
  const sizes = large ? "(min-width: 1024px) 600px, 50vw" : "(min-width: 1024px) 300px, 50vw";
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-3">
      <figure className="min-w-0">
        <img
          src={`/home/models/${pair.model}-640.webp`}
          srcSet={`/home/models/${pair.model}-640.webp 640w, /home/models/${pair.model}.webp 1280w`}
          sizes={sizes}
          width={640}
          height={480}
          loading="lazy"
          decoding="async"
          alt={`${pair.lab.title} lab: a 3D model of ${pair.place}`}
          className="aspect-[4/3] w-full rounded-[3px] bg-[#f2efe6] object-cover"
        />
        <figcaption className="mt-1.5 text-xs leading-5 text-mist">{pair.modelNote}</figcaption>
      </figure>
      <figure className="min-w-0">
        <img
          src={pair.photo.src}
          srcSet={photoSrcSet(pair.photo.src)}
          sizes={sizes}
          loading="lazy"
          decoding="async"
          alt={pair.photo.alt}
          className="aspect-[4/3] w-full rounded-[3px] bg-trench object-cover"
        />
        <figcaption className="mt-1.5 text-xs leading-5 text-mist">Photograph</figcaption>
      </figure>
    </div>
  );
}

function Text({ pair, large }: { pair: Pair; large: boolean }) {
  return (
    <div>
      <h3 className={cn("font-display text-chalk", large ? "text-3xl" : "text-2xl")}>
        {pair.place}
      </h3>
      <p className={cn("mt-2 leading-7 text-mist", large ? "max-w-xl" : "")}>{pair.text}</p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <a
          href={pair.lab.href}
          className="font-medium text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
        >
          {`Open ${pair.lab.title}`}
        </a>
        <Link
          to="/case/$slug"
          params={{ slug: pair.caseSlug }}
          className="text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
        >
          Read the case study
        </Link>
      </p>
    </div>
  );
}

/** Three labs set in real US landscapes, each beside a photograph of the place. */
export function ModelAndPlace() {
  const [lead, ...rest] = PAIRS;
  return (
    <section
      aria-labelledby="places-heading"
      className="mx-auto max-w-[1280px] px-5 pt-16 md:pt-24"
    >
      <div className="max-w-3xl">
        <h2 id="places-heading" className="font-display text-3xl text-chalk md:text-4xl">
          Real places, rebuilt in 3D
        </h2>
        <p className="mt-3 text-lg leading-8 text-mist">
          Several labs open on real landscapes in the United States. Compare the model with a
          photograph of the place, then change the model to see how the landscape formed.
        </p>
      </div>
      <article className="mt-8 grid items-end gap-x-10 gap-y-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Compare pair={lead} large />
        <Text pair={lead} large />
      </article>
      <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
        {rest.map((pair) => (
          <article key={pair.model} className="space-y-4">
            <Compare pair={pair} large={false} />
            <Text pair={pair} large={false} />
          </article>
        ))}
      </div>
    </section>
  );
}
