import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { Suspense } from "react";
import { loadLab } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { LAB_ALIASES } from "@/lib/redirects";
import { LabPlayer } from "@/components/lab/lab-player";
import { LabLoadFallback, LabEntry } from "@/components/lab/load-gate";
import { headFor, learningResourceJsonLd, siteOrigin } from "@/lib/seo";
import { FRAMEWORK_BY_ID, STANDARD_BY_ID } from "@/lib/labs/standards";

export const Route = createFileRoute("/lab/$slug")({
  beforeLoad: ({ params }) => {
    const alias = LAB_ALIASES[params.slug];
    if (alias) throw redirect({ to: "/lab/$slug", params: { slug: alias } });
    if (!LAB_SCENES[params.slug]) throw notFound();
  },
  // A lab page loads its own lesson and the photo register only; lists of labs use summaries.
  loader: async ({ params }) => {
    const [lab, { LAB_FIGURE: figures }] = await Promise.all([
      loadLab(params.slug),
      import("@/lib/figures"),
    ]);
    if (!lab) throw notFound();
    return { lab, image: figures[lab.slug]?.src };
  },
  head: ({ params, loaderData }) =>
    loaderData
      ? headFor({
          title: loaderData.lab.title,
          description: loaderData.lab.objective,
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
  const { lab, image } = Route.useLoaderData();
  const Scene = LAB_SCENES[slug];

  if (!Scene) {
    throw notFound();
  }

  const jsonLd = learningResourceJsonLd({
    name: lab.title,
    description: lab.objective,
    url: `${siteOrigin()}/lab/${lab.slug}`,
    educationalLevel: lab.ages,
    about: lab.realm,
    image,
    alignments: lab.standards.flatMap((id) => {
      const s = STANDARD_BY_ID[id];
      return s
        ? [{ framework: FRAMEWORK_BY_ID[s.framework].name, code: s.code, name: s.title }]
        : [];
    }),
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
