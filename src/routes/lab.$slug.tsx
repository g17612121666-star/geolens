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
    if (!LAB_SCENES[params.slug]) throw notFound();
  },
  // The lab catalog and photo register are large, so only lab pages load them.
  loader: async ({ params }) => {
    const [{ LAB_BY_SLUG: labs }, { LAB_FIGURE: figures }] = await Promise.all([
      import("@/lib/labs/catalog"),
      import("@/lib/figures"),
    ]);
    const lab = labs[params.slug];
    if (!lab) throw notFound();
    return { title: lab.title, objective: lab.objective, image: figures[lab.slug]?.src };
  },
  head: ({ params, loaderData }) =>
    loaderData
      ? headFor({
          title: loaderData.title,
          description: loaderData.objective,
          path: `/lab/${params.slug}`,
          image: loaderData.image,
        })
      : headFor({
          title: "Lab not found",
          description: "We could not find this lab on Geolens.",
          path: `/lab/${params.slug}`,
        }),
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
