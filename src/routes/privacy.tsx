import { createFileRoute, Link } from "@tanstack/react-router";
import { headFor } from "@/lib/seo";
import { MailLink } from "@/components/mail-link";
import {
  CONTACT_LEAD,
  PRODUCER_IG,
  PRODUCER_IG_HANDLE,
  PRODUCER_X,
  PRODUCER_X_HANDLE,
} from "@/lib/contact";

export const Route = createFileRoute("/privacy")({
  component: Privacy,
  head: () =>
    headFor({
      title: "Privacy",
      description: "Geolens does not run accounts, ads, or student tracking.",
      path: "/privacy",
    }),
});

function Privacy() {
  return (
    <main id="main" className="mx-auto max-w-[720px] px-5 pb-24 pt-24">
      <p className="section-label">{"Privacy"}</p>
      <h1 className="mt-3 font-display text-4xl text-chalk md:text-5xl">
        {"How Geolens handles your data"}
      </h1>
      <div className="mt-8 space-y-5 text-[17px] leading-7 text-chalk/90">
        <p>
          {
            "Geolens is a free classroom studio. There is no login, no paywall, no advertising, and no sponsorship banner. We do not keep student work, scores, or class lists."
          }
        </p>
        <p>
          {
            "Lab state (tilt, date, viscosity, labels) lives in the page URL and in this browser only. Copy the link to share a setup. Closing the tab does not send that state to a server."
          }
        </p>
        <p>
          {
            "We do not track academic behaviour. There is no analytics SDK that scores a pupil’s clicks."
          }
        </p>
        <p>
          {"Hosting may set a Cloudflare bot-management cookie ("}
          <code className="font-mono text-sm">{"__cf_bm"}</code>
          {"). That cookie is for abuse control, not classroom surveillance."}
        </p>
        <p>
          {
            "Maps request tiles from OpenFreeMap / OpenStreetMap and, on the live-weather tool, a forecast from Open-Meteo. Those requests carry an IP address to those services. If the tile network fails, the atlas falls back to a static Natural Earth coastline we ship with the app."
          }
        </p>
        <p>
          {
            "Type is self-hosted on this origin (Fraunces, Geist, Geist Mono). A classroom that blocks Google Fonts still gets the faces."
          }
        </p>
        <p>
          {
            "Some labs embed a YouTube nocookie film. That request leaves this origin for youtube-nocookie.com only when you open the Why panel and the film is on the page. Autoplay is off. There is no YouTube account wall."
          }
        </p>
        <p>
          {CONTACT_LEAD} {"Write to"} <MailLink />,{" "}
          <a
            href={PRODUCER_IG}
            className="text-ice hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {"Instagram "}
            {PRODUCER_IG_HANDLE}
          </a>
          {", or"}{" "}
          <a
            href={PRODUCER_X}
            className="text-ice hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {PRODUCER_X_HANDLE}
          </a>
          {". You can use these contact details to ask about this privacy information."}
        </p>
        <p>
          {"See also"}{" "}
          <Link to="/about" className="text-ice hover:underline">
            {"About"}
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
