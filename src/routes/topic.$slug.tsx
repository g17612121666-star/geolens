import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { LabCard } from "@/components/lab-card";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/topic/$slug")({
  loader: async ({ params }) => {
    const { LAB_BY_SLUG: labs } = await import("@/lib/labs/catalog");
    const lab = labs[params.slug];
    if (!lab) throw notFound();
    return { title: lab.title, hook: lab.hook };
  },
  component: TopicPage,
  head: ({ params, loaderData }) =>
    headFor({
      title: loaderData?.title ?? "Topic",
      description: loaderData?.hook ?? "A Geolens topic.",
      path: `/topic/${params.slug}`,
    }),
});

function TopicPage() {
  const { slug } = Route.useParams();
  const lab = LAB_BY_SLUG[slug];
  if (!lab) throw notFound();
  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 pb-24 pt-24">
      <p className="section-label">{"Topic"}</p>
      <h1 className="mt-3 font-display text-4xl">{lab.title}</h1>
      <p className="mt-5 text-lg text-mist">{lab.hook}</p>
      <div className="mt-10 max-w-md">
        <LabCard lab={lab} />
      </div>
      <p className="mt-8">
        <Link to="/explore" className="text-ice hover:underline">
          {"Explore labs"}
        </Link>
      </p>
    </main>
  );
}
