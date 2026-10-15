import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { GLOSSARY, type GlossaryEntry } from "@/lib/glossary-data";
import { LABS, REALMS } from "@/lib/labs/catalog";
import { headFor } from "@/lib/seo";
import { Figure } from "@/components/figure";
import { termFigure } from "@/lib/figures";

type GlossarySearch = { q?: string; letter?: string; realm?: string; term?: string };
export const Route = createFileRoute("/glossary")({
  component: Glossary,
  validateSearch: (s: Record<string, unknown>): GlossarySearch =>
    Object.fromEntries(
      ["q", "letter", "realm", "term"]
        .filter((k) => typeof s[k] === "string")
        .map((k) => [k, s[k]]),
    ),
  head: () =>
    headFor({
      title: "Glossary",
      description: `${GLOSSARY.length} Earth science terms, real observations and related labs. Search, read or practise recall.`,
      path: "/glossary",
    }),
});
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const key = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-");
const related = (g: GlossaryEntry) =>
  LABS.filter(
    (l) =>
      l.slug === g.lab ||
      l.glossary.some(
        (t) => fold(t.term) === fold(g.term) || (t.exam && fold(t.exam) === fold(g.term)),
      ),
  );
const button =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
const field = "h-12 w-full rounded-xl border border-white/15 bg-basalt px-4 text-chalk";
const PAGE_SIZE = 12;
function Glossary() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);
  const q = search.q ?? "",
    letter = search.letter ?? "all",
    realm = search.realm ?? "all";
  const [page, setPage] = useState(0),
    [revision, setRevision] = useState(false),
    [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [known, setKnown] = useState<string[]>([]),
    [storageReady, setStorageReady] = useState(false),
    [onlyPractice, setOnlyPractice] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem("geolens-glossary-known-v1") ??
          localStorage.getItem("terralens-glossary-known-v1") ??
          "[]",
      );
      if (Array.isArray(v))
        setKnown(v.filter((x) => typeof x === "string" && GLOSSARY.some((g) => key(g.term) === x)));
    } catch {}
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (storageReady)
      try {
        localStorage.setItem("geolens-glossary-known-v1", JSON.stringify(known));
      } catch {
        setNotice(
          "Progress cannot be saved in this browser. Recall practice still works for this visit.",
        );
      }
  }, [known, storageReady]);
  useEffect(() => {
    setPage(0);
    setIndex(0);
    setRevealed(false);
  }, [q, letter, realm, onlyPractice]);
  function update(changes: Partial<GlossarySearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...changes }), replace: true });
  }
  const all = useMemo(() => GLOSSARY.map((g) => ({ ...g, related: related(g) })), []);
  const list = useMemo(() => {
    const needle = fold(q.trim());
    return all.filter(
      (g) =>
        (!needle ||
          fold(
            `${g.term} ${g.def} ${g.exam ?? ""} ${g.related.map((l) => l.title).join(" ")}`,
          ).includes(needle)) &&
        (needle || letter === "all" || fold(g.term).charAt(0).toUpperCase() === letter) &&
        (realm === "all" || g.related.some((l) => l.realm === realm)) &&
        (!onlyPractice || !known.includes(key(g.term))),
    );
  }, [all, q, letter, realm, onlyPractice, known]);
  const selected = all.find((g) => fold(g.term) === fold(search.term ?? ""));
  const current = list[index % Math.max(1, list.length)];
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE)),
    safePage = Math.min(page, pages - 1);
  function changePage(next: number) {
    setPage(Math.max(0, Math.min(pages - 1, next)));
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }
  async function share(term?: string) {
    const url = new URL(window.location.href);
    if (term) url.searchParams.set("term", term);
    try {
      await navigator.clipboard.writeText(url.toString());
      setNotice("Glossary link copied.");
    } catch {
      if (term) update({ term });
      setNotice("Copy the link from the address bar to share this view.");
    }
  }
  function mark(remembered: boolean) {
    if (!current) return;
    const id = key(current.term);
    setKnown((v) => (remembered ? [...new Set([...v, id])] : v.filter((k) => k !== id)));
    if (!onlyPractice || !remembered) setIndex((i) => (i + 1) % Math.max(1, list.length));
    setRevealed(false);
  }
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">{"Glossary"}</p>
          <h1 className="mt-3 font-display text-4xl">{`${GLOSSARY.length} words used in the labs.`}</h1>
        </div>
        <button
          className={`${button} ${revision ? "bg-glacier/15 text-glacier" : ""}`}
          aria-pressed={revision}
          onClick={() => {
            setRevision((v) => !v);
            setRevealed(false);
            update({ term: undefined });
          }}
        >
          {revision ? "Return to reading" : "Practise recall"}
        </button>
      </div>
      <p className="mt-4 max-w-3xl text-mist">
        {
          "Find a term from the labs, understand the process behind it, and see how it appears in the landscape. Each entry connects an explanation with a real observation and a model you can explore."
        }
      </p>
      <p role="status" className="mt-2 text-sm text-glacier">
        {notice}
      </p>
      {selected ? (
        <section className="mt-6">
          <div className="flex flex-wrap gap-2">
            <button className={button} onClick={() => update({ term: undefined })}>
              {"← Back to results"}
            </button>
            <button className={button} onClick={() => share(selected.term)}>
              {"Share this term"}
            </button>
          </div>
          <article className="mt-5 grid gap-6 rounded-2xl border border-white/10 bg-white/[.025] p-5 md:grid-cols-2">
            <div>
              <p className="section-label">{"Term"}</p>
              <h2 className="mt-3 font-display text-4xl">{selected.term}</h2>
              {selected.exam && (
                <p className="mt-2 text-sm text-glacier">
                  {"Also written: "}
                  {selected.exam}
                </p>
              )}
              <Definition entry={selected} />
              <LabLinks labs={selected.related} />
              <button
                className={`${button} mt-5`}
                onClick={() =>
                  setKnown((v) =>
                    v.includes(key(selected.term))
                      ? v.filter((k) => k !== key(selected.term))
                      : [...v, key(selected.term)],
                  )
                }
              >
                {known.includes(key(selected.term))
                  ? "Marked understood · practise again"
                  : "Mark understood"}
              </button>
            </div>
            <div>
              {termFigure(selected.term) && <Figure {...termFigure(selected.term)!} caption="" />}
            </div>
          </article>
        </section>
      ) : (
        <>
          {search.term && (
            <p className="mt-3 text-sm text-mist">
              {"That term link is not recognised. Search the glossary below."}
            </p>
          )}
          <section
            aria-label={"Find terms"}
            className="mt-6 rounded-2xl border border-white/10 p-5"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_16rem]">
              <label>
                <span className="mb-2 block text-sm text-mist">
                  {"Search terms and definitions"}
                </span>
                <input
                  className={field}
                  value={q}
                  placeholder={"Cirque, arete, terminator…"}
                  onChange={(e) => update({ q: e.target.value || undefined })}
                />
              </label>
              <label>
                <span className="mb-2 block text-sm text-mist">{"Subject"}</span>
                <select
                  className={field}
                  value={realm}
                  onChange={(e) => update({ realm: e.target.value })}
                >
                  <option value="all">{"All subjects"}</option>
                  {REALMS.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <nav aria-label={"A to Z"} className="mt-4 flex flex-wrap gap-1">
              {["all", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map((L) => {
                const present =
                  L === "all" || all.some((g) => fold(g.term).charAt(0).toUpperCase() === L);
                return (
                  <button
                    key={L}
                    className={`${button} ${L === "all" ? "" : "!w-11 !px-0"} ${!q && letter === L ? "bg-glacier/15 text-glacier" : ""}`}
                    disabled={!present}
                    aria-pressed={!q && letter === L}
                    onClick={() => update({ q: undefined, letter: L })}
                  >
                    {L === "all" ? "All" : L}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyPractice}
                  onChange={(e) => setOnlyPractice(e.target.checked)}
                />
                {"Needs practice"}
              </label>
              <p className="text-mist">{`${known.length} / ${GLOSSARY.length} marked understood · saved on this device`}</p>
              <button
                className="min-h-11 text-mist underline"
                onClick={() => {
                  update({ q: undefined, letter: undefined, realm: undefined });
                  setOnlyPractice(false);
                }}
              >
                {"Clear filters"}
              </button>
            </div>
          </section>
          <div
            ref={resultsRef}
            tabIndex={-1}
            aria-label={"Glossary results"}
            className="mt-5 scroll-mt-20 flex flex-wrap items-center justify-between gap-3 outline-none"
          >
            <p role="status" className="font-mono text-sm text-mist">
              {`${list.length} matching terms`}
              {revision ? " · recall mode" : ""}
            </p>
            <button className={button} onClick={() => share()}>
              {"Share these results"}
            </button>
          </div>
          {!list.length ? (
            <div className="mt-5 rounded-2xl border border-white/10 p-8">
              <h2 className="font-display text-2xl">{"No terms in this selection."}</h2>
              <p className="mt-3 text-mist">
                {"Try another spelling, choose All subjects or turn off “Needs practice”."}
              </p>
            </div>
          ) : revision && current ? (
            <section
              aria-label={"Recall card"}
              className="mx-auto mt-6 max-w-3xl rounded-2xl border border-white/10 bg-white/[.025] p-6"
            >
              <p className="font-mono text-xs text-glacier">{`Recall ${(index % list.length) + 1} / ${list.length}`}</p>
              <h2 className="mt-4 font-display text-4xl">{current.term}</h2>
              <p className="mt-4 text-mist">
                {"Explain it aloud. Name one process or observation that distinguishes it."}
              </p>
              {revealed ? (
                <>
                  <Definition entry={current} />
                  {termFigure(current.term) && (
                    <Figure {...termFigure(current.term)!} caption="" className="mt-5" />
                  )}
                  <LabLinks labs={current.related} />
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      className={`${button} border-glacier/30 bg-glacier/10 text-glacier`}
                      onClick={() => mark(true)}
                    >
                      {"Got it · next"}
                    </button>
                    <button className={button} onClick={() => mark(false)}>
                      {"Practise again · next"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  className={`${button} mt-6 bg-glacier/15 text-glacier`}
                  onClick={() => setRevealed(true)}
                >
                  {"Reveal definition and observation"}
                </button>
              )}
              <p className="mt-4 text-xs text-mist">
                {"Self-assessment for revision, not a scored test. No account is needed."}
              </p>
            </section>
          ) : (
            <>
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {list.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE).map((g) => (
                  <article
                    key={g.term}
                    className="rounded-2xl border border-white/10 bg-white/[.02] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-2xl">
                        <Link
                          to="/glossary"
                          search={{ ...search, term: g.term }}
                          className="hover:text-glacier"
                        >
                          {g.term}
                        </Link>
                      </h2>
                      {known.includes(key(g.term)) && (
                        <span className="text-xs text-glacier">{"Understood"}</span>
                      )}
                    </div>
                    {g.exam && <p className="mt-1 text-xs text-glacier">{g.exam}</p>}
                    <Definition entry={g} />
                    {termFigure(g.term) && (
                      <Figure {...termFigure(g.term)!} caption="" className="mt-4" />
                    )}
                    <LabLinks labs={g.related} />
                    <Link
                      to="/glossary"
                      search={{ ...search, term: g.term }}
                      className={`${button} mt-4`}
                    >
                      {"Read and share term →"}
                    </Link>
                  </article>
                ))}
              </div>
              <nav
                aria-label={"Glossary pages"}
                className="mt-6 flex items-center justify-center gap-4"
              >
                <button
                  className={button}
                  disabled={safePage === 0}
                  onClick={() => changePage(safePage - 1)}
                >
                  {"Previous"}
                </button>
                <p className="text-sm text-mist">{`Page ${safePage + 1} / ${pages}`}</p>
                <button
                  className={button}
                  disabled={safePage + 1 >= pages}
                  onClick={() => changePage(safePage + 1)}
                >
                  {"Next"}
                </button>
              </nav>
            </>
          )}
        </>
      )}
      <p className="mt-8 text-xs leading-6 text-mist">
        {"Explore further with "}
        <a
          className="text-ice underline"
          href="https://www.usgs.gov/water-science-school/science/water-science-glossary"
        >
          {"USGS water glossary"}
        </a>{" "}
        ·{" "}
        <a
          className="text-ice underline"
          href="https://www.usgs.gov/glossary/volcano-hazards-program-glossary"
        >
          {"USGS volcano glossary"}
        </a>{" "}
        ·{" "}
        <a
          className="text-ice underline"
          href="https://www.nps.gov/glac/learn/nature/glacial-geology.htm"
        >
          {"NPS glacial geology"}
        </a>{" "}
        ·{" "}
        <a className="text-ice underline" href="https://science.nasa.gov/earth/facts/">
          {"NASA Earth facts"}
        </a>
        {". Photograph acknowledgements are collected on the Image credits page."}
      </p>
    </main>
  );
}
function LabLinks({ labs }: { labs: typeof LABS }) {
  return (
    <div className="mt-5">
      <h3 className="section-label">{"Related labs"}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {labs.map((l) => (
          <Link
            key={l.slug}
            to="/lab/$slug"
            params={{ slug: l.slug }}
            className={`${button} text-ice`}
          >
            {l.title} →
          </Link>
        ))}
      </div>
    </div>
  );
}

function Definition({ entry }: { entry: GlossaryEntry }) {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-base leading-7 text-chalk/90">{entry.def}</p>
      {entry.observation && (
        <div className="border-l-2 border-glacier/30 pl-4">
          <h3 className="text-sm font-medium text-glacier">What to look for</h3>
          <p className="mt-2 text-sm leading-6 text-mist">{entry.observation}</p>
        </div>
      )}
    </div>
  );
}
