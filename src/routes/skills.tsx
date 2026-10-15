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
      description: "Contours, graticule, projections, and grid references.",
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
        {"This page is the skills studio — a bench of labs you can open."}{" "}
        <Link to="/realms/$realm" params={{ realm: "skills" }} className="text-ice hover:underline">
          {"/realms/skills"}
        </Link>{" "}
        {
          "is the same realm as a catalogue card: hook, photo, and the list. Start here to run a contour or a projection; use the realm page to browse. GCSE map questions are contour questions. Then the graticule, a projection, a grid reference, a hydrograph, a texture triangle."
        }
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {labs.map((lab) => (
          <LabCard key={lab.slug} lab={lab} />
        ))}
      </div>
      {extras.length > 0 && (
        <>
          <h2 className="mt-16 font-display text-2xl">{"Also a skill, housed in another realm"}</h2>
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
