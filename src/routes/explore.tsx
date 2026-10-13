import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { LABS, REALMS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { CASES } from "@/lib/cases";
import { labFigure } from "@/lib/figures";
import { caseFigure } from "@/lib/case-figures";
import { ProgressImage } from "@/components/progress-media";
import { headFor } from "@/lib/seo";
export const Route = createFileRoute("/explore")({
  component: Explore,
  head: () =>
    headFor({
      title: "Explore the labs",
      description: "Explore interactive 3D Earth science models and classroom sequences by topic.",
      path: "/explore",
    }),
});
const SHIPPED = LABS.filter((l) => LAB_SCENES[l.slug] && isListed(l.slug));
const COLLECTIONS = [
  {
    id: "landscapes",
    title: "How landscapes change",
    description: "Read the terrain, follow a river, then explore the work of waves and ice.",
    labs: ["contours", "rivers", "coasts", "glaciers", "mass-movement", "periglacial"],
  },
  {
    id: "hazards",
    title: "Why natural hazards happen",
    description: "Begin with plate movement and investigate the processes behind damaging events.",
    labs: [
      "plate-boundaries",
      "earthquakes",
      "volcanoes",
      "tsunami",
      "tropical-cyclone",
      "storm-surge",
    ],
  },
  {
    id: "water",
    title: "Follow water through a system",
    description: "Connect the water cycle to catchments, river flow and groundwater.",
    labs: [
      "water-cycle",
      "drainage-basin",
      "hydrograph",
      "river-hydrology",
      "groundwater",
      "carbon-cycle",
    ],
  },
  {
    id: "space",
    title: "Earth, Sun and Moon",
    description: "Use rotation, tilt and orbital motion to explain patterns in the sky.",
    labs: ["rotation", "seasons", "solar-altitude", "moon-phases", "eclipses", "tides"],
  },
];
const field = "min-h-11 rounded-xl border border-white/20 bg-basalt px-3 text-sm text-chalk";
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
function Explore() {
  const [kind, setKind] = useState<"labs" | "cases">("labs"),
    [query, setQuery] = useState(""),
    [realm, setRealm] = useState("all"),
    [stage, setStage] = useState("all"),
    [collection, setCollection] = useState("all"),
    [region, setRegion] = useState("all");
  const selected = COLLECTIONS.find((c) => c.id === collection);
  const list = useMemo(
    () =>
      SHIPPED.filter(
        (l) =>
          (realm === "all" || realm === l.realm) &&
          (stage === "all" || l.ages.some((age) => age === stage)) &&
          (!selected || selected.labs.includes(l.slug)) &&
          fold([l.title, l.hook, ...l.glossary.map((g) => g.term)].join(" ")).includes(
            fold(query.trim()),
          ),
      ).sort((a, b) =>
        selected
          ? selected.labs.indexOf(a.slug) - selected.labs.indexOf(b.slug)
          : a.title.localeCompare(b.title),
      ),
    [realm, stage, selected, query],
  );
  const cases = CASES.filter(
    (c) =>
      (region === "all" || region === c.region) &&
      fold([c.title, c.place, c.lede].join(" ")).includes(fold(query.trim())),
  );
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-16 pt-24">
      <div className="grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="section-label">Explore</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">A world to investigate.</h1>
        </div>
        <p className="self-end text-lg leading-8 text-mist">
          Choose a question, explore the model and connect what you find to a real landscape. Every
          lab is free to use in class or on your own.
        </p>
      </div>
      <div
        className="mt-6 flex gap-6 border-b border-white/15"
        role="tablist"
        aria-label="Explore collection"
      >
        {(["labs", "cases"] as const).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={
              "min-h-12 border-b-2 text-lg " +
              (kind === k ? "border-glacier text-glacier" : "border-transparent text-mist")
            }
          >
            {k === "labs" ? "3D labs" : "Case studies"}{" "}
            <span className="ml-2 text-sm">{k === "labs" ? SHIPPED.length : CASES.length}</span>
          </button>
        ))}
      </div>
      {kind === "labs" && (
        <div className="mt-7">
          <label className="section-label" htmlFor="collection">
            Suggested teaching sequence
          </label>
          <select
            id="collection"
            value={collection}
            onChange={(e) => {
              setCollection(e.target.value);
              setRealm("all");
              setStage("all");
              setQuery("");
            }}
            className={field + " mt-2 w-full sm:ml-4 sm:w-auto"}
          >
            <option value="all">Browse all labs</option>
            {COLLECTIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          {selected && (
            <p className="mt-3 max-w-2xl text-mist">
              {selected.description} The labs below follow this teaching order.
            </p>
          )}
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <label className="relative min-w-0 flex-1 basis-72">
          <span className="sr-only">Search this collection</span>
          <Search size={18} className="absolute left-3 top-3.5 text-mist" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a topic or place"
            className={field + " w-full pl-10"}
          />
        </label>
        {kind === "labs" ? (
          <>
            <select
              aria-label="Subject"
              value={realm}
              onChange={(e) => setRealm(e.target.value)}
              className={field}
            >
              <option value="all">All subjects</option>
              {REALMS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.title}
                </option>
              ))}
            </select>
            <select
              aria-label="Curriculum"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className={field}
            >
              <option value="all">All curricula</option>
              {["KS3", "GCSE", "A-level", "NGSS MS", "HS Earth Sci", "APES"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        ) : (
          <select
            aria-label="Region"
            className={field}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="all">All regions</option>
            {[...new Set(CASES.map((c) => c.region))].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
      </div>
      <p role="status" className="my-6 text-sm text-mist">
        {kind === "labs" ? list.length + " labs" : cases.length + " case studies"}
        {query ? " matching “" + query + "”" : ""}
      </p>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {kind === "labs"
          ? list.map((lab, i) => {
              const photo = labFigure(lab.slug);
              return (
                <Link
                  key={lab.slug}
                  to="/lab/$slug"
                  params={{ slug: lab.slug }}
                  className="editorial-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt"
                >
                  {photo && (
                    <ProgressImage
                      src={photo.src}
                      alt={photo.alt}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs uppercase tracking-widest text-glacier">
                      {selected ? i + 1 + ". " : ""}
                      {REALMS.find((r) => r.slug === lab.realm)?.title}
                    </p>
                    <h2 className="mt-3 font-display text-3xl group-hover:text-glacier">
                      {lab.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-7 text-mist">{lab.hook}</p>
                    <span className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-sm text-glacier">
                      Explore the model <ArrowUpRight size={18} />
                    </span>
                  </div>
                </Link>
              );
            })
          : cases.map((c) => {
              const photo = caseFigure(c.slug);
              return (
                <Link
                  key={c.slug}
                  to="/case/$slug"
                  params={{ slug: c.slug }}
                  className="editorial-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt"
                >
                  {photo && (
                    <ProgressImage
                      src={photo.src}
                      alt={photo.alt}
                      className="aspect-[16/10] w-full object-cover"
                    />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs uppercase tracking-widest text-glacier">{c.region}</p>
                    <h2 className="mt-3 font-display text-3xl group-hover:text-glacier">
                      {c.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-7 text-mist">{c.lede}</p>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm text-glacier">
                      Read the case study <ArrowUpRight size={18} />
                    </span>
                  </div>
                </Link>
              );
            })}
      </div>
      {!(kind === "labs" ? list.length : cases.length) && (
        <div className="py-16 text-center">
          <p className="font-display text-2xl">No matches for these filters.</p>
          <button
            className="mt-4 min-h-11 rounded-full bg-glacier px-6 text-basalt"
            onClick={() => {
              setQuery("");
              setRealm("all");
              setStage("all");
              setCollection("all");
              setRegion("all");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
