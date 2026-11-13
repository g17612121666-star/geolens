import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LABS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { GLOSSARY } from "@/lib/glossary-data";
import { ATLAS } from "@/lib/atlas-data";
import { Button } from "@/components/ui/button";
import { headFor } from "@/lib/seo";
import { isListed } from "@/lib/labs/status";
import { TEACHER_ARTICLES, TEACHER_SCRIPTS } from "virtual:lab-search";
import { CASES_BY_REGION as CASES } from "@/lib/cases";

import { expandSearchNeedle } from "@/lib/search-aliases";
import { buildIndex, searchIndex } from "@/lib/site-search";
import { STANDARD_BY_ID, standardLabel } from "@/lib/labs/standards";

// A standard is found by its code ("HS-ESS2-6", "APES 4.7") or its title.
const standardSearchText = (id: string) =>
  `${standardLabel(id)} ${STANDARD_BY_ID[id]?.title ?? ""}`;

type SearchParams = { q?: string };

export const Route = createFileRoute("/search")({
  component: SearchPage,
  validateSearch: (s: Record<string, unknown>): SearchParams =>
    typeof s.q === "string" && s.q ? { q: s.q } : {},
  head: () =>
    headFor({
      title: "Search",
      description: "Find a Geolens lab, glossary term, atlas place, tool or teacher note.",
      path: "/search",
    }),
});

const SHIPPED = LABS.filter((l) => LAB_SCENES[l.slug] && isListed(l.slug));

const TOOL_HITS = [
  {
    to: "/tools/earth-motion" as const,
    title: "Earth-motion calculator",
    hay: "declination noon altitude sunrise day length tilt analemma seasons",
  },
  {
    to: "/tools/live-weather" as const,
    title: "Live weather",
    hay: "open-meteo temperature wind gusts pressure precipitation humidity",
  },
  {
    to: "/tools/map" as const,
    title: "World map studio",
    hay: "relief rivers plates koppen climate graticule san andreas holderness",
  },
  {
    to: "/atlas" as const,
    title: "Atlas",
    hay: "countries us states california hawaii alaska japan iceland uk nations hong kong shanghai taiwan macau",
  },
];

const POPULAR = [
  { q: "seasons", label: "seasons" },
  { q: "Grand Canyon", label: "Grand Canyon" },
  { q: "hurricanes", label: "hurricanes" },
  { q: "San Andreas", label: "San Andreas" },
] as const;

// Indexes are built once: titles first, then summaries, then body text.
const LAB_INDEX = buildIndex(SHIPPED, (l) => [
  { text: l.title, weight: 6 },
  { text: `${l.hook} ${l.objective}`, weight: 3 },
  {
    text: [
      l.realm,
      ...l.standards.map(standardSearchText),
      ...l.ages,
      ...l.glossary.map((g) => g.term),
    ].join(" "),
    weight: 2,
  },
  { text: TEACHER_SCRIPTS[l.slug] ?? "", weight: 1 },
]);
const TERM_INDEX = buildIndex(GLOSSARY, (g) => [
  { text: g.term, weight: 6 },
  { text: g.def, weight: 2 },
  { text: `${g.exam ?? ""} ${g.labTitle}`, weight: 1 },
]);
const PLACE_INDEX = buildIndex(ATLAS, (p) => [
  { text: p.name, weight: 6 },
  { text: [p.capital, ...(p.alias ?? [])].join(" "), weight: 4 },
  { text: [p.hook, ...(p.geo ?? [])].join(" "), weight: 1 },
]);
const TOOL_INDEX = buildIndex(TOOL_HITS, (t) => [
  { text: t.title, weight: 6 },
  { text: t.hay, weight: 2 },
]);
const CASE_INDEX = buildIndex(CASES, (c) => [
  { text: c.title, weight: 6 },
  { text: `${c.place} ${c.region}`, weight: 4 },
  { text: c.lede, weight: 2 },
  { text: c.body.join(" "), weight: 1 },
]);
let noteIndex: ReturnType<typeof buildNoteIndex> | null = null;
function buildNoteIndex() {
  return buildIndex(
    SHIPPED.map((l) => ({ lab: l, article: TEACHER_ARTICLES[l.slug] })),
    (n) => [
      { text: n.lab.title, weight: 6 },
      { text: `${n.article.title} ${n.article.kicker} ${n.lab.objective}`, weight: 3 },
      { text: n.article.sections.map((s) => s.paragraphs.join(" ")).join(" "), weight: 1 },
    ],
  );
}

