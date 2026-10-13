import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LABS, REALMS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { headFor } from "@/lib/seo";
import { LESSON_PHASES, lessonLink } from "@/lib/teachers/workflow";
import { teacherHero } from "@/lib/figures";

type TeacherSearch = { q?: string; realm?: string; age?: string; curriculum?: string };
export const Route = createFileRoute("/teachers/")({
  component: TeachersIndex,
  validateSearch: (s: Record<string, unknown>): TeacherSearch =>
    Object.fromEntries(
      ["q", "realm", "age", "curriculum"]
        .filter((k) => typeof s[k] === "string")
        .map((k) => [k, s[k]]),
    ),
  head: () =>
    headFor({
      title: "Teachers",
      description: "Free illustrated lesson notes and 3D models for teachers and geography clubs.",
      path: "/teachers",
    }),
});
const field = "mt-2 min-h-11 w-full rounded-lg border border-white/15 bg-basalt px-3 text-chalk";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm text-ice hover:bg-white/5";
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function TeachersIndex() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  const [status, setStatus] = useState("");
  const shipped = LABS.filter((lab) => LAB_SCENES[lab.slug] && isListed(lab.slug));
  const ages = [...new Set(shipped.flatMap((lab) => lab.ages))];
  const curricula = [...new Set(shipped.flatMap((lab) => lab.curriculum))].sort();
  const needle = fold(search.q ?? "").trim();
  const filtered = shipped.filter(
    (lab) =>
      (!search.realm || lab.realm === search.realm) &&
      (!search.age || lab.ages.some((age) => age === search.age)) &&
      (!search.curriculum || lab.curriculum.includes(search.curriculum)) &&
      (!needle ||
        fold(
          [lab.title, lab.objective, ...lab.glossary.map((g) => g.term), ...lab.curriculum].join(
            " ",
          ),
        ).includes(needle)),
  );
  function update(changes: Partial<TeacherSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...changes }), replace: true });
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("Selection link copied.");
    } catch {
      setStatus("Copy the address-bar link to share this selection.");
    }
  }
  return (
    <main id="main" className="mx-auto max-w-[1080px] px-5 pb-24 pt-24">
      <p className="section-label">{"Teachers"}</p>
      <h1 className="mt-3 max-w-3xl font-display text-4xl text-chalk md:text-5xl">
        {"Bring Earth science into the room."}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-7 text-mist">
        {
          "Start with a real landscape, explore the process in 3D, and give students something to explain. These free lesson notes help teachers and geography clubs prepare a discussion, lead a demonstration or print a handout. You can use every resource without an account."
        }
      </p>
      <ol
        className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4"
        aria-label={"A lesson in four stages"}
      >
        {LESSON_PHASES.map((phase, i) => (
          <li key={phase.name} className="border-t border-glacier/30 py-4">
            <p className="font-mono text-xs text-glacier">0{i + 1}</p>
            <p className="mt-1 font-display text-xl">{phase.name}</p>
            <p className="mt-2 text-sm leading-6 text-mist">
              {
                [
                  "Notice a feature and ask a question.",
                  "Change one variable in the model.",
                  "Connect the result to a process.",
                  "Explain the evidence in your own words.",
                ][i]
              }
            </p>
          </li>
        ))}
      </ol>
      <section
        aria-label={"Find a lesson"}
        className="mt-8 rounded-2xl border border-white/10 bg-white/[.025] p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-mist">
            {"Search lessons"}
            <input
              className={field}
              type="search"
              placeholder={"Rivers, seasons, plate…"}
              value={search.q ?? ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
            />
          </label>
          <label className="text-sm text-mist">
            {"Realm"}
            <select
              className={field}
              value={search.realm ?? ""}
              onChange={(e) => update({ realm: e.target.value || undefined })}
            >
              <option value="">{"All realms"}</option>
              {REALMS.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-mist">
            {"Teaching stage"}
            <select
              className={field}
              value={search.age ?? ""}
              onChange={(e) => update({ age: e.target.value || undefined })}
            >
              <option value="">{"All stages"}</option>
              {ages.map((age) => (
                <option key={age}>{age}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-mist">
            {"Curriculum tag"}
            <select
              className={field}
              value={search.curriculum ?? ""}
              onChange={(e) => update({ curriculum: e.target.value || undefined })}
            >
              <option value="">{"All tags"}</option>
              {curricula.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-mist" role="status">
            {filtered.length} {"of "}
            {shipped.length} {"lessons"}
          </p>
          <button className={button} onClick={() => void navigate({ search: {}, replace: true })}>
            {"Clear filters"}
          </button>
          <button className={button} onClick={() => void share()}>
            {"Share selection"}
          </button>
        </div>
        <p className="mt-2 text-sm text-mist" aria-live="polite">
          {status}
        </p>
      </section>
      {!filtered.length && (
        <p className="mt-10 rounded-xl border border-white/10 p-6 text-mist">
          {"No lessons match this selection. Clear a filter or try a broader term."}
        </p>
      )}
      <div className="mt-10 space-y-12">
        {REALMS.map((realm) => {
          const labs = filtered.filter((lab) => lab.realm === realm.slug);
          return labs.length ? (
            <section key={realm.slug} id={`realm-${realm.slug}`}>
              <h2 className="font-display text-3xl">{realm.title}</h2>
              <div className="mt-5 grid gap-6 md:grid-cols-2">
                {labs.map((lab) => (
                  <article
                    key={lab.slug}
                    className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"
                  >
                    {teacherHero(lab.slug) && (
                      <Link
                        to="/teachers/$slug"
                        params={{ slug: lab.slug }}
                        tabIndex={-1}
                        aria-hidden="true"
                      >
                        <img
                          src={teacherHero(lab.slug)!.src}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          width="640"
                          height="360"
                          className="aspect-video w-full object-cover"
                        />
                      </Link>
                    )}
                    <div className="flex flex-1 flex-col p-6">
                      <h3 className="mt-2 font-display text-2xl">
                        <Link
                          to="/teachers/$slug"
                          params={{ slug: lab.slug }}
                          className="hover:text-glacier"
                        >
                          {lab.title}
                        </Link>
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-chalk/90">{lab.objective}</p>
                      <p className="mb-5 mt-4 border-l-2 border-glacier/40 pl-4 text-sm leading-6 text-mist">
                        <span className="mb-1 block font-medium text-chalk">
                          {"Start a discussion"}
                        </span>
                        {lab.questions[0]?.prompt ??
                          (lab.misconceptions?.[0] ?? lab.misconception).claim}
                      </p>
                      <div className="mt-auto flex flex-wrap gap-2">
                        <Link to="/teachers/$slug" params={{ slug: lab.slug }} className={button}>
                          {"Open the full note"}
                        </Link>
                        <a
                          href={lessonLink(lab)}
                          className={`${button} border-glacier/30 bg-glacier/10`}
                        >
                          {"Start projector"}
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null;
        })}
      </div>
    </main>
  );
}
