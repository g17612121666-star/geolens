import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { headFor } from "@/lib/seo";
import manifest from "../../public/photos/manifest.json";
export const Route = createFileRoute("/image-credits")({
  component: ImageCredits,
  head: () =>
    headFor({
      title: "Image credits",
      description: "Photograph sources, authors and licences for images used in Geolens.",
      path: "/image-credits",
    }),
});
const images = Array.from(new Map(manifest.items.map((item) => [item.path, item])).values());
function ImageCredits() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      images.filter((i) =>
        (i.alt + " " + i.credit + " " + i.used_on).toLowerCase().includes(query.toLowerCase()),
      ),
    [query],
  );
  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-16 pt-24">
      <p className="section-label">Geolens</p>
      <h1 className="mt-3 font-display text-5xl">Image credits</h1>
      <p className="mt-5 max-w-3xl leading-7 text-mist">
        These photographs and scientific images help connect the models to real places and
        observations. Their original authors, source pages and reuse terms are collected here.
        Cropping and resizing are recorded in each credit.
      </p>
      <p className="mt-3 text-sm leading-6 text-mist">
        The creator portrait is supplied by Li Zeyu. Earth surface textures use NASA Blue Marble
        imagery; other dataset and texture sources are included in the relevant lab references.
      </p>
      <label className="mt-6 block">
        <span className="sr-only">Find an image credit</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
          placeholder="Find a subject, place or photographer"
          className="min-h-12 w-full rounded-xl border border-white/20 bg-basalt px-4"
        />
      </label>
      <p className="my-5 text-sm text-mist" role="status">
        {filtered.length} image records
      </p>
      <div className="divide-y divide-white/15">
        {filtered.map((i) => (
          <article key={i.path} className="py-5">
            <h2 className="font-medium">{i.alt}</h2>
            <p className="mt-2 text-sm leading-6 text-mist">{i.credit}</p>
            <div className="mt-2 flex flex-wrap gap-5 text-sm text-ice">
              <a href={i.path} target="_blank" rel="noreferrer">
                View image
              </a>
              {i.sourceUrl && (
                <a href={i.sourceUrl} target="_blank" rel="noreferrer">
                  Original source
                </a>
              )}
              {i.licenseUrl && (
                <a href={i.licenseUrl} target="_blank" rel="noreferrer">
                  Reuse terms
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
