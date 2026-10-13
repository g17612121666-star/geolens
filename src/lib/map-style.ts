/** Keyless basemaps: OpenFreeMap vector, OSM raster, then bundled Natural Earth. */

export const FIORD = "https://tiles.openfreemap.org/styles/fiord";
export const LIBERTY = "https://tiles.openfreemap.org/styles/liberty";

const GLYPHS = "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf";

function rasterStyle(
  id: string,
  tiles: string[],
  attribution: string,
  maxzoom = 19,
) {
  return {
    version: 8 as const,
    glyphs: GLYPHS,
    sources: {
      [id]: {
        type: "raster" as const,
        tiles,
        tileSize: 256,
        attribution,
        maxzoom,
      },
    },
    layers: [
      { id: "background", type: "background" as const, paint: { "background-color": "#0e2a38" } },
      { id, type: "raster" as const, source: id },
    ],
  };
}

export const OSM_RASTER_STYLE = rasterStyle(
  "osm",
  [
    "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  ],
  "© OpenStreetMap contributors",
  19,
);

export const OSM_RELIEF_STYLE = rasterStyle(
  "topo",
  [
    "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
    "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
  ],
  "© OpenStreetMap contributors, SRTM · OpenTopoMap (CC-BY-SA)",
  17,
);

/** GEBCO-derived ocean floor via Esri’s ocean basemap. Classroom bathymetry, not a chart for navigation. */
export const ESRI_OCEAN_STYLE = rasterStyle(
  "ocean",
  ["https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"],
  "Esri / GEBCO / NOAA · ocean bathymetry",
  16,
);

export const OPEN_TOPO_TILES = [
  "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://b.tile.opentopomap.org/{z}/{x}/{y}.png",
  "https://c.tile.opentopomap.org/{z}/{x}/{y}.png",
];

export const NATURAL_EARTH_STYLE = {
  version: 8 as const,
  glyphs: GLYPHS,
  sources: {
    land: {
      type: "geojson" as const,
      data: "/geo/ne_110m_land.geojson",
    },
  },
  layers: [
    {
      id: "background",
      type: "background" as const,
      paint: { "background-color": "#0e2a38" },
    },
    {
      id: "land",
      type: "fill" as const,
      source: "land",
      paint: { "fill-color": "#7C9A6A", "fill-opacity": 0.92 },
    },
    {
      id: "land-line",
      type: "line" as const,
      source: "land",
      paint: { "line-color": "#F4EFE6", "line-width": 0.8, "line-opacity": 0.85 },
    },
  ],
};

export type MapBasemap = "openfreemap" | "osm" | "natural-earth" | "relief" | "bathymetry";

type MapEvent = {
  error?: { status?: number; message?: string };
  sourceId?: string;
  sourceDataType?: string;
  isSourceLoaded?: boolean;
  tile?: { state?: string };
};
type MapLike = {
  on: (ev: string, fn: (e?: MapEvent) => void) => void;
  off: (ev: string, fn: (e?: MapEvent) => void) => void;
  setStyle: (s: unknown) => unknown;
  getStyle: () => { sources?: Record<string, { type?: string }> } | undefined;
};

export type MapPhase = "loading" | "ready" | "offline" | "error";
export function basemapStyle(basemap: MapBasemap) {
  return {
    openfreemap: FIORD, osm: OSM_RASTER_STYLE,
    relief: OSM_RELIEF_STYLE, bathymetry: ESRI_OCEAN_STYLE, "natural-earth": NATURAL_EARTH_STYLE,
  }[basemap];
}

export function preferredRaster(relief?: boolean) {
  return relief ? OSM_RELIEF_STYLE : OSM_RASTER_STYLE;
}

export function attachStyleFallback(
  map: MapLike,
  opts: {
    start?: MapBasemap;
    onBasemap?: (b: MapBasemap) => void;
    onPhase?: (phase: MapPhase) => void;
    timeoutMs?: number;
  } = {},
): (() => void) & { select: (b: MapBasemap) => void } {
  let current = opts.start ?? "openfreemap";
  let chain: MapBasemap[] = [];
  let sourceIds = new Set<string>();
  let disposed = false;
  let healthy = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: ReturnType<typeof setTimeout> | undefined;
  const clear = () => { clearTimeout(timer); clearTimeout(pending); pending = undefined; };
  const identifySources = () => {
    const sources = Object.entries(map.getStyle()?.sources ?? {});
    // Ignore teaching overlays and the optional low-zoom relief underlay.
    const vectors = sources.filter(([, s]) => s.type === "vector");
    sourceIds = new Set((vectors.length ? vectors : sources.filter(([id, s]) =>
      s.type === "raster" || (current === "natural-earth" && id === "land"),
    )).map(([id]) => id));
  };
  const advance = () => {
    if (disposed) return;
    const next = chain.shift();
    if (next) start(next, true);
    else { clear(); opts.onPhase?.("error"); }
  };
  const start = (basemap: MapBasemap, replace: boolean) => {
    clear(); healthy = false; sourceIds.clear(); current = basemap;
    opts.onBasemap?.(current); opts.onPhase?.("loading");
    timer = setTimeout(advance, opts.timeoutMs ?? 8000);
    try {
      if (replace) map.setStyle(basemapStyle(current));
      else identifySources();
    } catch { advance(); }
  };
  const onData = (e?: MapEvent) => {
    if (disposed || !e?.sourceId || !sourceIds.has(e.sourceId)) return;
    // MapLibre uses content/idle, never sourceDataType="tile". Metadata alone
    // and a failed tile's idle event must not make a blank map look healthy.
    const loaded = current === "natural-earth"
      ? e.tile?.state === "loaded" || (e.sourceDataType === "content" && e.isSourceLoaded)
      : e.tile?.state === "loaded";
    if (!loaded) return;
    healthy = true; clear();
    opts.onPhase?.(current === "natural-earth" ? "offline" : "ready");
  };
  const onError = (e?: MapEvent) => {
    if (disposed || pending || current === "natural-earth") return;
    if (e?.sourceId && !sourceIds.has(e.sourceId)) return;
    const message = e?.error?.message ?? "";
    if (/glyph|font|sprite|image.*could not/i.test(message)) return;
    const status = e?.error?.status ?? 0;
    if (status < 400 && !/failed to fetch|network|load.*error|403|429/i.test(message)) return;
    // A single edge tile failure should not discard a working map. Auth and
    // rate-limit failures do require fallback, even after earlier success.
    if (healthy && status !== 401 && status !== 403 && status !== 429) return;
    pending = setTimeout(advance, 250);
  };
  const select = (basemap: MapBasemap, replace = true) => {
    // CARTO now serves watermarked tiles with HTTP 200 unless a key is supplied.
    // It must not be part of the keyless chain, even if network checks pass.
    chain = ([basemap, "osm", "natural-earth"] as MapBasemap[])
      .filter((b, i, all) => all.indexOf(b) === i).slice(1);
    start(basemap, replace);
  };
  map.on("style.load", identifySources);
  map.on("sourcedata", onData);
  map.on("error", onError);
  select(current, false);
  return Object.assign(() => {
    disposed = true; clear();
    map.off("style.load", identifySources);
    map.off("sourcedata", onData);
    map.off("error", onError);
  }, { select });
}
