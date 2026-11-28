import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { headFor } from "@/lib/seo";
import manifest from "../../public/photos/manifest.json";
export const Route = createFileRoute("/image-credits")({
  component: ImageCredits,
  head: () =>
    headFor({
      title: "Image credits",
      description: "Photograph sources, authors and licenses for images used in Geolens.",
      path: "/image-credits",
    }),
});
const images = Array.from(new Map(manifest.items.map((item) => [item.path, item])).values());

// The attribution the Terrain Tiles dataset asks for (tilezen/joerd, docs/attribution.md).
const ELEVATION_SOURCES = [
  "ArcticDEM terrain data DEM(s) were created from DigitalGlobe, Inc., imagery and funded under National Science Foundation awards 1043681, 1559691, and 1542736.",
  "Australia terrain data © Commonwealth of Australia (Geoscience Australia) 2017.",
  "Austria terrain data © offene Daten Österreichs – Digitales Geländemodell (DGM) Österreich.",
  "Canada terrain data contains information licensed under the Open Government Licence – Canada.",
  "Europe terrain data produced using Copernicus data and information funded by the European Union - EU-DEM layers.",
  "Global ETOPO1 terrain data U.S. National Oceanic and Atmospheric Administration.",
  "Mexico terrain data source: INEGI, Continental relief, 2016.",
  "New Zealand terrain data Copyright 2011 Crown copyright (c) Land Information New Zealand and the New Zealand Government (All rights reserved).",
  "Norway terrain data © Kartverket.",
  "United Kingdom terrain data © Environment Agency copyright and/or database right 2015. All rights reserved.",
  "United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey.",
];
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
      <h1 className="font-display text-5xl">Image credits</h1>
      <p className="mt-5 max-w-3xl leading-7 text-mist">
        These photographs and scientific images help connect the models to real places and
        observations. Their original authors, source pages and reuse terms are collected here.
        Cropping and resizing are recorded in each credit.
      </p>
      <p className="mt-3 text-sm leading-6 text-mist">
        The creator portrait is supplied by Li Zeyu. Earth surface textures use NASA Blue Marble
        imagery; other dataset and texture sources are included in the relevant lab references.
        Relief and ocean-depth maps use the{" "}
        <a href="#elevation" className="text-ice underline decoration-ice/40 underline-offset-4">
          elevation data listed below
        </a>
        .
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
      <section
        id="elevation"
        className="mt-12 max-w-3xl scroll-mt-24 border-t border-white/15 pt-8"
      >
        <h2 className="font-display text-3xl">Map elevation data</h2>
        <p className="mt-4 leading-7 text-mist">
          The shaded relief and the ocean-depth colors on Geolens maps are drawn in the browser from
          the{" "}
          <a
            href="https://registry.opendata.aws/terrain-tiles/"
            target="_blank"
            rel="noreferrer"
            className="text-ice underline decoration-ice/40 underline-offset-4"
          >
            Terrain Tiles
          </a>{" "}
          open dataset, made by Mapzen’s Joerd project and hosted by the Amazon Web Services Open
          Data program. Ocean depths come mainly from ETOPO1, a global model with a point about
          every 2 km, so they show the main shapes of the sea floor but not the detail a navigation
          chart needs. The dataset’s sources ask for this{" "}
          <a
            href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md"
            target="_blank"
            rel="noreferrer"
            className="text-ice underline decoration-ice/40 underline-offset-4"
          >
            attribution
          </a>
          :
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-mist">
          {ELEVATION_SOURCES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
