import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { LAB_BY_SLUG } from "@/lib/labs/catalog";
import { findHandIns } from "@/lib/hand-in";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/teachers/check")({
  component: CheckCodes,
  head: () =>
    headFor({
      title: "Check hand-in codes",
      description:
        "Paste students' Geolens hand-in codes to see their quiz scores and completed tasks. Nothing is uploaded.",
      path: "/teachers/check",
    }),
});

const LETTERS = ["A", "B", "C", "D"];

/** Decodes pasted hand-in codes entirely in the browser; nothing is sent or stored. */
function CheckCodes() {
  const [text, setText] = useState("");
  const rows = useMemo(
    () =>
      findHandIns(text).map((row) => {
        const lab = row.result ? LAB_BY_SLUG[row.result.slug] : undefined;
        const marks = lab
          ? lab.questions.map((q, i) => {
              const a = row.result!.answers[i];
              return a == null ? null : a === q.answer;
            })
          : [];
        return {
          ...row,
          lab,
          marks,
          score: marks.filter((m) => m === true).length,
        };
      }),
    [text],
  );
  const valid = rows.filter((r) => r.lab);
  function downloadCsv() {
    const head = [
      "Name or note",
      "Code",
      "Lab",
      "Date",
      "Score",
      "Q1",
      "Q2",
      "Q3",
      "Q4",
      "Q5",
      "Prediction",
      "Explanation",
    ];
    const lines = rows.map((r) =>
      [
        r.label,
        r.code,
        r.lab?.title ?? "Invalid code",
        r.result?.date.toISOString().slice(0, 10) ?? "",
        r.lab ? `${r.score}/5` : "",
        ...(r.lab
          ? r.result!.answers.map((a, i) =>
              a == null ? "-" : `${LETTERS[a]}${r.marks[i] ? " correct" : " wrong"}`,
            )
          : ["", "", "", "", ""]),
        r.lab ? (r.result!.predicted ? "yes" : "no") : "",
        r.lab ? (r.result!.explained ? "yes" : "no") : "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "geolens-hand-ins.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }
  return (
    <main id="main" className="mx-auto max-w-[960px] px-5 pb-24 pt-24 text-chalk">
      <Link
        to="/teachers"
        className="inline-flex min-h-11 items-center text-sm text-ice hover:underline"
      >
        {"Teachers"}
      </Link>
      <h1 className="mt-2 font-display text-4xl">{"Check hand-in codes"}</h1>
      <p className="mt-3 max-w-2xl text-mist">
        {
          "At the end of a lab, each student gets a 10-character code in the Check tab. Paste the codes below, one per line, with a name or note on the same line if you like (a copied spreadsheet column works). The codes are read in this browser; nothing is uploaded or saved."
        }
      </p>
      <label className="mt-6 block text-sm text-mist">
        {"Codes"}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"Maya R.  1A2B3-C4D5E\nJordan   5F6G7-H8J9K"}
          className="mt-2 block w-full rounded-xl border border-white/15 bg-basalt p-3 font-mono text-sm text-chalk"
        />
      </label>
      <p className="mt-2 text-sm text-mist" role="status">
        {rows.length === 0
          ? "No codes yet."
          : `${valid.length} valid code${valid.length === 1 ? "" : "s"}${rows.length > valid.length ? `, ${rows.length - valid.length} not recognized (check for typos)` : ""}.`}
      </p>
      {rows.length > 0 && (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <caption className="sr-only">{"Decoded hand-in codes"}</caption>
              <thead className="text-mist">
                <tr className="border-b border-white/10">
                  <th className="p-2 font-medium">{"Name or note"}</th>
                  <th className="p-2 font-medium">{"Lab"}</th>
                  <th className="p-2 font-medium">{"Date"}</th>
                  <th className="p-2 font-medium">{"Score"}</th>
                  <th className="p-2 font-medium">{"First answers"}</th>
                  <th className="p-2 font-medium">{"Prediction"}</th>
                  <th className="p-2 font-medium">{"Explanation"}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.code}-${i}`} className="border-b border-white/5 align-top">
                    <td className="p-2">{r.label || "—"}</td>
                    {r.lab ? (
                      <>
                        <td className="p-2">
                          <Link
                            to="/teachers/$slug"
                            params={{ slug: r.lab.slug }}
                            className="text-ice hover:underline"
                          >
                            {r.lab.title}
                          </Link>
                        </td>
                        <td className="p-2 whitespace-nowrap">
                          {r.result!.date.toLocaleDateString("en-US", {
                            timeZone: "UTC",
                            dateStyle: "medium",
                          })}
                        </td>
                        <td className="p-2 font-medium">{`${r.score}/5`}</td>
                        <td className="p-2 font-mono">
                          {r.result!.answers.map((a, j) => (
                            <span
                              key={j}
                              className={
                                a == null
                                  ? "text-mist"
                                  : r.marks[j]
                                    ? "text-glacier"
                                    : "text-sandstone"
                              }
                              title={`Question ${j + 1}: ${a == null ? "not answered" : r.marks[j] ? "correct" : "wrong"}`}
                            >
                              {`${j + 1}${a == null ? "–" : LETTERS[a]}${a == null ? "" : r.marks[j] ? "✓" : "✗"} `}
                            </span>
                          ))}
                        </td>
                        <td className="p-2">{r.result!.predicted ? "Written" : "—"}</td>
                        <td className="p-2">{r.result!.explained ? "Written" : "—"}</td>
                      </>
                    ) : (
                      <td colSpan={6} className="p-2 text-sandstone">
                        {`${r.code} is not a valid code. Check for a mistyped character.`}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              className="inline-flex min-h-11 items-center rounded-full border border-white/20 px-5"
            >
              {"Download as a spreadsheet (CSV)"}
            </button>
          </div>
        </>
      )}
      <section className="mt-10 max-w-2xl text-sm text-mist">
        <h2 className="font-display text-xl text-chalk">{"What a code shows"}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{"The lab and the day the code was made."}</li>
          <li>
            {
              "The first answer the student chose for each of the five Check questions. Students see feedback straight away and can change answers afterwards; the code keeps the first choice."
            }
          </li>
          <li>
            {
              "Whether the student wrote a prediction and a claim–evidence–reasoning explanation in Guided mode. The writing itself is on the student's printed slip, not in the code."
            }
          </li>
        </ul>
        <p className="mt-3">
          {
            "A check character catches typing mistakes. It is not a lock: a determined student could make up a valid code, so use the codes for a quick overview and the slips for grading."
          }
        </p>
      </section>
    </main>
  );
}
