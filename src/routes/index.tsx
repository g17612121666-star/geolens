import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { HomeHero } from "@/components/globe/home-hero";
import { ProgressImage } from "@/components/progress-media";
import { Button } from "@/components/ui/button";
import { LabFilmstrip } from "@/components/lab-filmstrip";
import { REALMS, labsInRealm } from "@/lib/labs/catalog";
import { REALM_FIGURE, labFigure } from "@/lib/figures";
import { CASES } from "@/lib/cases";
import { caseFigure } from "@/lib/case-figures";
import { headFor } from "@/lib/seo";
export const Route = createFileRoute("/")({
  component: Home,
  head: () =>
    headFor({
      title: "Understand the Earth in 3D",
      description:
        "Free interactive geography and Earth science models for students, teachers and school geography clubs.",
      path: "/",
    }),
});
const FEATURED = ["holderness", "mississippi", "hong-kong-landslide", "shanghai-huangpu"];
const SUMMARIES: Record<string, string> = {
  holderness: "See how waves erode soft cliffs and move sediment along the Holderness coast.",
  mississippi:
    "Follow a large river across its floodplain and investigate how people manage flood risk.",
  "hong-kong-landslide":
    "Explore how intense rain and weathered rock contribute to landslides on steep slopes.",
  "shanghai-huangpu":
    "Investigate how a low-lying city manages river water and coastal flood risk.",
};
function Home() {
  const classroom = labFigure("soil-texture");
  return (
    <main id="main">
      <section className="home-intro mx-auto grid max-w-[1280px] items-center gap-4 px-5 pb-10 pt-24 md:grid-cols-2 md:gap-8 md:pb-16 md:pt-28">
        <div className="relative z-10">
          <p className="section-label text-glacier">An open classroom for Earth science</p>
          <h1 className="mt-5 max-w-xl font-display text-5xl leading-tight text-chalk lg:text-7xl">
            Understand the Earth in 3D.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-mist">
            Rotate a model, change a variable and see how the Earth works. Explore geography through
            interactive labs and the landscapes they help explain.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="pill">
              <Link to="/explore">
                Explore the labs <ArrowUpRight size={18} />
              </Link>
            </Button>
            <Button asChild size="pill" variant="secondary">
              <Link to="/teachers">Plan a lesson</Link>
            </Button>
          </div>
          <p className="mt-6 max-w-md text-sm leading-6 text-mist">
            Completely free for students, teachers and school geography clubs, with no account,
            adverts or paywall.
          </p>
        </div>
        <div
          className="hero-globe relative aspect-square min-w-0 overflow-hidden rounded-full"
          aria-label="Interactive model of Earth"
        >
          <HomeHero />
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] border-t border-white/10 px-5 py-12 md:py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="section-label">Explore by subject</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">
              Where would you like to begin?
            </h2>
          </div>
          <Link
            to="/explore"
            className="hidden min-h-11 items-center gap-2 text-sm text-glacier sm:flex"
          >
            All labs <ArrowUpRight size={18} />
          </Link>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REALMS.map((r) => {
            const photo = REALM_FIGURE[r.slug];
            return (
              <Link
                key={r.slug}
                to="/realms/$realm"
                params={{ realm: r.slug }}
                className="editorial-card group overflow-hidden rounded-2xl border border-white/10 bg-basalt"
              >
                {photo && (
                  <ProgressImage
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-[3/2] w-full object-cover"
                  />
                )}
                <div className="p-5">
                  <p className="text-xs uppercase tracking-widest text-glacier">
                    {labsInRealm(r.slug).length} labs
                  </p>
                  <h3 className="mt-2 font-display text-2xl group-hover:text-glacier">{r.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-mist">{r.blurb}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="mx-auto max-w-[1280px] px-5 pb-12 md:pb-16">
        <p className="section-label">Inside the models</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">
          A closer look at familiar questions.
        </h2>
        <LabFilmstrip />
      </section>
      <section className="mx-auto max-w-[1280px] px-5 pb-12 md:pb-16">
        <p className="section-label">From the model to the landscape</p>
        <h2 className="mt-3 font-display text-3xl md:text-4xl">Earth science in real places.</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {FEATURED.map((slug) => {
            const c = CASES.find((x) => x.slug === slug);
            if (!c) return null;
            const fig = caseFigure(slug);
            return (
              <Link
                key={slug}
                to="/case/$slug"
                params={{ slug }}
                className="editorial-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt"
              >
                {fig && (
                  <ProgressImage
                    src={fig.src}
                    alt={fig.alt}
                    className="aspect-[4/3] w-full object-cover"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs uppercase tracking-widest text-glacier">{c.region}</p>
                  <h3 className="mt-2 font-display text-2xl group-hover:text-glacier">{c.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-mist">{SUMMARIES[slug]}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm text-glacier">
                    Read the case study <ArrowUpRight size={16} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      <section className="border-t border-white/10 bg-basalt">
        <div className="mx-auto grid max-w-[1280px] items-center gap-8 px-5 py-12 md:grid-cols-2">
          {classroom && (
            <ProgressImage
              src={classroom.src}
              alt={classroom.alt}
              className="aspect-video w-full rounded-2xl object-cover"
            />
          )}
          <div>
            <p className="section-label">For the classroom and geography club</p>
            <h2 className="mt-3 font-display text-3xl md:text-4xl">
              Build a lesson around a question.
            </h2>
            <p className="mt-4 max-w-lg leading-7 text-mist">
              Start with a landscape, test an explanation in 3D, then ask students to describe what
              changed. Teaching notes pair each model with discussion prompts, common misconceptions
              and questions to check understanding.
            </p>
            <Button asChild className="mt-6" variant="secondary">
              <Link to="/teachers">
                Browse teaching resources <ArrowUpRight size={18} />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
