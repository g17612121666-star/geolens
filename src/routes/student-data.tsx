import { createFileRoute, Link } from "@tanstack/react-router";
import { headFor } from "@/lib/seo";
import { MailLink } from "@/components/mail-link";

export const Route = createFileRoute("/student-data")({
  component: StudentData,
  head: () =>
    headFor({
      title: "Student data",
      description:
        "Geolens collects no personal information from students: no accounts, no database, no tracking. How that relates to COPPA and FERPA.",
      path: "/student-data",
    }),
});

const heading = "mt-10 font-display text-2xl text-chalk";

function StudentData() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 pb-24 pt-24">
      <p className="section-label">{"Student data"}</p>
      <h1 className="mt-3 font-display text-4xl text-chalk md:text-5xl">
        {"Student data, COPPA and FERPA"}
      </h1>
      <div className="mt-8 text-[17px] leading-7 text-chalk/90">
        <p>
          {
            "Geolens is built so that a school can use it without sharing student data. Students do not create accounts or log in, and Geolens has no database: nothing a student types or answers is sent to Geolens."
          }
        </p>

        <h2 className={heading}>{"What stays on the student’s device"}</h2>
        <p className="mt-4">
          {
            "Quiz answers, written predictions and explanations, the name a student types on a hand-in slip, practice results, field-trip progress and recently opened labs are saved only in that browser, so the student can carry on later on the same device. Clearing the site’s data in the browser removes them."
          }
        </p>
        <p className="mt-4">
          {
            "A hand-in code is also made on the student’s device. It records the lab, the date, the first answer to each Check question and whether a prediction and an explanation were written. It contains no name and no written text. The student gives it to the teacher, and the teacher decodes it in the teacher’s own browser; Geolens never receives it."
          }
        </p>

        <h2 className={heading}>{"COPPA"}</h2>
        <p className="mt-4">
          {
            "The Children’s Online Privacy Protection Act covers websites that collect personal information from children under 13. Geolens does not collect names, email addresses, photos, voice recordings or any other personal information from students; a name typed on a hand-in slip stays in that browser. Geolens uses no advertising, no analytics and no tracking cookies."
          }
        </p>
        <p className="mt-4">
          {
            "Like any website, a device’s IP address reaches the host (Vercel), and reaches an outside service such as a map or weather service when a page uses it. Geolens does not use IP addresses to identify or follow anyone. The"
          }{" "}
          <Link
            to="/privacy"
            className="text-ice underline decoration-ice/40 underline-offset-4 hover:decoration-ice"
          >
            {"privacy page"}
          </Link>{" "}
          {
            "lists every outside service. Films load nothing from YouTube until someone presses play."
          }
        </p>

        <h2 className={heading}>{"FERPA"}</h2>
        <p className="mt-4">
          {
            "The Family Educational Rights and Privacy Act protects students’ education records. Geolens does not receive, keep or have access to education records: it stores no grades, no names and no student work. Hand-in codes, worksheets or screenshots that a teacher collects stay in the school’s own systems, under the school’s own policies."
          }
        </p>

        <h2 className={heading}>{"For a district review"}</h2>
        <p className="mt-4">
          {"If your district needs this information in its own form or questionnaire, write to"}{" "}
          <MailLink className="underline decoration-ice/40 underline-offset-4 hover:decoration-ice" />
          .
        </p>

        <p className="mt-10 text-sm text-mist">
          {
            "This page describes how Geolens works; it is not legal advice. Last reviewed November 28, 2026. See also"
          }{" "}
          <Link
            to="/accessibility"
            className="text-ice underline decoration-ice/40 underline-offset-4 hover:decoration-ice"
          >
            {"Accessibility"}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
