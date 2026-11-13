import { createFileRoute, Link } from "@tanstack/react-router";
import { LABS } from "@/lib/labs/catalog";
import { LAB_SCENES } from "@/labs/registry";
import { isListed } from "@/lib/labs/status";
import { FRAMEWORKS, STANDARDS, standardLabel, type Standard } from "@/lib/labs/standards";
import type { LabSummary } from "@/lib/labs/types";
import { headFor, siteOrigin } from "@/lib/seo";

export const Route = createFileRoute("/teachers/standards")({
  component: StandardsPage,
  head: () =>
    headFor({
      title: "Standards alignment",
      description:
        "Every Geolens lab mapped to NGSS, AP Environmental Science, AP Human Geography and the C3 Framework, with England's KS3, GCSE and A-level specifications.",
      path: "/teachers/standards",
    }),
});

const LABS_BY_STANDARD = (() => {
  const map = new Map<string, LabSummary[]>();
  for (const lab of LABS) {
    if (!LAB_SCENES[lab.slug] || !isListed(lab.slug)) continue;
    for (const id of lab.standards) map.set(id, [...(map.get(id) ?? []), lab]);
  }
  return map;
})();

/** NGSS rows stay even without a lab, so coverage gaps are visible; other frameworks list taught standards. */
const rowsFor = (framework: string) =>
  STANDARDS.filter(
    (s) => s.framework === framework && (framework === "NGSS" || LABS_BY_STANDARD.has(s.id)),
  );

function downloadCsv() {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [["Framework", "Code", "Standard", "Lab", "Lab address"]];
  for (const framework of FRAMEWORKS) {
    for (const s of rowsFor(framework.id)) {
      for (const lab of LABS_BY_STANDARD.get(s.id) ?? []) {
        lines.push([framework.name, s.code, s.title, lab.title, `${siteOrigin()}/lab/${lab.slug}`]);
      }
    }
  }
  const blob = new Blob([lines.map((row) => row.map(cell).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "geolens-standards.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

function StandardTable({ rows }: { rows: Standard[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-mist">
          <tr className="border-b border-white/10">
            <th className="w-44 p-2 font-medium">{"Code"}</th>
            <th className="p-2 font-medium">{"Standard (short title)"}</th>
            <th className="p-2 font-medium">{"Labs"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const labs = LABS_BY_STANDARD.get(s.id) ?? [];
            return (
              <tr key={s.id} className="border-b border-white/5 align-top">
                <td className="p-2 font-mono text-glacier">{standardLabel(s.id)}</td>
                <td className="p-2 text-chalk/90">{s.title}</td>
                <td className="p-2">
                  {labs.length === 0 ? (
                    <span className="text-mist">{"No lab yet"}</span>
                  ) : (
                    labs.map((lab, i) => (
                      <span key={lab.slug}>
                        {i > 0 && ", "}
                        <Link
                          to="/teachers/$slug"
                          params={{ slug: lab.slug }}
                          className="text-ice hover:underline"
                        >
                          {lab.title}
                        </Link>
                      </span>
                    ))
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StandardsPage() {
  const ngss = rowsFor("NGSS"),
    covered = ngss.filter((s) => LABS_BY_STANDARD.has(s.id)).length;
  const us = FRAMEWORKS.filter((f) => f.country === "US"),
    uk = FRAMEWORKS.filter((f) => f.country === "UK" && rowsFor(f.id).length > 0);
  return (
    <main id="main" className="mx-auto max-w-[1040px] px-5 pb-24 pt-24 text-chalk">
      <Link
        to="/teachers"
        className="inline-flex min-h-11 items-center text-sm text-ice hover:underline"
      >
        {"Teachers"}
      </Link>
      <h1 className="mt-2 font-display text-4xl">{"Standards alignment"}</h1>
      <p className="mt-3 max-w-2xl text-mist">
        {
          "Every lab mapped to the standards it teaches toward. Titles are short paraphrases; check each framework for its full wording. Open a lab's teacher notes for its lesson plan."
        }
      </p>
      <p className="mt-3 text-sm text-mist">
        {`Labs address ${covered} of the ${ngss.length} NGSS Earth and space science performance expectations.`}
      </p>
      <button
        type="button"
        onClick={downloadCsv}
        className="mt-4 inline-flex min-h-11 items-center rounded-full border border-glacier/30 bg-glacier/10 px-4 text-sm text-glacier"
      >
        {"Download as a spreadsheet (CSV)"}
      </button>
      {us.map((f) => (
        <section key={f.id} className="mt-10" aria-labelledby={`fw-${f.id}`}>
          <h2 id={`fw-${f.id}`} className="font-display text-2xl">
            {f.name}
          </h2>
          <StandardTable rows={rowsFor(f.id)} />
        </section>
      ))}
      <section className="mt-12" aria-labelledby="fw-uk">
        <h2 id="fw-uk" className="font-display text-2xl">
          {"England: KS3, GCSE and A-level"}
        </h2>
        {uk.map((f) => (
          <details key={f.id} className="mt-4">
            <summary className="min-h-11 cursor-pointer py-2 text-chalk">{f.name}</summary>
            <StandardTable rows={rowsFor(f.id)} />
          </details>
        ))}
      </section>
    </main>
  );
}
