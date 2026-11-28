import { createFileRoute, Link } from "@tanstack/react-router";
import { headFor } from "@/lib/seo";
import { MailLink } from "@/components/mail-link";

export const Route = createFileRoute("/accessibility")({
  component: Accessibility,
  head: () =>
    headFor({
      title: "Accessibility",
      description:
        "Geolens aims to meet WCAG 2.1 AA. What works today, what does not yet, and how to report a problem.",
      path: "/accessibility",
    }),
});

const heading = "mt-10 font-display text-2xl text-chalk";
const list = "mt-4 list-disc space-y-3 pl-5";

function Accessibility() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 pb-24 pt-24">
      <p className="section-label">{"Accessibility"}</p>
      <h1 className="mt-3 font-display text-4xl text-chalk md:text-5xl">
        {"Accessibility statement"}
      </h1>
      <div className="mt-8 text-[17px] leading-7 text-chalk/90">
        <p>
          {
            "Geolens aims to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA, the standard most US school districts use when they review a website. This page says what works today, what does not work yet, and how to tell us about a problem."
          }
        </p>

        <h2 className={heading}>{"What works"}</h2>
        <ul className={list}>
          <li>
            {
              "Links, buttons and other controls can be reached and used with a keyboard, and a Skip to content link comes first on each page."
            }
          </li>
          <li>
            {
              "In every lab the 3D view takes keyboard focus. The arrow keys turn and tilt the model, + and − zoom, and 0 resets the view. Each model has a short text description that a screen reader reads when the view takes focus, and the numbers a lab calculates appear as text, not only in the picture."
            }
          </li>
          <li>
            {
              "Text and controls are checked against the AA color contrast levels in both the dark and the light theme."
            }
          </li>
          <li>
            {
              "Labs start paused. When a device asks for reduced motion, the site’s animations and transitions are cut back."
            }
          </li>
          <li>
            {
              "Photographs have text descriptions. Pages mark their language, so a screen reader reads a lab in Spanish with a Spanish voice."
            }
          </li>
          <li>{"Pages adapt to phone and tablet screens."}</li>
        </ul>

        <h2 className={heading}>{"Known limits"}</h2>
        <ul className={list}>
          <li>
            {
              "A 3D model is a picture. Its description and the numbers give the main points, but some patterns are easier to see than to read."
            }
          </li>
          <li>
            {
              "The interactive maps (the Atlas, the World map studio and the earthquake globe) are hard to use without a mouse or without sight. The earthquake tool also lists its events as text."
            }
          </li>
          <li>
            {
              "Films are YouTube videos made by other producers. They are in English, and their captions are YouTube’s."
            }
          </li>
          <li>
            {
              "Spanish covers the labs and the site’s menus. Other pages, photo descriptions and captions are in English."
            }
          </li>
        </ul>

        <h2 className={heading}>{"How we check"}</h2>
        <p className="mt-4">
          {
            "We run automated checks (axe-core, with the WCAG 2.1 A and AA rules) on the main pages in both themes, use the site with a keyboard alone, and check color contrast. We have not yet tested with a screen reader on a Chromebook (ChromeVox) or an iPad (VoiceOver), the devices most students use."
          }
        </p>

        <h2 className={heading}>{"Tell us about a problem"}</h2>
        <p className="mt-4">
          {"If something does not work for you or your students, write to"}{" "}
          <MailLink className="underline decoration-ice/40 underline-offset-4 hover:decoration-ice" />{" "}
          {"with the page address and what happened."}
        </p>

        <p className="mt-10 text-sm text-mist">
          {"Last reviewed November 28, 2026. See also"}{" "}
          <Link
            to="/student-data"
            className="text-ice underline decoration-ice/40 underline-offset-4 hover:decoration-ice"
          >
            {"Student data"}
          </Link>{" "}
          {"and"}{" "}
          <Link
            to="/privacy"
            className="text-ice underline decoration-ice/40 underline-offset-4 hover:decoration-ice"
          >
            {"Privacy"}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
