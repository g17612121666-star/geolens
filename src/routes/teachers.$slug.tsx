import { ProgressFrame } from "@/components/progress-media";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { LAB_BY_SLUG, LABS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { teacherArticle } from "@/lib/teachers/article";
import { Figure } from "@/components/figure";
import { labFigures, teacherHero, termFigure } from "@/lib/figures";
import { labVideos } from "@/lib/lab-videos";
import { headFor } from "@/lib/seo";
import { useState } from "react";
import { LESSON_PHASES, lessonLink, lessonOutline } from "@/lib/teachers/workflow";

export const Route = createFileRoute("/teachers/$slug")({
  beforeLoad: ({ params }) => {
    const lab = LAB_BY_SLUG[params.slug];
    if (!lab || !LAB_SCENES[params.slug] || !isListed(params.slug)) throw notFound();
  },
  component: TeacherArticlePage,
  head: ({ params }) => {
    const lab = LAB_BY_SLUG[params.slug];
    return headFor({
      title: lab ? `Teacher notes · ${lab.title}` : "Teacher notes",
      description: lab
        ? `Illustrated lesson notes, a 3D demonstration and discussion questions for ${lab.title}. Free for teachers and geography clubs.`
        : "Free teacher notes from Geolens.",
      path: `/teachers/${params.slug}`,
      image: lab ? labFigures(lab.slug)[0]?.src : undefined,
    });
  },
});

function TeacherArticlePage() {
  const { slug } = Route.useParams();
  const lab = LAB_BY_SLUG[slug];
  if (!lab || !LAB_SCENES[slug] || !isListed(slug)) throw notFound();
  const article = teacherArticle(lab);
  const figs = labFigures(lab.slug);
  const hero = teacherHero(lab.slug) ?? figs[0];
  const details = lab.glossary
    .map((g) => ({ term: g.term, figure: termFigure(g.term) }))
    .filter(
      (item, i, all) =>
        item.figure &&
        item.figure.src !== hero?.src &&
        all.findIndex((other) => other.figure?.src === item.figure?.src) === i,
    )
    .slice(0, 2);
  const videos = labVideos(lab.slug);
  const more = LABS.filter(
    (l) => l.realm === lab.realm && l.slug !== lab.slug && isListed(l.slug),
  ).slice(0, 4);
  const [status, setStatus] = useState("");
  const [manualCopy, setManualCopy] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);

  async function copy(text: string, message: string) {
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy("");
      setStatus(message);
    } catch {
      setManualCopy(text);
      setStatus("Clipboard access is unavailable. Select and copy the text below.");
    }
  }
  function downloadOutline() {
    const blob = new Blob([lessonOutline(lab, window.location.origin)], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `geolens-${lab.slug}-lesson.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus("Lesson outline prepared for download.");
  }

  return (
    <main
      id="main"
      data-teacher-note
      className={`mx-auto px-5 pb-24 pt-24 print:max-w-none print:px-0 print:pt-0 ${largeText ? "max-w-[960px] text-xl" : "max-w-[800px]"}`}
    >
      <p className="section-label">{"Teachers"}</p>
      <p className="mt-2 font-mono text-sm text-glacier">{article.kicker}</p>
      <h1 className="mt-3 font-display text-4xl text-chalk md:text-5xl">{article.title}</h1>
      <p className="mt-4 text-sm text-mist" data-print-hide>
        <Link to="/teachers" className="text-ice hover:underline">
          {"All teacher notes"}
        </Link>
        {" · "}
        <Link to="/lab/$slug" params={{ slug: lab.slug }} className="text-ice hover:underline">
          {"Open the lab"}
        </Link>
      </p>

      <div className="mt-5 flex flex-wrap gap-2 text-sm" data-print-hide>
        <a
          href={lessonLink(lab)}
          className="inline-flex min-h-11 items-center rounded-full border border-glacier/30 bg-glacier/10 px-4 text-glacier"
        >
          {"Open in projector view"}
        </a>
        <button
          className="min-h-11 rounded-full border border-white/15 px-4 text-ice"
          onClick={() =>
            void copy(lessonOutline(lab, window.location.origin), "Lesson outline copied.")
          }
        >
          {"Copy outline"}
        </button>
        <button
          className="min-h-11 rounded-full border border-white/15 px-4 text-ice"
          onClick={downloadOutline}
        >
          {"Download outline"}
        </button>
        <button
          className="min-h-11 rounded-full border border-white/15 px-4 text-ice"
          onClick={() => window.print()}
        >
          {"Print lesson"}
        </button>
        <Link
          to="/worksheet/$slug"
          params={{ slug: lab.slug }}
          className="inline-flex min-h-11 items-center rounded-full border border-white/15 px-4 text-ice"
        >
          {"Student worksheet"}
        </Link>
        <button
          className="min-h-11 rounded-full border border-white/15 px-4 text-ice"
          aria-pressed={largeText}
          onClick={() => setLargeText((v) => !v)}
        >
          {"Large text"}
        </button>
      </div>
      <p className="mt-3 text-sm text-mist" role="status" data-print-hide>
        {status}
      </p>
      {manualCopy && (
        <label className="mt-3 block text-sm text-mist" data-print-hide>
          {"Text to copy"}
          <textarea
            readOnly
            value={manualCopy}
            onFocus={(e) => e.target.select()}
            className="mt-2 h-40 w-full rounded-xl border border-white/20 bg-basalt p-3 text-chalk"
          />
        </label>
      )}

      {hero && <Figure {...hero} className="mt-8" />}
      <section className="mt-8" aria-label={"Lesson plan"}>
        <h2 className="font-display text-2xl">{"A suggested lesson sequence"}</h2>
        <p className="mt-3 leading-7 text-mist">
          {
            "Use these stages at your own pace. Pause for students to sketch, compare observations or lead part of the demonstration."
          }
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {LESSON_PHASES.map((phase, i) => (
            <li key={phase.name} className="rounded-xl border border-white/10 bg-white/[.025] p-5">
              <p className="font-mono text-xs text-glacier">0{i + 1}</p>
              <h3 className="mt-1 font-display text-2xl">{phase.name}</h3>
              <p className="mt-2 leading-7 text-mist">{lab.steps[i]?.body}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 text-sm" data-print-hide>
                <a
                  className="inline-flex min-h-11 items-center text-ice underline"
                  href={lessonLink(lab, i)}
                >{`Open ${phase.name}`}</a>
                <button
                  className="min-h-11 text-ice underline"
                  onClick={() =>
                    void copy(
                      `${window.location.origin}${lessonLink(lab, i)}`,
                      `${phase.name} link copied.`,
                    )
                  }
                >{`Copy ${phase.name} link`}</button>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" data-print-hide>
        <h2 className="font-display text-2xl">{"Rehearse with the model"}</h2>
        <p className="mt-2 text-sm leading-6 text-mist">
          {
            "The same scene and controls as the lab. Load it when you are ready; use Open in projector view for the full classroom view."
          }
        </p>
        <button
          className="mt-3 min-h-11 rounded-full border border-white/15 px-4 text-sm text-ice"
          aria-expanded={modelOpen}
          onClick={() => setModelOpen((v) => !v)}
        >
          {modelOpen ? "Close model" : "Load interactive model"}
        </button>
        {modelOpen && (
          <ProgressFrame
            key={lab.slug}
            title={`${lab.title} interactive rehearsal`}
            loadingLabel="Loading interactive model"
            loadingDetail="Preparing the model and its controls for your lesson."
            src={lessonLink(lab)}
            className="mt-4 h-[780px] w-full rounded-xl border border-white/10"
            allow="fullscreen"
            allowFullScreen
          />
        )}
      </section>

      {article.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="font-display text-2xl text-chalk">{s.heading}</h2>
          {s.heading.startsWith("Figures") && figs[0] && figs[0].src !== hero?.src && (
            <Figure {...figs[0]} className="mt-4" />
          )}
          {s.paragraphs.map((p) => (
            <p
              key={p.slice(0, 72)}
              className={`mt-4 text-chalk/90 ${largeText ? "text-xl leading-9" : "text-[17px] leading-8"}`}
            >
              {p}
            </p>
          ))}
        </section>
      ))}

      {details.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-2xl">{"Look more closely"}</h2>
          <p className="mt-3 leading-7 text-mist">
            {"Use these observations to connect the vocabulary to features students can identify."}
          </p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {details.map(({ term, figure }) => (
              <div key={term}>
                <h3 className="font-display text-xl">{term}</h3>
                <Figure {...figure!} size="sm" />
                <Link
                  to="/glossary"
                  search={{ term }}
                  className="inline-flex min-h-11 items-center text-sm text-ice underline"
                >
                  Read the definition
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-display text-2xl">{"Sources to keep beside the lesson"}</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6">
          {lab.sources.map((source, i) => (
            <li key={`${source.label}-${i}`}>
              {source.href ? (
                <a
                  href={source.href}
                  className="text-ice underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.label}
                </a>
              ) : (
                source.label
              )}
            </li>
          ))}
        </ul>
      </section>

      {videos.length > 0 && (
        <section className="mt-10" data-print-hide>
          <h2 className="font-display text-2xl text-chalk">{"Watch an explanation"}</h2>
          <div className={`mt-4 grid gap-6 ${videos.length > 1 ? "md:grid-cols-2" : ""}`}>
            {videos.map((video) => (
              <div key={video.youtubeId}>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <ProgressFrame
                    title={video.title}
                    src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                    className="aspect-video w-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
                <p className="mt-2 text-sm text-mist">
                  {video.title} <span className="block mt-1">{video.source}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl text-chalk">{"More in this subject"}</h2>
          <ul className="mt-3 space-y-2">
            {more.map((l) => (
              <li key={l.slug}>
                <Link
                  to="/teachers/$slug"
                  params={{ slug: l.slug }}
                  className="text-ice hover:underline"
                >
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
