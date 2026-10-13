import { createFileRoute, Link } from "@tanstack/react-router";
import { headFor } from "@/lib/seo";

export const Route = createFileRoute("/tools/")({
  component: ToolsIndex,
  head: () =>
    headFor({
      title: "Tools",
      description: "Earth-motion calculator, live weather, world map studio, and atlas.",
      path: "/tools",
    }),
});

const TOOLS = [
  {
    to: "/tools/earth-motion",
    title: "Earth-motion calculator",
    blurb:
      "Choose a place and date to calculate daylight and the Sun’s height. Compare two locations on a 3D Earth, or change its tilt to investigate the seasons.",
  },
  {
    to: "/tools/live-weather",
    title: "Live weather",
    blurb:
      "Compare current modelled weather in two places, then follow both forecasts along the same 72-hour timeline. Investigate differences in temperature, rain, wind and cloud cover.",
  },
  {
    to: "/tools/map",
    title: "World map studio",
    blurb:
      "Explore relief, rivers and plate boundaries on an interactive map. Add teaching layers, compare two views or measure distances between places.",
  },
  {
    to: "/atlas",
    title: "Atlas",
    blurb:
      "Explore real landscapes and their climate and tectonic settings. Compare places side by side, then follow the evidence into a related 3D lab.",
  },
] as const;

function ToolsIndex() {
  return (
    <main id="main" className="mx-auto max-w-[900px] px-5 pb-24 pt-24">
      <p className="section-label">{"Tools"}</p>
      <h1 className="mt-3 font-display text-4xl">{"Explore places with maps and data."}</h1>
      <p className="mt-4 max-w-2xl text-mist">
        {
          "Use these free tools to investigate a question about a place. Compare observations, adjust a calculation or add a map layer to see what changes."
        }
      </p>
      <div className="mt-12 grid gap-4">
        {TOOLS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 hover:border-glacier/40"
          >
            <h2 className="font-display text-2xl text-chalk">{t.title}</h2>
            <p className="mt-2 text-mist">{t.blurb}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
