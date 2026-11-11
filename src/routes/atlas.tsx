import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ArrowLeftRight, MapPin, Search, SlidersHorizontal } from "lucide-react";
import {
  ATLAS,
  atlasClimate,
  atlasClimateDetail,
  ATLAS_BY_ID,
  atlasLabs,
  atlasPhoto,
  atlasPlaceLabel,
  atlasSearch,
  atlasTectonics,
  CLIMATE_LABEL,
  TECTONIC_LABEL,
  type AtlasKind,
  type AtlasPlace,
  type TectonicSetting,
} from "@/lib/atlas-data";
import { LibreMap } from "@/components/map/libre-map";
import { MapDot } from "@/components/map/mini-map";
import { ZoomableImage } from "@/components/zoomable-image";
import { fmtLatLon, haversineKm } from "@/lib/geo";
import { headFor } from "@/lib/seo";
import "@/components/atlas-weather.css";

type AtlasSearch = {
  place?: string;
  vs?: string;
  tab?: string;
  q?: string;
  climate?: string;
  tectonic?: string;
};
export const Route = createFileRoute("/atlas")({
  component: AtlasPage,
  validateSearch: (s: Record<string, unknown>): AtlasSearch =>
    Object.fromEntries(
      ["place", "vs", "tab", "q", "climate", "tectonic"]
        .filter((k) => typeof s[k] === "string")
        .map((k) => [k, s[k]]),
    ),
  head: () =>
    headFor({
      title: "Atlas",
      description:
        "Read real landscapes, compare places and explore the Earth processes behind them in free interactive 3D labs.",
      path: "/atlas",
    }),
});
const TABS: { id: string; label: string; kinds: AtlasKind[] }[] = [
  { id: "world", label: "World", kinds: ["country", "city"] },
  { id: "uk", label: "United Kingdom", kinds: ["uk-nation", "uk-county", "uk-place"] },
  { id: "us", label: "US states", kinds: ["us-state"] },
];
/** US-first: with no place in the link, the atlas opens on the United States. */
const DEFAULT_PLACE = ATLAS_BY_ID.us;
const placeTab = (p: AtlasPlace) =>
  p.kind.startsWith("uk-") ? "uk" : p.kind === "us-state" ? "us" : "world";
const climateName = (p: AtlasPlace) =>
  CLIMATE_LABEL[atlasClimate(p)].replace(/^[A-E] /, "").replace(/^./, (s) => s.toUpperCase());
