import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, ArrowUpRight, CloudSun, Globe2, Map, SunMedium } from "lucide-react";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/tools/")({
  component: ToolsIndex,
  head: () =>
    headFor({
      title: "Tools",
      description:
        "Free geography tools: an Earth-motion calculator, live weather, live earthquakes, a world map studio and an atlas.",
      path: "/tools",
    }),
});

const TOOLS = [
  {
    to: "/tools/earth-motion",
    icon: SunMedium,
    title: "Earth-motion calculator",
    blurb:
      "Choose a place and date to calculate daylight and the Sun’s height. Compare two locations on a 3D Earth, or change its tilt to investigate the seasons.",
  },
  {
    to: "/tools/live-weather",
    icon: CloudSun,
    title: "Live weather",
    blurb:
      "Compare current modeled weather in two places, then follow both forecasts along the same 72-hour timeline. Investigate differences in temperature, rain, wind and cloud cover.",
  },
  {
    to: "/tools/earthquakes",
    icon: Activity,
    title: "Live earthquakes",
    blurb:
      "See the past day, week or month of earthquakes from the USGS on a 3D globe with plate boundaries. Compare depths and magnitudes, and test how closely earthquakes follow plate edges.",
  },
  {
    to: "/tools/map",
    icon: Map,
    title: "World map studio",
    blurb:
      "Explore relief, rivers and plate boundaries on an interactive map. Add teaching layers, compare two views or measure distances between places.",
  },
  {
    to: "/atlas",
    icon: Globe2,
    title: "Atlas",
    blurb:
      "Explore real landscapes and their climate and tectonic settings. Compare places side by side, then follow the evidence into a related 3D lab.",
  },
] as const;

function ToolsIndex() {
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <div className="grid gap-5 border-b border-white/10 pb-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="section-label">{"Tools"}</p>
          <h1 className="mt-3 font-display text-5xl md:text-6xl">
            {"Explore places with maps and data."}
          </h1>
        </div>
        <p className="self-end text-lg leading-8 text-mist">
          {
            "Use these free tools to investigate a question about a place. Compare observations, adjust a calculation or add a map layer to see what changes."
          }
        </p>
      </div>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {TOOLS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="editorial-card group flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-6"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-glacier/12 text-glacier">
              <t.icon className="size-6" aria-hidden="true" />
            </span>
            <span className="flex-1">
              <span className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl text-chalk group-hover:text-glacier">
                  {t.title}
                </h2>
                <ArrowUpRight className="mt-1.5 size-4 shrink-0 text-mist group-hover:text-glacier" />
              </span>
              <p className="mt-2 leading-7 text-mist">{t.blurb}</p>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
