import { Link } from "@tanstack/react-router";
import { LABS, REALMS, labsInRealm } from "@/lib/labs/catalog";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";

/** The lab whose model stands for each subject on the home page. */
const COVER: Record<string, string> = {
  planet: "seasons",
  interior: "earth-interior",
  atmosphere: "three-cell",
  water: "water-cycle",
  landforms: "coasts",
  soils: "rock-cycle",
  hazards: "volcanoes",
  skills: "contours",
};

/** The eight subjects as picture tiles, each leading to its subject page. */
export function SubjectTiles() {
  return (
    <section
      aria-labelledby="subjects-heading"
      className="mx-auto max-w-[1280px] px-5 pt-16 md:pt-24"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="subjects-heading" className="font-display text-3xl text-chalk md:text-4xl">
          Explore by subject
        </h2>
        <Link
          to="/explore"
          className="text-sm text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
        >
          {`Search and filter all ${LABS.length} labs`}
        </Link>
      </div>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-4">
        {REALMS.map((realm) => {
          const count = labsInRealm(realm.slug).length,
            cover = COVER[realm.slug];
          return (
            <li key={realm.slug}>
              <Link to="/realms/$realm" params={{ realm: realm.slug }} className="group block">
                {cover && (
                  <img
                    src={labThumbSrc(cover, 320)}
                    srcSet={labThumbSrcSet(cover)}
                    sizes="(min-width: 1280px) 300px, (min-width: 768px) 24vw, 46vw"
                    width={640}
                    height={480}
                    loading="lazy"
                    decoding="async"
                    alt=""
                    className="aspect-[4/3] w-full rounded-[3px] bg-trench object-cover"
                  />
                )}
                <span className="mt-3 block font-display text-xl text-chalk underline-offset-4 group-hover:underline md:text-2xl">
                  {realm.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-mist">
                  {`${realm.kicker} · ${count} labs`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
