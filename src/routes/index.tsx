import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/globe/home-hero";
import { ModelAndPlace } from "@/components/home/model-and-place";
import { QuakeMap } from "@/components/home/quake-map";
import { SubjectTiles } from "@/components/home/subject-tiles";
import { TeacherFlow } from "@/components/home/teacher-flow";
import { TodayCards } from "@/components/home/today-cards";
import { CASE_SUMMARIES } from "@/lib/case-index";
import { LAB_BY_SLUG, LABS, loadLab } from "@/lib/labs/catalog";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";
import { caseCard } from "@/lib/photo-cards";
import { useRecentLabs } from "@/lib/recent-labs";
import { photoSrcSet } from "@/lib/responsive-image";
import { headFor } from "@/lib/seo";

/** The lab whose Guided flow the teacher section shows. */
const EXAMPLE_LAB = "glaciers";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => ({ example: await loadLab(EXAMPLE_LAB) }),
  head: () =>
    headFor({
      title: "3D labs for Earth science and geography",
      description:
        "Free interactive 3D models for teaching Earth science and geography, each with steps for students, check questions, a worksheet and teacher notes.",
      path: "/",
    }),
});

/** Labs offered under the hero as first steps. */
const STARTERS = ["plate-boundaries", "seasons", "tropical-cyclone"];
/** Case studies on the home page, US places first; the first is shown large. */
const FEATURED = ["san-andreas", "mount-st-helens-1980", "katrina-sandy", "dust-bowl"];
const link =
  "text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier";

function Home() {
  const { example } = Route.useLoaderData();
  return (
    <main id="main">
      <section className="mx-auto grid max-w-[1280px] items-center gap-x-12 gap-y-6 px-5 pb-8 pt-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:pb-12 md:pt-28">
        <div>
          <h1 className="max-w-[16ch] font-display text-[2.6rem] leading-[1.08] tracking-[-0.01em] text-chalk md:text-[3.5rem]">
            3D labs for Earth science and geography
          </h1>
          <p className="mt-5 max-w-[34rem] text-lg leading-8 text-mist">
            {`${LABS.length} models you can turn and change, from plate boundaries to hurricanes. Each lab has steps for students, five check questions, a printable worksheet and teacher notes aligned to NGSS, AP and GCSE. Free to use, with no accounts or ads.`}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              to="/explore"
              className="inline-flex min-h-11 items-center rounded-md bg-glacier px-5 font-medium text-void hover:bg-glacier/90"
            >
              Browse the labs
            </Link>
            <Link to="/teachers/courses" className={`min-h-11 py-2.5 font-medium ${link}`}>
              Courses for teachers
            </Link>
          </div>
          <div className="mt-10 max-w-[34rem] border-t border-white/10 pt-5">
            <h2 className="text-sm font-semibold text-chalk">Start with one of these</h2>
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {STARTERS.map((slug) => {
                const lab = LAB_BY_SLUG[slug];
                return (
                  lab && (
                    <li key={slug}>
                      <Link to="/lab/$slug" params={{ slug }} className="group block">
                        <img
                          src={labThumbSrc(slug, 320)}
                          srcSet={labThumbSrcSet(slug)}
                          sizes="170px"
                          width={640}
                          height={480}
                          alt=""
                          className="aspect-[4/3] w-full rounded-[3px] bg-trench object-cover"
                        />
                        <span className="mt-2 block text-sm leading-5 text-chalk underline-offset-4 group-hover:underline">
                          {lab.title}
                        </span>
                      </Link>
                    </li>
                  )
                );
              })}
            </ul>
          </div>
        </div>
        <figure className="mx-auto w-full max-w-[22rem] md:max-w-[38rem]">
          <HomeHero />
          <figcaption className="-mt-3 text-center text-sm text-mist">
            Drag to turn the globe. The clouds are illustrative, not today’s weather.
          </figcaption>
        </figure>
      </section>
      <RecentLabs />
      <SubjectTiles />
      <ModelAndPlace />
      <div className="mt-16 md:mt-24">
        <QuakeMap />
      </div>
      <TodayCards />
      <CaseStudies />
      {example && <TeacherFlow lab={example} />}
    </main>
  );
}

