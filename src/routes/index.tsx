import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeHero } from "@/components/globe/home-hero";
import { TodayStrip } from "@/components/today-strip";
import { CASE_SUMMARIES } from "@/lib/case-index";
import { LAB_BY_SLUG, LABS, REALMS, labsInRealm } from "@/lib/labs/catalog";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";
import { caseCard } from "@/lib/photo-cards";
import { useRecentLabs } from "@/lib/recent-labs";
import { photoSrcSet } from "@/lib/responsive-image";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/")({
  component: Home,
  head: () =>
    headFor({
      title: "3D labs for Earth science and geography",
      description:
        "Free interactive 3D models for teaching Earth science and geography, each with steps for students, check questions, a worksheet and teacher notes.",
      path: "/",
    }),
});

/** Case studies on the home page, US places first; the first is shown large. */
const FEATURED = ["grand-canyon", "san-andreas", "mississippi", "tohoku-2011"];
const SUMMARIES: Record<string, string> = {
  "grand-canyon":
    "Read nearly two billion years of Earth history in the walls of a river-cut canyon.",
  "san-andreas": "Two plates slide past each other along California’s best-known fault.",
  mississippi: "A large river crosses its floodplain, and people try to manage the flood risk.",
  "tohoku-2011": "A subduction-zone earthquake sent a tsunami onto the coast of Japan.",
};

function Home() {
  return (
    <main id="main">
      <section className="mx-auto grid max-w-[1280px] items-center gap-x-12 gap-y-6 px-5 pb-10 pt-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:pb-14 md:pt-28">
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
            <Link
              to="/teachers/courses"
              className="min-h-11 py-2.5 font-medium text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
            >
              Courses for teachers
            </Link>
          </div>
        </div>
        <figure className="mx-auto w-full max-w-[22rem] md:max-w-[35rem]">
          <HomeHero />
          <figcaption className="-mt-3 text-center text-sm text-mist">
            Drag to turn the globe. The clouds are illustrative, not today’s weather.
          </figcaption>
        </figure>
      </section>
      <RecentLabs />
      <TodayStrip />
      <SubjectIndex />
      <CaseStudies />
      <ForTeachers />
    </main>
  );
}

/** Every lab, grouped by subject like an atlas index, each with a picture of its model. */
function SubjectIndex() {
  return (
    <section aria-labelledby="labs-heading" className="mx-auto max-w-[1280px] px-5 pt-12 md:pt-16">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="labs-heading" className="font-display text-3xl text-chalk">
          Labs by subject
        </h2>
        <Link
          to="/explore"
          className="text-sm text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
        >
          {`Search and filter all ${LABS.length} labs`}
        </Link>
      </div>
      <div className="mt-6 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {REALMS.map((realm) => {
          const labs = labsInRealm(realm.slug);
          return (
            <section key={realm.slug} aria-labelledby={`subject-${realm.slug}`}>
              <h3
                id={`subject-${realm.slug}`}
                className="flex items-baseline justify-between gap-3 border-b border-chalk/25 pb-2"
              >
                <Link
                  to="/realms/$realm"
                  params={{ realm: realm.slug }}
                  className="font-display text-xl text-chalk hover:text-glacier"
                >
                  {realm.title}
                </Link>
                <span className="text-sm tabular-nums text-mist">
                  {labs.length}
                  <span className="sr-only"> labs</span>
                </span>
              </h3>
              <ul className="mt-1.5">
                {labs.map((lab, i) => (
                  // Phones list three labs per subject; the subject page has the rest.
                  <li key={lab.slug} className={i >= 3 ? "max-sm:hidden" : undefined}>
                    <Link
                      to="/lab/$slug"
                      params={{ slug: lab.slug }}
                      className="group flex items-center gap-3 py-1.5"
                    >
                      <img
                        src={labThumbSrc(lab.slug, 160)}
                        srcSet={labThumbSrcSet(lab.slug)}
                        sizes="64px"
                        width={64}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="h-12 w-16 shrink-0 rounded-[3px] bg-trench object-cover"
                      />
                      <span className="text-[15px] leading-5 text-chalk underline-offset-4 group-hover:underline">
                        {lab.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              {labs.length > 3 && (
                <Link
                  to="/realms/$realm"
                  params={{ realm: realm.slug }}
                  className="mt-1 inline-block py-1.5 text-sm text-glacier underline decoration-glacier/40 underline-offset-4 sm:hidden"
                >
                  {`All ${labs.length} ${realm.title} labs`}
                </Link>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function CaseStudies() {
  const [lead, ...rest] = FEATURED.flatMap((slug) => {
    const c = CASE_SUMMARIES.find((x) => x.slug === slug);
    return c ? [{ ...c, photo: caseCard(slug), summary: SUMMARIES[slug] }] : [];
  });
  if (!lead) return null;
  return (
    <section aria-labelledby="cases-heading" className="mx-auto max-w-[1280px] px-5 pt-14 md:pt-20">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 id="cases-heading" className="font-display text-3xl text-chalk">
          Case studies
        </h2>
        <Link
          to="/explore"
          search={{ kind: "cases" }}
          className="text-sm text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier"
        >
          {`All ${CASE_SUMMARIES.length} case studies`}
        </Link>
      </div>
      <div className="mt-6 grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
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
          <p className="mt-4 text-sm text-mist">{lead.region}</p>
          <h3 className="mt-1 font-display text-2xl text-chalk underline-offset-4 group-hover:underline">
            {lead.title}
          </h3>
          <p className="mt-2 max-w-xl leading-7 text-mist">{lead.summary}</p>
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
                  <span className="block text-sm text-mist">{c.region}</span>
                  <span className="mt-0.5 block font-display text-xl leading-snug text-chalk underline-offset-4 group-hover:underline">
                    {c.title}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-mist">{c.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const TEACHER_LINKS = [
  {
    to: "/teachers/courses",
    title: "Courses",
    note: "Labs in unit order for NGSS middle school and high school, AP Environmental Science, AP Human Geography, and England from KS3 to A level",
  },
  {
    to: "/teachers/standards",
    title: "Standards",
    note: "Find the labs for an NGSS, AP, C3 or GCSE code",
  },
  {
    to: "/teachers",
    title: "Teacher notes and worksheets",
    note: `Timings, misconceptions and answers for all ${LABS.length} labs`,
  },
  {
    to: "/teachers/check",
    title: "Check a hand-in code",
    note: "See a student’s Guided answers from the code they hand in",
  },
] as const;

function ForTeachers() {
  return (
    <section aria-labelledby="teachers-heading" className="mt-16 border-t border-white/10 md:mt-24">
      <div className="mx-auto grid max-w-[1280px] gap-x-12 gap-y-6 px-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:py-16">
        <div>
          <h2 id="teachers-heading" className="font-display text-3xl text-chalk">
            For teachers
          </h2>
          <p className="mt-4 max-w-md leading-7 text-mist">
            Every lab can run in Guided mode: students write a prediction, test it in the model,
            explain what happened and answer five questions, then hand in a short code. Share any
            lab to Google Classroom from its page.
          </p>
        </div>
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {TEACHER_LINKS.map((item) => (
            <li key={item.to}>
              <Link to={item.to} className="group block py-4">
                <span className="font-medium text-chalk underline-offset-4 group-hover:underline">
                  {item.title}
                </span>
                <span className="mt-1 block text-sm leading-6 text-mist">{item.note}</span>
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
    <section aria-labelledby="recent-labs" className="mx-auto max-w-[1280px] px-5 pb-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
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
