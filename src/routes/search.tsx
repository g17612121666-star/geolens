import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LABS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { GLOSSARY } from "@/lib/glossary-data";
import { ATLAS } from "@/lib/atlas-data";
import { Button } from "@/components/ui/button";
import { headFor } from "@/lib/seo";
import { isListed } from "@/lib/labs/status";
import { teacherArticle } from "@/lib/teachers/article";
import { CASES } from "@/lib/cases";

import { expandSearchNeedle } from "@/lib/search-aliases";

export const Route = createFileRoute("/search")({
  component: SearchPage,
  head: () =>
    headFor({
      title: "Search",
      description: "Find a Geolens lab, glossary term, atlas place, tool, or teacher note.",
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
    hay: "relief rivers plates koppen graticule holderness san andreas",
  },
  {
    to: "/atlas" as const,
    title: "Atlas",
    hay: "countries uk nations us states japan iceland california hawaii hong kong shanghai taiwan macau",
  },
];

const POPULAR = [
  { q: "seasons", label: "seasons" },
  { q: "coasts", label: "coasts" },
  { q: "Holderness", label: "Holderness" },
  { q: "San Andreas", label: "San Andreas" },
] as const;

function SearchPage() {
  const [q, setQ] = useState("");
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

  const labs = useMemo(() => {
    const pool = SHIPPED;
    if (!needle) return pool.filter((l) => ["seasons", "coasts", "hydrograph"].includes(l.slug));
    return pool.filter((l) =>
      [
        l.title,
        l.hook,
        l.objective,
        l.realm,
        l.teacher.script,
        ...l.curriculum,
        ...l.ages,
        ...l.glossary.map((g) => g.term),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [needle]);

  const terms = useMemo(() => {
    if (!needle)
      return GLOSSARY.filter((g) => /spit|stack|cirque|hydrograph|terminator/i.test(g.term)).slice(
        0,
        8,
      );
    return GLOSSARY.filter((g) =>
      [g.term, g.def, g.exam ?? ""].join(" ").toLowerCase().includes(needle),
    );
  }, [needle]);

  const places = useMemo(() => {
    if (!needle)
      return ATLAS.filter((p) =>
        /holderness|japan|iceland|california|hawaii/i.test(
          `${p.name} ${(p.alias ?? []).join(" ")}`,
        ),
      );
    return ATLAS.filter((p) =>
      [p.name, p.capital, p.hook, ...(p.alias ?? []), ...(p.geo ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    ).slice(0, 12);
  }, [needle]);

  const tools = useMemo(() => {
    if (!needle) return TOOL_HITS;
    return TOOL_HITS.filter((t) => `${t.title} ${t.hay}`.toLowerCase().includes(needle));
  }, [needle]);

  const notes = useMemo(() => {
    const pool = SHIPPED.map((l) => ({ lab: l, article: teacherArticle(l) }));
    if (!needle)
      return pool.filter((p) => ["seasons", "coasts", "earthquakes"].includes(p.lab.slug));
    return pool
      .filter((p) =>
        `${p.lab.title} ${p.lab.objective} ${p.article.title} ${p.article.kicker} ${p.article.sections.map((s) => s.paragraphs.join(" ")).join(" ")}`
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 10);
  }, [needle]);

  const caseHits = useMemo(() => {
    if (!needle)
      return CASES.filter((c) =>
        /holderness|san andreas|shanghai|hong kong/i.test(`${c.title} ${c.place}`),
      );
    return CASES.filter((c) =>
      [c.title, c.place, c.lede, ...c.body, c.region].join(" ").toLowerCase().includes(needle),
    ).slice(0, 8);
  }, [needle]);

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
          placeholder={"Seasons, Holderness, Coriolis, San Andreas…"}
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
