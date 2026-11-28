/**
 * Keyless basemaps: OpenFreeMap vector, OSM raster, then bundled Natural Earth. Relief and
 * bathymetry draw on OpenFreeMap with elevation from the Terrain Tiles open dataset.
 */

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

/**
 * Elevation from the Terrain Tiles open dataset on AWS (SRTM, GMTED2010, ETOPO1, 3DEP and
 * others; credits on /image-credits#elevation). Heights are encoded in the tile colors, and the
 * map shades relief and colors ocean depth from them itself, so no other tile server is needed.
 */
export const TERRAIN_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const DEM = "terrain";
const DEM_SOURCE = {
  type: "raster-dem" as const,
  tiles: [TERRAIN_TILES],
  tileSize: 256,
  encoding: "terrarium" as const,
  maxzoom: 15,
  attribution:
    '<a href="/image-credits#elevation">Elevation: Terrain Tiles</a> (USGS, NOAA and others)',
};

type StyleLayer = { id: string; type: string; filter?: unknown; [key: string]: unknown };
type StyleDoc = { sources: Record<string, unknown>; layers: StyleLayer[]; [key: string]: unknown };

const insertBefore = (layers: StyleLayer[], id: string, added: StyleLayer[]) => {
  const at = layers.findIndex((l) => l.id === id);
  return at < 0 ? [...layers, ...added] : [...layers.slice(0, at), ...added, ...layers.slice(at)];
};

/**
 * OpenFreeMap with a light height tint under the land cover and shaded relief over it. Water, roads
 * and labels stay on top. Land below sea level keeps the plain map color.
 */
export function withRelief(style: StyleDoc): StyleDoc {
  const tint: StyleLayer = {
    id: "relief-tint",
    type: "color-relief",
    source: DEM,
    paint: {
      // Stronger at world scale, lighter close up so streets and land cover stay clear.
      "color-relief-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.6, 8, 0.5, 12, 0.35],
      "color-relief-color": [
        "interpolate",
        ["linear"],
        ["elevation"],
        0,
        "rgba(0,0,0,0)",
        1,
        "#a9c79a",
        400,
        "#d8d9a4",
        1200,
        "#d3b98c",
        2500,
        "#b08d6e",
        4500,
        "#efece8",
      ],
    },
  };
  const shade: StyleLayer = {
    id: "relief-shade",
    type: "hillshade",
    source: DEM,
    paint: {
      // Slopes look gentler on coarse world-scale tiles, so shade them more there.
      "hillshade-exaggeration": [
        "interpolate",
        ["linear"],
        ["zoom"],
        0,
        0.85,
        6,
        0.7,
        10,
        0.55,
        14,
        0.45,
      ],
      "hillshade-shadow-color": "rgba(38,44,40,0.6)",
      "hillshade-highlight-color": "rgba(255,255,255,0.3)",
    },
  };
  return {
    ...style,
    sources: { ...style.sources, [DEM]: DEM_SOURCE },
    layers: insertBefore(insertBefore(style.layers, "park", [tint]), "water", [shade]),
  };
}

const OCEAN = ["==", ["get", "class"], "ocean"];

/**
 * OpenFreeMap with the sea colored by depth. The coastline comes from the map's own ocean
 * polygons, water down to 500 m (the continental shelves and upper slopes) keeps a pale blue, and
 * deeper water darkens, so slopes, ridges and trenches show. No dry land is that low (the lowest,
 * beside the Dead Sea, is about 440 m below sea level), so the depth colors fall only on the sea.
 * Lakes and rivers keep their usual blue. Like a printed ocean-floor map it has no place names or
 * other labels, so a map quiz cannot be answered by reading them. Classroom bathymetry, not a
 * chart for navigation.
 */
export function withBathymetry(style: StyleDoc): StyleDoc {
  const water = style.layers.find((l) => l.id === "water");
  const notOcean = ["!", OCEAN];
  const layers = style.layers
    .filter((l) => l.type !== "symbol")
    .map((l) =>
      l.id === "water" ? { ...l, filter: l.filter ? ["all", l.filter, notOcean] : notOcean } : l,
    );
  return {
    ...style,
    sources: { ...style.sources, [DEM]: DEM_SOURCE },
    layers: insertBefore(layers, "park", [
      {
        id: "ocean-base",
        type: "fill",
        source: water?.source ?? "openmaptiles",
        "source-layer": "water",
        filter: OCEAN,
        paint: { "fill-color": "#b9dbee" },
      },
      {
        id: "ocean-depth",
        type: "color-relief",
        source: DEM,
        paint: {
          "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            -8000,
            "#0b1f50",
            -6000,
            "#12346a",
            -4500,
            "#1b4a84",
            -3000,
            "#2f68a3",
            -2000,
            "#4a87bd",
            -1000,
            "#79afd6",
            -500,
            "rgba(185,219,238,0)",
          ],
        },
      },
      {
        id: "ocean-shade",
        type: "hillshade",
        source: DEM,
        paint: {
          "hillshade-exaggeration": 0.35,
          "hillshade-shadow-color": "rgba(10,25,50,0.5)",
          "hillshade-highlight-color": "rgba(255,255,255,0.18)",
        },
      },
    ]),
  };
}

type TransformStyle = (previous: unknown, next: StyleDoc) => StyleDoc;

/** The change a basemap makes to the OpenFreeMap style it starts from, if any. */
export function basemapTransform(basemap: MapBasemap): TransformStyle | undefined {
  if (basemap === "relief") return (_previous, next) => withRelief(next);
  if (basemap === "bathymetry") return (_previous, next) => withBathymetry(next);
  return undefined;
}

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
  setStyle: (s: unknown, options: { diff: boolean; transformStyle?: TransformStyle }) => unknown;
  getStyle: () => { sources?: Record<string, { type?: string }> } | undefined;
};

export type MapPhase = "loading" | "ready" | "offline" | "error";
export function basemapStyle(basemap: MapBasemap) {
  return {
    // Liberty: OpenFreeMap's light, well-labeled style. The dark Fiord style left place names
    // and coastlines too faint to read in both site themes.
    // Relief and bathymetry are OpenFreeMap plus layers drawn from elevation (basemapTransform).
    openfreemap: LIBERTY, osm: OSM_RASTER_STYLE, relief: LIBERTY, bathymetry: LIBERTY,
    "natural-earth": NATURAL_EARTH_STYLE,
  }[basemap];
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
      if (replace) {
        // Reload in full rather than diff: relief, bathymetry and the plain map share OpenFreeMap's
        // tiles, and a diff would keep them without the fresh tile loads that show it is healthy.
        const transformStyle = basemapTransform(current);
        const options = transformStyle ? { diff: false, transformStyle } : { diff: false };
        map.setStyle(basemapStyle(current), options);
      } else identifySources();
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
  // Relief and bathymetry maps start from an empty style (LibreMap) and load OpenFreeMap with their
  // layers here; the other basemaps are already loading.
  select(current, Boolean(basemapTransform(current)));
  return Object.assign(() => {
    disposed = true; clear();
    map.off("style.load", identifySources);
    map.off("sourcedata", onData);
    map.off("error", onError);
  }, { select });
}
