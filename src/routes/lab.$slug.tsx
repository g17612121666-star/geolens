import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { LAB_ALIASES } from "@/lib/redirects";
import { LabPlayer } from "@/components/lab/lab-player";
import { LabLoadFallback, LabEntry } from "@/components/lab/load-gate";
import { headFor, learningResourceJsonLd, siteOrigin } from "@/lib/seo";
import { LAB_FIGURE } from "@/lib/figures";

export const Route = createFileRoute("/lab/$slug")({
  beforeLoad: ({ params }) => {
    const alias = LAB_ALIASES[params.slug];
    if (alias) throw redirect({ to: "/lab/$slug", params: { slug: alias } });
    if (!LAB_BY_SLUG[params.slug] || !LAB_SCENES[params.slug]) throw notFound();
  },
  head: ({ params }) => {
    const lab = LAB_BY_SLUG[params.slug];
    if (!lab) {
      return headFor({
        title: "Not on the bench",
        description: "This slug is not a shipped lab.",
        path: `/lab/${params.slug}`,
      });
    }
    return headFor({
      title: lab.title,
      description: lab.objective,
      path: `/lab/${lab.slug}`,
      image: LAB_FIGURE[lab.slug]?.src,
    });
  },
  component: LabPage,
});

function LabPage() {
  const { slug } = Route.useParams();
  const lab = LAB_BY_SLUG[slug];
  const Scene = LAB_SCENES[slug];

  if (!lab || !Scene) {
    throw notFound();
  }

  const jsonLd = learningResourceJsonLd({
    name: lab.title,
    description: lab.objective,
    url: `${siteOrigin()}/lab/${lab.slug}`,
    educationalLevel: lab.ages,
    about: lab.realm,
    image: LAB_FIGURE[lab.slug]?.src,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LabEntry key={slug} slug={slug} title={lab.title}>
        <Suspense fallback={<LabLoadFallback slug={lab.slug} title={lab.title} />}>
          <LabPlayer lab={lab} scene={<Scene />} />
        </Suspense>
      </LabEntry>
    </>
  );
}
