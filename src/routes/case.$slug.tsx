import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CASE_BY_SLUG } from "@/lib/cases";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MiniMap } from "@/components/map/mini-map";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { headFor, learningResourceJsonLd, siteOrigin } from "@/lib/seo";
import { Figure } from "@/components/figure";
import { caseFigure } from "@/lib/case-figures";

export const Route = createFileRoute("/case/$slug")({
  beforeLoad: ({ params }) => {
    if (!CASE_BY_SLUG[params.slug]) throw notFound();
  },
  component: CasePage,
  head: ({ params }) => {
    const c = CASE_BY_SLUG[params.slug];
    return headFor({
      title: c?.title ?? "Case",
      description: c?.lede ?? "A Geolens case study.",
      path: `/case/${params.slug}`,
      image: c ? caseFigure(c.slug)?.src : undefined,
    });
  },
});

function CasePage() {
  const { slug } = Route.useParams();
  const c = CASE_BY_SLUG[slug];
  if (!c) throw notFound();
  const labs = c.labs.map((s) => LAB_BY_SLUG[s]).filter(Boolean);
  const openSlug = c.labs[0];
  const href = openSlug ? `/lab/${openSlug}${c.state ? `?${c.state}` : ""}` : "/explore";
  const fig = caseFigure(c.slug);
  const jsonLd = learningResourceJsonLd({
    name: c.title,
    description: c.lede,
    url: `${siteOrigin()}/case/${c.slug}`,
    educationalLevel: ["KS3", "GCSE", "A-level", "NGSS", "APES"],
    about: c.place,
    image: fig?.src,
  });
  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 pb-24 pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="section-label">
        {"Case study"} <span className="ml-3 text-mist">{c.region}</span>
      </p>
      <h1 className="mt-3 font-display text-4xl">{c.title}</h1>
      <p className="mt-2 text-glacier">{c.place}</p>
      <p className="mt-6 text-lg leading-7 text-chalk/90">{c.lede}</p>
      {fig && <Figure {...fig} className="mt-6" />}
      <div className="mt-8">
        <MiniMap lat={c.lat} lon={c.lon} zoom={c.zoom} label={c.title} />
        <p className="mt-2 font-mono text-[11px] text-mist">
          {"Location: "}
          {c.lat.toFixed(2)}°, {c.lon.toFixed(2)}°
        </p>
      </div>
      <div className="mt-8 space-y-4 text-[17px] leading-7 text-mist">
        {c.body.map((p) => (
          <p key={p.slice(0, 48)}>{p}</p>
        ))}
      </div>
      {openSlug && (
        <div className="mt-8">
          <Button asChild>
            <a href={href}>{"Open this setup in the lab"}</a>
          </Button>
        </div>
      )}
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
        <p className="section-label">{"Exam-style question"}</p>
        <p className="mt-3 text-chalk">{c.exam.prompt}</p>
        <p className="mt-3 text-sm text-mist">
          {"Teacher hint: "}
          {c.exam.hint}
        </p>
      </section>
      {labs.length > 0 && (
        <div className="mt-10">
          <p className="section-label mb-3">{"Related labs"}</p>
          <div className="flex flex-wrap gap-2">
            {labs.map((lab) => (
              <Link key={lab.slug} to="/lab/$slug" params={{ slug: lab.slug }}>
                <Badge tone="ice">{lab.title}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-10">
        <p className="section-label mb-2">{"Sources"}</p>
        <ul className="space-y-1 text-sm text-mist">
          {c.sources.map((s) => (
            <li key={s.label}>
              {s.href ? (
                <a
                  href={s.href}
                  className="text-ice hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.label}
                </a>
              ) : (
                s.label
              )}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
