import { createFileRoute, redirect, notFound } from "@tanstack/react-router";
import { REALMS, labsInRealm } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { REALM_ALIASES } from "@/lib/redirects";
import { LabCard } from "@/components/lab-card";
import { headFor } from "@/lib/seo";
import { Figure } from "@/components/figure";
import { REALM_FIGURE } from "@/lib/figures";

export const Route = createFileRoute("/realms/$realm")({
  beforeLoad: ({ params }) => {
    const alias = REALM_ALIASES[params.realm];
    if (alias) throw redirect({ to: "/realms/$realm", params: { realm: alias } });
    if (!REALMS.some((r) => r.slug === params.realm)) throw notFound();
  },
  head: ({ params }) => {
    const meta = REALMS.find((r) => r.slug === params.realm);
    return headFor({
      title: meta?.title ?? "Subject",
      description: meta?.blurb ?? "A Geolens subject.",
      path: `/realms/${params.realm}`,
      image: meta ? REALM_FIGURE[meta.slug]?.src : undefined,
    });
  },
  component: RealmPage,
});

function RealmPage() {
  const { realm } = Route.useParams();
  const meta = REALMS.find((r) => r.slug === realm);
  if (!meta) throw notFound();
  const labs = labsInRealm(meta.slug).filter((l) => LAB_SCENES[l.slug] && isListed(l.slug));
  const fig = REALM_FIGURE[meta.slug];
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <div className="grid items-center gap-8 border-b border-white/10 pb-10 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="section-label">{"Subject"}</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">{meta.title}</h1>
          <p className="mt-3 text-lg text-glacier">{meta.kicker}</p>
          <p className="mt-5 max-w-xl text-lg leading-8 text-mist">{meta.blurb}</p>
          <p className="mt-6 text-sm text-mist">
            {labs.length} {labs.length === 1 ? "interactive lab" : "interactive labs"}
          </p>
        </div>
        {fig && <Figure {...fig} className="realm-cover" />}
      </div>
      {labs.length === 0 ? (
        <p className="mt-16 max-w-lg text-mist">
          {"There are no labs in this subject yet. Try Explore to find another topic."}
        </p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {labs.map((lab) => (
            <LabCard key={lab.slug} lab={lab} />
          ))}
        </div>
      )}
    </main>
  );
}
