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
      description: "Geolens has no accounts, no adverts and no student tracking.",
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
            "Geolens is free to use. There is no login, paywall, advertising or sponsorship. We do not keep student work, scores or class lists."
          }
        </p>
        <p>
          {
            "Lab settings (such as tilt, date, viscosity or labels) are kept only in the page address and in your browser. Copy the link to share a setup. Nothing about them is sent to a server when you close the tab."
          }
        </p>
        <p>
          {"We do not track what students do. There is no analytics software recording clicks."}
        </p>
        <p>
          {"Hosting may set a Cloudflare bot-management cookie ("}
          <code className="font-mono text-sm">{"__cf_bm"}</code>
          {"). It is used to block automated abuse, not to track students."}
        </p>
        <p>
          {
            "Maps load tiles from OpenFreeMap / OpenStreetMap, and the live-weather tool loads forecasts from Open-Meteo. Like any web request, these share your IP address with those services. If the map tiles fail to load, the atlas shows a simple Natural Earth coastline built into the site."
          }
        </p>
        <p>
          {
            "Fonts (Fraunces, Geist and Geist Mono) are served by Geolens itself, so they still load where Google Fonts is blocked."
          }
        </p>
        <p>
          {
            "Some labs include a film from youtube-nocookie.com, YouTube’s privacy-enhanced mode. It is requested only when a lab’s Why panel shows the film. Films do not autoplay, and you do not need a YouTube account."
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
          {"."}
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
