import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { LABS, REALMS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import {
  CASE_SUMMARIES as CASES,
  CASE_SUMMARIES_BY_REGION as CASES_BY_REGION,
  REGIONS,
} from "@/lib/case-index";
import { caseCard } from "@/lib/photo-cards";
import { LabThumb } from "@/components/lab-thumb";
import { ProgressImage } from "@/components/progress-media";
import { buildIndex, searchIndex } from "@/lib/site-search";
import { headFor } from "@/lib/seo";
import { useQuizScores } from "@/lib/quiz-progress";

const ANSWER_KEYS = Object.fromEntries(LABS.map((l) => [l.slug, l.answers]));
type ExploreKey = "kind" | "q" | "realm" | "stage" | "collection" | "region";
type ExploreSearch = Partial<Record<ExploreKey, string>>;
const EXPLORE_KEYS: ExploreKey[] = ["kind", "q", "realm", "stage", "collection", "region"];
/** The curriculum filter option for labs tagged with a Texas TEKS expectation. */
const TEXAS = "Texas TEKS";
export const Route = createFileRoute("/explore")({
  component: Explore,
  // Filters live in the address, so Back, reload and shared links keep them.
  validateSearch: (s: Record<string, unknown>): ExploreSearch =>
    Object.fromEntries(
      EXPLORE_KEYS.filter((k) => typeof s[k] === "string" && s[k]).map((k) => [k, s[k]]),
    ),
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
    description:
      "Start with moving plates, then investigate the processes behind earthquakes, volcanoes and other hazards.",
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
const LAB_INDEX = buildIndex(SHIPPED, (l) => [
  { text: l.title, weight: 6 },
  { text: `${l.hook} ${l.objective}`, weight: 3 },
  { text: l.glossary.map((g) => g.term).join(" "), weight: 2 },
]);
const CASE_INDEX = buildIndex(CASES_BY_REGION, (c) => [
  { text: c.title, weight: 6 },
  { text: c.place, weight: 4 },
  { text: c.lede, weight: 2 },
]);
function Explore() {
  const scores = useQuizScores(ANSWER_KEYS);
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  const kind: "labs" | "cases" = search.kind === "cases" ? "cases" : "labs",
    query = search.q ?? "",
    realm = search.realm ?? "all",
    stage = search.stage ?? "all",
    collection = search.collection ?? "all",
    region = search.region ?? "all";
  // Defaults ("all", "labs", empty) are left out of the address.
  function update(changes: ExploreSearch) {
    void navigate({
      search: (prev) =>
        Object.fromEntries(
          Object.entries({ ...prev, ...changes }).filter(
            ([k, v]) => v && v !== "all" && !(k === "kind" && v === "labs"),
          ),
        ),
      replace: true,
    });
  }
  const selected = COLLECTIONS.find((c) => c.id === collection);
  const needle = query.trim();
  const list = useMemo(() => {
    // With a query, the best matches come first; otherwise the collection's order or A–Z.
    const pool = needle
      ? searchIndex(LAB_INDEX, needle)
      : [...SHIPPED].sort((a, b) =>
          selected
            ? selected.labs.indexOf(a.slug) - selected.labs.indexOf(b.slug)
            : a.title.localeCompare(b.title),
        );
    return pool.filter(
      (l) =>
        (realm === "all" || realm === l.realm) &&
        (stage === "all" ||
          (stage === TEXAS
            ? l.standards.some((id) => id.startsWith("TEKS "))
            : l.ages.some((age) => age === stage))) &&
        (!selected || selected.labs.includes(l.slug)),
    );
  }, [realm, stage, selected, needle]);
  const cases = (needle ? searchIndex(CASE_INDEX, needle) : CASES_BY_REGION).filter(
    (c) => region === "all" || region === c.region,
  );
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-16 pt-24">
      <div className="grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="font-display text-5xl md:text-6xl">Labs and case studies</h1>
        </div>
        <p className="self-end text-lg leading-8 text-mist">
          Find a lab by subject, curriculum or topic, or switch to case studies of real places.
          Every lab is free to use in class or on your own.
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
            onClick={() => update({ kind: k })}
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
            onChange={(e) => update({ collection: e.target.value, realm: "", stage: "", q: "" })}
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
            onChange={(e) => update({ q: e.target.value })}
            placeholder="Search a topic or place"
            className={field + " w-full pl-10"}
          />
        </label>
        {kind === "labs" ? (
          <>
            <select
              aria-label="Subject"
              value={realm}
              onChange={(e) => update({ realm: e.target.value })}
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
              onChange={(e) => update({ stage: e.target.value })}
              className={field}
            >
              <option value="all">All curricula</option>
              {["NGSS MS", "HS Earth Sci", "APES", TEXAS, "KS3", "GCSE", "A-level"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </>
        ) : (
          <select
            aria-label="Region"
            className={field}
            value={region}
            onChange={(e) => update({ region: e.target.value })}
          >
            <option value="all">All regions</option>
            {REGIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        )}
      </div>
      <p role="status" className="my-6 text-sm text-mist">
        {kind === "labs"
          ? list.length + (list.length === 1 ? " lab" : " labs")
          : cases.length + (cases.length === 1 ? " case study" : " case studies")}
        {query ? " matching “" + query + "”" : ""}
      </p>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {kind === "labs"
          ? list.map((lab, i) => (
              <Link
                key={lab.slug}
                to="/lab/$slug"
                params={{ slug: lab.slug }}
                className="editorial-card group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-basalt"
              >
                <div className="aspect-[4/3] overflow-hidden bg-trench">
                  <LabThumb slug={lab.slug} />
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-sm text-glacier">
                    {selected ? i + 1 + ". " : ""}
                    {REALMS.find((r) => r.slug === lab.realm)?.title}
                  </p>
                  <h2 className="mt-2 font-display text-3xl underline-offset-4 group-hover:underline">
                    {lab.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-7 text-mist">{lab.hook}</p>
                  {scores[lab.slug] && (
                    <p className="mt-4 border-t border-white/10 pt-3 font-mono text-xs text-mist">
                      {`Your quiz score ${scores[lab.slug].correct}/${scores[lab.slug].total}`}
                    </p>
                  )}
                </div>
              </Link>
            ))
          : cases.map((c) => {
              const photo = caseCard(c.slug);
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
                    <p className="text-sm text-glacier">{c.region}</p>
                    <h2 className="mt-2 font-display text-3xl underline-offset-4 group-hover:underline">
                      {c.title}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-7 text-mist">{c.lede}</p>
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
            onClick={() => update({ q: "", realm: "", stage: "", collection: "", region: "" })}
          >
            Clear filters
          </button>
        </div>
      )}
    </main>
  );
}
