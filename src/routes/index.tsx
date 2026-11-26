import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { HomeHero } from "@/components/globe/home-hero";
import { ModelAndPlace } from "@/components/home/model-and-place";
import { QuakeMap } from "@/components/home/quake-map";
import { SubjectTiles } from "@/components/home/subject-tiles";
import { TeacherFlow } from "@/components/home/teacher-flow";
import { TodayCards } from "@/components/home/today-cards";
import { CASE_SUMMARIES } from "@/lib/case-index";
import { watchInkTop } from "@/lib/ink-header";
import { LAB_BY_SLUG, LABS, loadLab } from "@/lib/labs/catalog";
import { labThumbSrc } from "@/lib/lab-thumbs";
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

/** Case studies on the home page, US places first; the first is shown large. */
const FEATURED = ["san-andreas", "mount-st-helens-1980", "katrina-sandy", "dust-bowl"];
const link =
  "text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier";
/** One card style for every picture card on the page. */
const card = "zoom-card group overflow-hidden rounded-[10px] border border-white/10 bg-basalt";

function Home() {
  const { example } = Route.useLoaderData();
  useEffect(watchInkTop, []);
  return (
    <main id="main">
      <section className="ink-band" data-ink-top="">
        <div className="mx-auto grid max-w-[1280px] items-center gap-x-10 gap-y-2 px-5 pb-4 pt-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] md:pb-8 md:pt-20">
          <div>
            <h1 className="max-w-[15ch] font-display text-[2.7rem] leading-[1.04] tracking-[-0.015em] text-chalk sm:text-[3.4rem] lg:text-[4.15rem]">
              3D labs for Earth science and geography
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-8 text-mist">
              {`${LABS.length} models you can turn and change, from plate boundaries to hurricanes. Each lab has steps for students, five check questions, a printable worksheet and teacher notes aligned to NGSS, AP and GCSE. Free to use, with no accounts or ads.`}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Link
                to="/explore"
                className="inline-flex min-h-12 items-center rounded-md bg-glacier px-6 font-medium text-void hover:bg-glacier/90"
              >
                Browse the labs
              </Link>
              <Link to="/teachers/courses" className={`min-h-11 py-2.5 font-medium ${link}`}>
                Courses for teachers
              </Link>
            </div>
          </div>
          <figure className="mx-auto w-full max-w-[24rem] md:max-w-[35rem]">
            <HomeHero />
            <figcaption className="mt-1 text-center text-sm text-mist">
              Drag to turn the globe. The clouds are illustrative, not today’s weather.
            </figcaption>
          </figure>
        </div>
      </section>
      <RecentLabs />
      <SubjectTiles />
      <ModelAndPlace />
      <QuakeMap />
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
    <section aria-labelledby="cases-heading" className="mx-auto max-w-[1280px] px-5 pt-20 md:pt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="cases-heading" className="font-display text-3xl text-chalk md:text-[2.5rem]">
          Case studies
        </h2>
        <Link to="/explore" search={{ kind: "cases" }} className={`text-sm ${link}`}>
          {`All ${CASE_SUMMARIES.length} case studies`}
        </Link>
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Link to="/case/$slug" params={{ slug: lead.slug }} className={`${card} flex flex-col`}>
          {lead.photo && (
            <span className="block overflow-hidden bg-trench">
              <img
                src={lead.photo.src}
                srcSet={photoSrcSet(lead.photo.src)}
                sizes="(min-width: 1280px) 700px, (min-width: 1024px) 56vw, 100vw"
                loading="lazy"
                decoding="async"
                alt={lead.photo.alt}
                className="zoom-img aspect-[16/10] w-full object-cover"
              />
            </span>
          )}
          <span className="block p-6 md:p-7">
            <span className="block text-sm text-mist">{lead.place}</span>
            <span className="mt-1 block font-display text-[1.75rem] leading-tight text-chalk">
              {lead.title}
            </span>
            <span className="mt-2 block max-w-xl leading-7 text-mist">{lead.lede}</span>
          </span>
        </Link>
        <ul className="grid gap-5">
          {rest.map((c) => (
            <li key={c.slug}>
              <Link
                to="/case/$slug"
                params={{ slug: c.slug }}
                className={`${card} flex h-full min-h-32`}
              >
                {c.photo && (
                  <span className="relative block w-32 shrink-0 overflow-hidden bg-trench sm:w-48">
                    <img
                      src={c.photo.src}
                      srcSet={photoSrcSet(c.photo.src)}
                      sizes="192px"
                      loading="lazy"
                      decoding="async"
                      alt={c.photo.alt}
                      className="zoom-img absolute inset-0 size-full object-cover"
                    />
                  </span>
                )}
                <span className="min-w-0 self-center px-5 py-4">
                  <span className="block text-sm text-mist">{c.place}</span>
                  <span className="mt-0.5 block font-display text-xl leading-snug text-chalk">
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
    <section aria-labelledby="recent-labs" className="ink-band" data-ink-top="">
      <div className="mx-auto max-w-[1280px] px-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/10 py-4">
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
                    className="h-[30px] w-10 rounded-[3px] bg-[#f7f3eb] object-cover"
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
      </div>
    </section>
  );
}
