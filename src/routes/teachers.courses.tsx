import { createFileRoute, Link } from "@tanstack/react-router";
import { ClassroomShare } from "@/components/classroom-share";
import { LABS } from "@/lib/labs/catalog";
import { COURSES, COURSE_BY_ID, planCourse, type CourseId } from "@/lib/labs/courses";
import { STANDARD_BY_ID, standardLabel } from "@/lib/labs/standards";
import { isListed } from "@/lib/labs/status";
import type { LabSummary } from "@/lib/labs/types";
import { labThumbSrc, labThumbSrcSet } from "@/lib/lab-thumbs";
import { headFor, siteOrigin } from "@/lib/seo";
import { cn } from "@/lib/utils";

type CoursesSearch = { course?: CourseId };

export const Route = createFileRoute("/teachers/courses")({
  component: CoursesPage,
  // The chosen course lives in the address, so a department can share a link to it.
  validateSearch: (s: Record<string, unknown>): CoursesSearch =>
    typeof s.course === "string" && s.course in COURSE_BY_ID
      ? { course: s.course as CourseId }
      : {},
  head: () =>
    headFor({
      title: "Courses",
      description:
        "Geolens labs arranged by course, unit and standard: NGSS middle and high school Earth and space science, AP Environmental Science, AP Human Geography, and England from KS3 to A level.",
      path: "/teachers/courses",
    }),
});

const LISTED = LABS.filter((lab) => isListed(lab.slug));

function CoursesPage() {
  const { course: id = "ms" } = Route.useSearch();
  const course = COURSE_BY_ID[id];
  const units = planCourse(course, LISTED);
  const courseStandards = new Set(course.units.flatMap((u) => u.standards));
  return (
    <main id="main" className="mx-auto max-w-[1180px] px-5 pb-24 pt-24 text-chalk">
      <nav aria-label="Breadcrumb" className="text-sm">
        <Link to="/teachers" className="text-ice underline underline-offset-4">
          Teachers
        </Link>
        <span className="text-mist"> / Courses</span>
      </nav>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">Courses</h1>
      <p className="mt-4 max-w-2xl leading-7 text-mist">
        Labs arranged by course, unit and standard. Each lab has a Guided mode for students, a
        printable worksheet and teacher notes, and you can share it to Google Classroom from here.
        Standard titles are short paraphrases; check the framework for the full wording.
      </p>
      <nav aria-label="Courses" className="mt-8 border-b border-white/10">
        <ul className="-mb-px flex flex-wrap gap-x-1">
          {COURSES.map((c) => (
            <li key={c.id} className="shrink-0">
              <Link
                to="/teachers/courses"
                search={c.id === "ms" ? {} : { course: c.id }}
                aria-current={c.id === id ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-3 py-3 text-[15px] transition-colors",
                  c.id === id
                    ? "border-glacier font-medium text-chalk"
                    : "border-transparent text-mist hover:text-chalk",
                )}
              >
                {c.short}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-8 grid gap-x-12 gap-y-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-display text-2xl">{course.title}</h2>
          <p className="mt-2 text-sm leading-6 text-mist">{course.summary}</p>
          <nav aria-label="Units" className="mt-5">
            <ul className="space-y-1 border-l border-white/10 text-sm">
              {units.map((unit) => (
                <li key={unit.id}>
                  <a
                    href={`#${unit.id}`}
                    className="-ml-px block border-l border-transparent py-1 pl-3 text-chalk underline-offset-4 hover:border-glacier hover:underline"
                  >
                    {unit.title}
                    <span className="block text-xs text-mist">{countLabs(unit.groups)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 space-y-14">
          {units.map((unit) => (
            <section
              key={unit.id}
              id={unit.id}
              aria-labelledby={`${unit.id}-title`}
              className="scroll-mt-24"
            >
              <h2 id={`${unit.id}-title`} className="font-display text-2xl md:text-3xl">
                {unit.title}
              </h2>
              {unit.groups.map((group) => (
                <section key={group.standard} aria-label={standardLabel(group.standard)}>
                  <h3 className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-chalk/25 pb-2">
                    <span className="font-mono text-sm text-glacier">
                      {standardLabel(group.standard)}
                    </span>
                    <span className="font-medium">{STANDARD_BY_ID[group.standard]?.title}</span>
                  </h3>
                  <ul className="divide-y divide-white/10">
                    {group.labs.map((lab) => (
                      <LabRow
                        key={lab.slug}
                        lab={lab}
                        also={lab.standards.filter(
                          (s) => s !== group.standard && courseStandards.has(s),
                        )}
                      />
                    ))}
                  </ul>
                </section>
              ))}
              {unit.gaps.length > 0 && (
                <p className="mt-5 text-sm leading-6 text-mist">
                  {`No lab yet for ${unit.gaps
                    .map((s) => `${standardLabel(s)} (${STANDARD_BY_ID[s]?.title})`)
                    .join("; ")}.`}
                </p>
              )}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

const countLabs = (groups: { labs: LabSummary[] }[]) => {
  const n = groups.reduce((sum, g) => sum + g.labs.length, 0);
  return `${n} ${n === 1 ? "lab" : "labs"}`;
};

function LabRow({ lab, also }: { lab: LabSummary; also: string[] }) {
  const guided = `/lab/${lab.slug}?guided=1`;
  const link =
    "text-glacier underline decoration-glacier/40 underline-offset-4 hover:decoration-glacier";
  return (
    <li className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-4 sm:grid-cols-[6rem_minmax(0,1fr)] xl:grid-cols-[6rem_minmax(0,1fr)_auto]">
      <img
        src={labThumbSrc(lab.slug, 160)}
        srcSet={labThumbSrcSet(lab.slug)}
        sizes="96px"
        width={96}
        height={72}
        loading="lazy"
        decoding="async"
        alt=""
        className="aspect-[4/3] w-full rounded-[3px] bg-trench object-cover"
      />
      <div className="min-w-0">
        <Link
          to="/lab/$slug"
          params={{ slug: lab.slug }}
          className="font-medium text-chalk underline-offset-4 hover:underline"
        >
          {lab.title}
        </Link>
        <p className="mt-1 text-sm leading-6 text-mist">{lab.objective}</p>
        {also.length > 0 && (
          <p className="mt-1 text-xs leading-5 text-mist">{`Also ${also.map(standardLabel).join(", ")}`}</p>
        )}
      </div>
      <div className="col-start-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm xl:col-start-3 xl:justify-end xl:self-center">
        <a href={guided} className={link}>
          Guided
        </a>
        <Link to="/worksheet/$slug" params={{ slug: lab.slug }} className={link}>
          Worksheet
        </Link>
        <Link to="/teachers/$slug" params={{ slug: lab.slug }} className={link}>
          Notes
        </Link>
        <ClassroomShare
          href={`${siteOrigin()}${guided}`}
          current={() => `${window.location.origin}${guided}`}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-white/15 px-3 text-chalk hover:border-glacier"
        >
          Share to <span className="sr-only">Google </span>Classroom
        </ClassroomShare>
      </div>
    </li>
  );
}