function CaseStudies() {
  const [lead, ...rest] = FEATURED.flatMap((slug) => {
    const c = CASE_SUMMARIES.find((x) => x.slug === slug);
    return c ? [{ ...c, photo: caseCard(slug) }] : [];
  });
  if (!lead) return null;
  return (
    <section aria-labelledby="cases-heading" className="mx-auto max-w-[1280px] px-5 pt-16 md:pt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="cases-heading" className="font-display text-3xl text-chalk md:text-4xl">
          Case studies
        </h2>
        <Link to="/explore" search={{ kind: "cases" }} className={`text-sm ${link}`}>
          {`All ${CASE_SUMMARIES.length} case studies`}
        </Link>
      </div>
      <div className="mt-7 grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Link to="/case/$slug" params={{ slug: lead.slug }} className="group block">
          {lead.photo && (
            <img
              src={lead.photo.src}
              srcSet={photoSrcSet(lead.photo.src)}
              sizes="(min-width: 1024px) 680px, 100vw"
              loading="lazy"
              decoding="async"
              alt={lead.photo.alt}
              className="aspect-[3/2] w-full rounded-[3px] bg-trench object-cover"
            />
          )}
          <p className="mt-4 text-sm text-mist">{lead.place}</p>
          <h3 className="mt-1 font-display text-2xl text-chalk underline-offset-4 group-hover:underline">
            {lead.title}
          </h3>
          <p className="mt-2 max-w-xl leading-7 text-mist">{lead.lede}</p>
        </Link>
        <ul className="divide-y divide-white/10 border-y border-white/10 lg:self-start">
          {rest.map((c) => (
            <li key={c.slug}>
              <Link to="/case/$slug" params={{ slug: c.slug }} className="group flex gap-4 py-4">
                {c.photo && (
                  <img
                    src={c.photo.src}
                    srcSet={photoSrcSet(c.photo.src)}
                    sizes="144px"
                    loading="lazy"
                    decoding="async"
                    alt={c.photo.alt}
                    className="aspect-[4/3] w-28 shrink-0 rounded-[3px] bg-trench object-cover sm:w-36"
                  />
                )}
                <span className="min-w-0">
                  <span className="block text-sm text-mist">{c.place}</span>
                  <span className="mt-0.5 block font-display text-xl leading-snug text-chalk underline-offset-4 group-hover:underline">
                    {c.title}
                  </span>
                  <span className="mt-1 line-clamp-2 text-sm leading-6 text-mist">{c.lede}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Labs this browser opened recently; nothing is stored anywhere else. */
function RecentLabs() {
  const [slugs, forget] = useRecentLabs();
  const labs = slugs
    .map((s) => LAB_BY_SLUG[s])
    .filter(Boolean)
    .slice(0, 3);
  if (labs.length === 0) return null;
  return (
    <section aria-labelledby="recent-labs" className="mx-auto max-w-[1280px] px-5 pb-2">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 pt-4">
        <h2 id="recent-labs" className="text-sm font-semibold text-chalk">
          Continue where you left off
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {labs.map((lab) => (
            <li key={lab.slug}>
              <Link
                to="/lab/$slug"
                params={{ slug: lab.slug }}
                className="group flex items-center gap-2.5 text-sm"
              >
                <img
                  src={labThumbSrc(lab.slug, 160)}
                  width={40}
                  height={30}
                  alt=""
                  className="h-[30px] w-10 rounded-[3px] bg-trench object-cover"
                />
                <span className="text-chalk underline-offset-4 group-hover:underline">
                  {lab.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={forget}
          className="min-h-11 text-sm text-mist underline-offset-4 hover:text-chalk hover:underline"
        >
          Clear
        </button>
      </div>
    </section>
  );
}
