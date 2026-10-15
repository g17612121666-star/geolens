import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LAB_BY_SLUG, labsInRealm } from "@/lib/labs/catalog";
import { LabCard } from "@/components/lab-card";
import { LAB_SCENES } from "@/labs/registry";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/skills")({
  component: Skills,
  head: () =>
    headFor({
      title: "Skills studio",
      description:
        "Practise map skills in 3D: contours, latitude and longitude, map projections and grid references.",
      path: "/skills",
    }),
});

function Skills() {
  const labs = labsInRealm("skills").filter((l) => LAB_SCENES[l.slug]);
  const extras = ["hydrograph", "soil-texture"]
    .map((s) => LAB_BY_SLUG[s])
    .filter(Boolean)
    .filter((l) => !labs.some((x) => x.slug === l.slug));
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <p className="section-label">{"Skills studio"}</p>
      <h1 className="mt-3 font-display text-4xl">{"Read the map, then the hill."}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-7 text-mist">
        {
          "Practise map skills in 3D: contours, latitude and longitude, map projections and grid references, then a hydrograph and a soil texture triangle. Many GCSE map questions start with contours, so begin there. To browse with photos, open the "
        }
        <Link to="/realms/$realm" params={{ realm: "skills" }} className="text-ice hover:underline">
          {"Skills subject page"}
        </Link>
        {"."}
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {labs.map((lab) => (
          <LabCard key={lab.slug} lab={lab} />
        ))}
      </div>
      {extras.length > 0 && (
        <>
          <h2 className="mt-16 font-display text-2xl">{"Skills labs in other subjects"}</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {extras.map((lab) => (
              <LabCard key={lab.slug} lab={lab} />
            ))}
          </div>
        </>
      )}
      <Button asChild className="mt-10" variant="secondary">
        <Link to="/explore">{"All labs"}</Link>
      </Button>
    </main>
  );
}