const PROCESS_NOTES: Record<string, string> = {
  coasts:
    "Look at the shape of the shoreline. Explore how waves and sediment transport build spits and cut back cliffs.",
  glaciers:
    "Look for broad valleys and deposits left by moving ice. Follow the erosion and deposition that create these landforms.",
  fronts:
    "Explore how warm and cold air meet, then connect their movement to cloud and rainfall patterns.",
  hotspots:
    "Follow a moving plate over a volcanic source and see how an island chain can record its motion.",
  "seafloor-spreading":
    "See how new oceanic crust forms as plates separate, and how magnetic stripes preserve that history.",
  "plate-boundaries":
    "Compare plates moving apart, sliding past each other and converging. What landforms would each movement produce?",
  earthquakes:
    "Follow stress building along a fault, then examine how its release sends waves through the Earth.",
  volcanoes:
    "Compare magma and eruption styles to explain why volcanic landscapes take different forms.",
  "folds-faults":
    "Examine how compression folds rock and how fractures allow blocks of crust to move.",
  "tropical-cyclone":
    "Explore the warm ocean, moisture and rotation that allow a tropical cyclone to develop.",
  karst:
    "Follow slightly acidic water through limestone and see how it enlarges joints into caves and other karst features.",
  rivers:
    "Follow water and sediment downstream to connect channel shape with erosion and deposition.",
  "river-erosion":
    "Compare where a river erodes and deposits sediment as its flow and channel shape change.",
  "rain-shadow":
    "Move moist air across a mountain and compare rainfall on the windward and leeward sides.",
  "soil-profile":
    "Look beneath the surface to see how parent material, water and living organisms shape a soil profile.",
  graticule:
    "Use latitude and longitude to locate this reference point, then compare its position with another place.",
};
function AtlasPage() {
  const search = Route.useSearch(),
    navigate = Route.useNavigate();
  const q = search.q ?? "";
  const hits = useMemo(() => atlasSearch(q), [q]);
  // An unknown place id shows a "not found" panel; it never silently swaps in another place.
  const requested = search.place ? (ATLAS_BY_ID[search.place] ?? null) : undefined;
  const shown =
    requested === null ? null : (requested ?? (q.trim() ? hits[0]?.place : null) ?? DEFAULT_PLACE);
  const vs = ATLAS.find((p) => p.id === search.vs && p.id !== shown?.id) ?? null;
  const tab = TABS.some((t) => t.id === search.tab)
    ? search.tab!
    : shown
      ? placeTab(shown)
      : "world";
  const climate = search.climate ?? "all",
    tectonic = search.tectonic ?? "all";
  const [notice, setNotice] = useState(""),
    [projector, setProjector] = useState(false);
  const [zoom, setZoom] = useState(5),
    [baseMap, setBaseMap] = useState<"vector" | "relief">("vector");
  function update(changes: Partial<AtlasSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...changes }), replace: true });
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        (/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName) || e.target.isContentEditable)
      )
        return;
      // Ctrl/Cmd+P is the browser's print shortcut, not projector mode.
      if (e.key.toLowerCase() === "p" && !e.ctrlKey && !e.metaKey && !e.altKey)
        setProjector((v) => !v);
      if (e.key === "Escape") setProjector(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const needle = q.trim();
  const list = useMemo(
    () =>
      (needle
        ? hits
        : ATLAS.filter((p) => TABS.find((t) => t.id === tab)!.kinds.includes(p.kind)).map(
            (place) => ({ place, match: undefined as string | undefined }),
          )
      ).filter(
        ({ place: p }) =>
          (climate === "all" || atlasClimate(p) === climate) &&
          (tectonic === "all" || atlasTectonics(p).includes(tectonic as TectonicSetting)),
      ),
    [needle, hits, tab, climate, tectonic],
  );
  // Names shared by two places (Georgia the country and the US state) get their kind added.
  const sameName = (p: AtlasPlace) =>
    ATLAS.some((o) => o.id !== p.id && o.name === p.name)
      ? `${p.name} (${atlasPlaceLabel(p)})`
      : p.name;
  // Keep the open place visible in the list (a horizontal strip on phones).
  useEffect(() => {
    // Scroll only the list itself, never the page.
    const item = document.querySelector<HTMLElement>(
        '.atlas-place-list [aria-current="true"]',
      )?.parentElement,
      list = item?.parentElement;
    if (!item || !list) return;
    if (list.scrollWidth > list.clientWidth)
      list.scrollLeft = item.offsetLeft - list.offsetLeft - 16;
    else if (list.scrollHeight > list.clientHeight)
      list.scrollTop = item.offsetTop - list.offsetTop - list.clientHeight / 3;
  }, [shown?.id, tab]);
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setNotice("The link includes your selected places and filters.");
    } catch {
      setNotice("Copy the address in your browser to share these places.");
    }
  }
  function syncZoom(next: number) {
    setZoom((previous) => (Math.abs(previous - next) > 0.02 ? next : previous));
  }
  return (
    <main id="main" className={`field-page ${projector ? "field-page--projector" : ""}`}>
      <header className="field-page-heading">
        <div>
          <p className="section-label">The Geolens atlas</p>
          <h1>Explore the geography of a place.</h1>
          <p className="field-intro">
            Look closely at a landscape, find it on the map, and explore the processes that shaped
            it.
          </p>
        </div>
        <div className="field-actions">
          <button className="field-button" onClick={share}>
            Share this view
          </button>
          <button
            className="field-button"
            aria-pressed={projector}
            onClick={() => setProjector((v) => !v)}
          >
            Projector {projector ? "on" : "off"}
          </button>
        </div>
      </header>
      {notice && (
        <p role="status" className="field-notice">
          {notice}
        </p>
      )}
      <section className="atlas-searchbar" aria-label="Find and compare places">
        <label className="field-label atlas-search">
          <span>Find a place</span>
          <span className="field-search-input">
            <Search size={18} aria-hidden="true" />
            <input
              value={q}
              placeholder="Search a place or landscape"
              onChange={(e) => update({ q: e.target.value || undefined, place: undefined })}
            />
          </span>
        </label>
        <label className="field-label">
          <span>Compare with</span>
          <select
            value={vs?.id ?? ""}
            disabled={!shown}
            onChange={(e) => update({ place: shown?.id, vs: e.target.value || undefined })}
          >
            <option value="">Choose a second place</option>
            {TABS.map((t) => (
              <optgroup key={t.id} label={t.label}>
                {ATLAS.filter((p) => t.kinds.includes(p.kind) && p.id !== shown?.id).map((p) => (
                  <option key={p.id} value={p.id}>
                    {sameName(p)}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <details className="atlas-filter-details">
          <summary className="field-button">
            <SlidersHorizontal size={16} aria-hidden="true" /> Filters
            {climate !== "all" || tectonic !== "all" ? " active" : ""}
          </summary>
          <div className="atlas-filter-panel">
            <label className="field-label">
              <span>Climate at the reference point</span>
              <select value={climate} onChange={(e) => update({ climate: e.target.value })}>
                <option value="all">All climate families</option>
                {Object.entries(CLIMATE_LABEL)
                  .filter(([k]) => k !== "unknown")
                  .map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
              </select>
            </label>
            <label className="field-label">
              <span>Regional tectonic setting</span>
              <select value={tectonic} onChange={(e) => update({ tectonic: e.target.value })}>
                <option value="all">All settings</option>
                {Object.entries(TECTONIC_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="field-text-button"
              onClick={() => update({ q: undefined, climate: undefined, tectonic: undefined })}
            >
              Clear all filters
            </button>
          </div>
        </details>
      </section>
      <div className={`atlas-workspace ${projector ? "atlas-workspace--wide" : ""}`}>
        {!projector && (
          <aside className="atlas-directory" aria-label="Matching places">
            <div className="atlas-tabs" role="group" aria-label="Place collection">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  aria-pressed={tab === t.id}
                  onClick={() => update({ tab: t.id, q: undefined })}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="atlas-result-count" role="status">
              {list.length} {list.length === 1 ? "place" : "places"}
              {needle ? " across all collections" : ""}
            </p>
            <ul className="atlas-place-list">
              {list.map(({ place: p, match }) => (
                <li key={p.id}>
                  <button
                    aria-current={shown?.id === p.id ? "true" : undefined}
                    onClick={() =>
                      update({
                        place: p.id,
                        tab: placeTab(p),
                        vs: vs?.id === p.id ? undefined : vs?.id,
                      })
                    }
                  >
                    <span>{p.name}</span>
                    <small>
                      {match ? `${match} · ` : ""}
                      {atlasPlaceLabel(p)}
                    </small>
                    {shown?.id === p.id && <ArrowRight size={16} aria-hidden="true" />}
                  </button>
                </li>
              ))}
              {!list.length && (
                <li className="atlas-empty">
                  No places match. Try another search or clear a filter.
                  <button
                    className="field-text-button"
                    onClick={() =>
                      update({ q: undefined, climate: undefined, tectonic: undefined })
                    }
                  >
                    Clear filters
                  </button>
                </li>
              )}
            </ul>
            {shown && !list.some(({ place }) => place.id === shown.id) && (
              <p className="atlas-result-count">{shown.name} remains open outside these results.</p>
            )}
            <Link className="atlas-directory-link" to="/tools/map">
              Open the world map <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </aside>
        )}
        <section className="atlas-observations" aria-label="Place observations">
          {!shown ? (
            <div className="atlas-not-found" role="status">
              <h2>Place not found</h2>
              <p>
                This link asks for a place called “{search.place}”, which is not in the atlas.
                Search for a place or choose one from the list.
              </p>
              <button
                className="field-button"
                onClick={() => update({ place: DEFAULT_PLACE.id, tab: placeTab(DEFAULT_PLACE) })}
              >
                Open {DEFAULT_PLACE.name}
              </button>
            </div>
          ) : vs ? (
            <div className="atlas-comparison-heading">
              <div>
                <p className="section-label">Compare landscapes</p>
                <p>
                  The reference points are{" "}
                  {Math.round(haversineKm(shown!.lat, shown!.lon, vs.lat, vs.lon)).toLocaleString(
                    "en",
                  )}{" "}
                  km apart.
                </p>
              </div>
              <div className="field-actions">
                <button
                  className="field-button"
                  onClick={() => update({ place: vs.id, vs: shown!.id, tab: placeTab(vs) })}
                >
                  <ArrowLeftRight size={16} aria-hidden="true" /> Swap places
                </button>
                <button className="field-text-button" onClick={() => update({ vs: undefined })}>
                  Show one place
                </button>
              </div>
            </div>
          ) : (
            <div className="atlas-comparison-suggestion">
              <span>Compare two places to see what they share and how they differ.</span>
              <button
                className="field-text-button"
                onClick={() => update({ place: shown.id, vs: shown.id === "is" ? "uk" : "is" })}
              >
                Compare with {shown.id === "is" ? "the United Kingdom" : "Iceland"}{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          )}
          {shown && (
            <>
              <div className="atlas-map-controls">
                <span>
                  <MapPin size={16} aria-hidden="true" />{" "}
                  {vs
                    ? "Maps share the same zoom and basemap."
                    : "Showing one place. Pick a second place to compare."}
                </span>
                <div className="field-actions">
                  <label className="field-inline-label">
                    View
                    <select
                      aria-label="Map view"
                      value={baseMap}
                      onChange={(e) => setBaseMap(e.target.value as "vector" | "relief")}
                    >
                      <option value="vector">Places</option>
                      <option value="relief">Relief</option>
                    </select>
                  </label>
                  <label className="field-inline-label">
                    Scale
                    <select
                      aria-label="Shared map scale"
                      value={
                        Math.abs(zoom - 3) < 0.02
                          ? "3"
                          : Math.abs(zoom - 5) < 0.02
                            ? "5"
                            : Math.abs(zoom - 7) < 0.02
                              ? "7"
                              : "custom"
                      }
                      onChange={(e) =>
                        e.target.value !== "custom" && setZoom(Number(e.target.value))
                      }
                    >
                      <option value="3">Wider region</option>
                      <option value="5">Region</option>
                      <option value="7">Local</option>
                      <option value="custom" disabled>
                        Custom zoom
                      </option>
                    </select>
                  </label>
                </div>
              </div>
              <div className={`atlas-place-panels ${vs ? "atlas-place-panels--compare" : ""}`}>
                {/* Stable keys keep one map per panel alive and fly it to the next place:
                    creating a new WebGL map for every card ran phones out of memory. */}
                <PlaceCard
                  key="a"
                  p={shown}
                  label={vs ? "A" : undefined}
                  zoom={zoom}
                  onZoom={syncZoom}
                  baseMap={baseMap}
                  showPhoto={!vs || !!atlasPhoto(vs)}
                />
                {vs && (
                  <PlaceCard
                    key="b"
                    p={vs}
                    label="B"
                    zoom={zoom}
                    onZoom={syncZoom}
                    baseMap={baseMap}
                    showPhoto={!!atlasPhoto(shown)}
                  />
                )}
              </div>
            </>
          )}
          {shown && vs && (
            <div className="atlas-reading-question">
              <h2>What explains the difference?</h2>
              <p>
                Compare the climate labels first, then look for evidence of the processes below.
                Which differences could latitude explain, and which need geology or relief?
              </p>
            </div>
          )}
        </section>
      </div>
      <details className="field-methods">
        <summary>About the climate and map data</summary>
        <p>
          Climate labels describe the marked reference point using the 1991–2020 Köppen–Geiger
          classification; climate can vary greatly within the surrounding country or region.
          Tectonic labels identify regional teaching examples.
        </p>
        <p>
          <a href="https://www.gloh2o.org/koppen/" target="_blank" rel="noreferrer">
            Beck et al. climate data (CC BY 4.0)
          </a>{" "}
          and{" "}
          <a href="https://github.com/fraxen/tectonicplates" target="_blank" rel="noreferrer">
            Bird’s PB2002 plate model
          </a>{" "}
          provide the scientific context.
        </p>
      </details>
    </main>
  );
}
function PlaceCard({
  p,
  label,
  zoom,
  onZoom,
  baseMap,
  showPhoto,
}: {
  p: AtlasPlace;
  label?: string;
  zoom: number;
  onZoom: (zoom: number) => void;
  showPhoto: boolean;
  baseMap: "vector" | "relief";
}) {
  const photo = showPhoto ? atlasPhoto(p) : undefined,
    climate = atlasClimateDetail(p);
  const placeName = p.capital === "—" ? "The marked location" : p.capital;
  // Only labs that fit this place: no generic filler to make up a count.
  const processes = atlasLabs(p).filter((l) => l.slug !== "climate-types");
  const cards = [
    {
      slug: "climate-types",
      label: "Climate at the reference point",
      note: climate?.code
        ? `${placeName} is classified as ${climate.code} in the ${climateName(p).toLowerCase()} climate family. See how temperature and rainfall set it apart.`
        : "Explore how long-term temperature and rainfall patterns distinguish climate families around the world.",
    },
    ...processes.slice(0, 3).map((l) => ({
      ...l,
      note:
        PROCESS_NOTES[l.slug] ??
        `Explore ${l.label.toLowerCase()} in 3D, then look back at the landscape for signs of it.`,
    })),
  ];
  return (
    <article className="atlas-place-card">
      <div className="atlas-place-heading">
        <p className="section-label">
          {label && (
            <span className={`field-letter ${label === "B" ? "field-letter--b" : ""}`}>
              {label}
            </span>
          )}
          {atlasPlaceLabel(p)}
        </p>
        <h2>{p.name}</h2>
        <p className="atlas-reference">
          <MapPin size={15} aria-hidden="true" />{" "}
          {p.capital === "—" ? "Teaching location" : p.capital}
          <span>{fmtLatLon(p.lat, p.lon)}</span>
        </p>
        <div className="atlas-badges">
          <span>
            {climateName(p)} climate{climate?.code ? ` (${climate.code})` : ""}
          </span>
          <span>
            {atlasTectonics(p)
              .map((k) => TECTONIC_LABEL[k])
              .join(" / ")}
          </span>
        </div>
      </div>
      {photo && (
        <figure className="atlas-landscape">
          <ZoomableImage
            key={photo.src}
            src={photo.src}
            alt={photo.alt}
            className="atlas-landscape-image"
            sizes="(min-width: 1024px) 900px, 100vw"
            describedBy={`atlas-photo-${p.id}`}
          />
          <figcaption id={`atlas-photo-${p.id}`}>{photo.caption}</figcaption>
        </figure>
      )}
      <div className={`atlas-map-frame ${photo ? "" : "atlas-map-frame--hero"}`}>
        <LibreMap
          center={[p.lon, p.lat]}
          zoom={zoom}
          marker={[p.lon, p.lat]}
          markerContent={<MapDot />}
          onViewChange={(view) => onZoom(view.zoom)}
          baseMap={baseMap}
          label={`${p.name} reference point map`}
          className="atlas-place-map"
        />
      </div>
      <div className="atlas-evidence-heading">
        <p className="section-label">Read the evidence</p>
        <p>Take an observation into a 3D lab.</p>
      </div>
      <div className="atlas-evidence-grid">
        {cards.map((card, index) => (
          <Link
            key={card.slug}
            to="/lab/$slug"
            params={{ slug: card.slug }}
            className="atlas-evidence-card"
          >
            <span className="atlas-evidence-number">0{index + 1}</span>
            <h3>{card.label}</h3>
            <p>{card.note}</p>
            <span className="atlas-evidence-link">
              Explore the model <ArrowRight size={16} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
      <Link to="/tools/live-weather" className="atlas-weather-link">
        Compare today’s weather <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </article>
  );
}
