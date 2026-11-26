import { Link } from "@tanstack/react-router";
import { LABS, REALMS, labsInRealm } from "@/lib/labs/catalog";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";

/**
 * The lab whose model stands for each subject on the home page. Every one of these pictures has
 * the same paper background, so the eight cards read as a set.
 */
const COVER: Record<string, string> = {
  planet: "solar-altitude",
  interior: "earth-interior",
  atmosphere: "three-cell",
  water: "water-cycle",
  landforms: "coasts",
  soils: "rock-cycle",
  hazards: "volcanoes",
  skills: "contours",
};

/**
 * The eight subjects as picture cards, each leading to its subject page. The heading sits at the
 * foot of the hero's ink band and the first row of cards rises over the band's edge.
 */
export function SubjectTiles() {
  return (
    <section aria-labelledby="subjects-heading">
      <div className="ink-band" data-ink-top="">
        <div className="mx-auto max-w-[1280px] px-5 pb-28 md:pb-40">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-white/10 pt-8 md:pt-10">
            <h2 id="subjects-heading" className="font-display text-3xl text-chalk md:text-[2.5rem]">
              Explore by subject
            </h2>
            <Link
              to="/explore"
              className="text-sm text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
            >
              {`Search and filter all ${LABS.length} labs`}
            </Link>
          </div>
        </div>
      </div>
      <ul className="relative mx-auto -mt-20 grid max-w-[1280px] grid-cols-2 gap-3 px-5 sm:gap-5 md:-mt-32 md:grid-cols-4">
        {REALMS.map((realm, i) => {
          const count = labsInRealm(realm.slug).length,
            cover = COVER[realm.slug];
          return (
            <li key={realm.slug}>
              <Link
                to="/realms/$realm"
                params={{ realm: realm.slug }}
                className="zoom-card flex h-full flex-col overflow-hidden rounded-[10px] border border-white/10 bg-basalt"
              >
                <span className="block overflow-hidden bg-[#f7f3eb]">
                  {cover && (
                    <img
                      src={labThumbSrc(cover, 320)}
                      srcSet={labThumbSrcSet(cover)}
                      sizes="(min-width: 1280px) 300px, (min-width: 768px) 24vw, 46vw"
                      width={640}
                      height={480}
                      loading={i < 4 ? undefined : "lazy"}
                      decoding="async"
                      alt=""
                      className="zoom-img aspect-[4/3] w-full object-cover"
                    />
                  )}
                </span>
                <span className="flex flex-1 flex-col px-4 pb-4 pt-3.5 md:px-5 md:pb-5">
                  <span className="font-display text-xl leading-snug text-chalk md:text-2xl">
                    {realm.title}
                  </span>
                  <span className="mt-1 hidden text-sm leading-6 text-mist sm:block">
                    {realm.kicker}
                  </span>
                  <span className="mt-auto pt-2 text-sm text-mist">{`${count} labs`}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