function SearchPage() {
  const initial = Route.useSearch().q ?? "";
  const [q, setQState] = useState(initial);
  const navigate = useNavigate({ from: "/search" });
  // Keep the query in the address, so a search can be shared or returned to with Back.
  const setQ = (value: string) => {
    setQState(value);
    void navigate({ search: value.trim() ? { q: value } : {}, replace: true });
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const needle = expandSearchNeedle(q);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const labs = useMemo(
    () =>
      needle
        ? searchIndex(LAB_INDEX, needle)
        : SHIPPED.filter((l) => ["seasons", "coasts", "hydrograph"].includes(l.slug)),
    [needle],
  );

  const terms = useMemo(
    () =>
      needle
        ? searchIndex(TERM_INDEX, needle)
        : GLOSSARY.filter((g) => /spit|stack|cirque|hydrograph|terminator/i.test(g.term)).slice(
            0,
            8,
          ),
    [needle],
  );

  const places = useMemo(
    () =>
      needle
        ? searchIndex(PLACE_INDEX, needle).slice(0, 12)
        : ATLAS.filter((p) =>
            /california|hawaii|alaska|japan|iceland/i.test(
              `${p.name} ${(p.alias ?? []).join(" ")}`,
            ),
          ),
    [needle],
  );

  const tools = useMemo(() => (needle ? searchIndex(TOOL_INDEX, needle) : TOOL_HITS), [needle]);

  const notes = useMemo(() => {
    if (!needle)
      return SHIPPED.filter((l) => ["seasons", "coasts", "earthquakes"].includes(l.slug)).map(
        (l) => ({ lab: l, article: TEACHER_ARTICLES[l.slug] }),
      );
    noteIndex ??= buildNoteIndex();
    return searchIndex(noteIndex, needle).slice(0, 10);
  }, [needle]);

  const caseHits = useMemo(
    () =>
      needle
        ? searchIndex(CASE_INDEX, needle).slice(0, 8)
        : CASES.filter((c) =>
            /grand canyon|san andreas|katrina|st\. helens/i.test(`${c.title} ${c.place}`),
          ),
    [needle],
  );

  const empty =
    needle.length > 0 &&
    labs.length === 0 &&
    terms.length === 0 &&
    places.length === 0 &&
    tools.length === 0 &&
    notes.length === 0 &&
    caseHits.length === 0;

  return (
    <main id="main" className="mx-auto max-w-[900px] px-5 pb-24 pt-24">
      <p className="section-label">{"Search"}</p>
      <h1 className="mt-3 font-display text-4xl text-chalk md:text-5xl">
        {"Find a lab, a word, a place."}
      </h1>
      <p className="mt-3 text-sm text-mist">
        {"Search for a topic or place. Press / to focus the search box."}
      </p>
      <label className="relative mt-8 block">
        <span className="sr-only">{"Search Geolens"}</span>
        <input
          ref={inputRef}
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={"Seasons, Grand Canyon, Coriolis, San Andreas…"}
          className="h-12 w-full rounded-[16px] border border-white/10 bg-white/6 px-4 pr-24 text-chalk placeholder:text-mist/70"
          suppressHydrationWarning
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              inputRef.current?.focus();
            }}
            className="absolute right-2 top-1/2 inline-flex h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-full px-3 font-mono text-[11px] text-mist hover:text-chalk"
          >
            {"Clear"}
          </button>
        )}
      </label>

      {!needle && (
        <div className="mt-5 flex flex-wrap gap-2">
          {POPULAR.map((p) => (
            <button
              key={p.q}
              type="button"
              onClick={() => setQ(p.q)}
              className="h-9 rounded-full border border-white/10 bg-white/6 px-3 text-sm text-chalk hover:bg-white/10"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {empty ? (
        <div className="mt-16 max-w-lg">
          <h2 className="font-display text-2xl">{"No results found."}</h2>
          <p className="mt-3 text-mist">{"Try a subject, landform or place name."}</p>
          <Button asChild className="mt-6">
            <Link to="/explore">{"Explore labs"}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-12 space-y-12">
          <section>
            <p className="section-label">
              {"Labs · "}
              {labs.length}
            </p>
            <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {labs.slice(0, 16).map((l) => (
                <li key={l.slug}>
                  <Link
                    to="/lab/$slug"
                    params={{ slug: l.slug }}
                    className="flex flex-col gap-1 py-4 hover:text-glacier"
                  >
                    <span className="font-display text-xl text-chalk">{l.title}</span>
                    <span className="text-sm text-mist">{l.hook}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">
              {"Terms · "}
              {terms.length}
            </p>
            <ul className="mt-4 space-y-4">
              {terms.slice(0, 12).map((g, i) => (
                <li key={`${g.term}-${g.lab}-${i}`}>
                  <p className="font-medium text-chalk">{g.term}</p>
                  <p className="text-sm text-mist">{g.def}</p>
                  <Link to="/glossary" className="text-sm text-ice hover:underline">
                    {"Glossary"}
                  </Link>
                  {" · "}
                  <Link
                    to="/lab/$slug"
                    params={{ slug: g.lab }}
                    className="text-sm text-ice hover:underline"
                  >
                    {g.labTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">
              {"Places · "}
              {places.length}
            </p>
            <ul className="mt-4 space-y-3">
              {places.map((p) => (
                <li key={p.id}>
                  <Link to="/atlas" search={{ place: p.id }} className="hover:text-glacier">
                    <p className="font-display text-xl text-chalk">{p.name}</p>
                    <p className="text-sm text-mist">
                      {p.capital !== "—" ? `Capital ${p.capital}. ` : ""}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">
              {"Case studies · "}
              {caseHits.length}
            </p>
            <ul className="mt-4 space-y-2">
              {caseHits.map((c) => (
                <li key={c.slug}>
                  <Link to="/case/$slug" params={{ slug: c.slug }} className="hover:text-glacier">
                    <p className="font-display text-xl text-chalk">{c.title}</p>
                    <p className="text-sm text-mist">{c.place}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">
              {"Tools · "}
              {tools.length}
            </p>
            <ul className="mt-4 space-y-2">
              {tools.map((t) => (
                <li key={t.to}>
                  <Link to={t.to} className="font-display text-xl text-chalk hover:text-glacier">
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <p className="section-label">
              {"Teacher notes · "}
              {notes.length}
            </p>
            <ul className="mt-4 space-y-2">
              {notes.map((n) => (
                <li key={n.lab.slug}>
                  <Link
                    to="/teachers/$slug"
                    params={{ slug: n.lab.slug }}
                    className="hover:text-glacier"
                  >
                    <p className="font-display text-xl text-chalk">{n.lab.title}</p>
                    <p className="text-sm text-mist">{n.article.kicker}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </main>
  );
}
