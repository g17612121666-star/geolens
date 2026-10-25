import { LoadingProgress } from "@/components/loading-progress";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { LibreMap, type MapFeatureHit } from "@/components/map/libre-map";
import {
  BASINS,
  CURRENTS,
  KOPPEN,
  PLATE_ARROWS,
  PLATE_LEGEND,
  QUAKES,
  RIVERS,
  SEARCH_POI,
  SETTLEMENTS,
  TEACHING_PRESETS,
  VOLCANOES,
} from "@/lib/map-overlays";
import { ATLAS, atlasKindLabel, nearestAtlasPlace } from "@/lib/atlas-data";
import { cn } from "@/lib/utils";
import { fmtLatLon, haversineKm } from "@/lib/geo";
import { sphericalAreaKm2, geodesicCoordinates } from "@/lib/map-measure";
import { headFor } from "@/lib/seo";
import { nightPolygon, subsolarPoint } from "@/lib/solar";

export const Route = createFileRoute("/tools/map")({
  component: MapStudio,
  head: () =>
    headFor({
      title: "World map studio",
      description:
        "Explore relief, climate and plate boundaries on a free interactive world map. Compare places and measure distances for a classroom investigation.",
      path: "/tools/map",
    }),
});

const CITY_PRESETS = [
  { name: "London", lat: 51.51, lon: -0.13, zoom: 6 },
  { name: "New York", lat: 40.71, lon: -74.01, zoom: 6 },
  { name: "Nairobi", lat: -1.29, lon: 36.82, zoom: 6 },
  { name: "Sydney", lat: -33.87, lon: 151.21, zoom: 6 },
  { name: "Tokyo", lat: 35.68, lon: 139.69, zoom: 6 },
  { name: "Reykjavík", lat: 64.15, lon: -21.94, zoom: 6 },
  { name: "Cairo", lat: 30.04, lon: 31.24, zoom: 6 },
  { name: "Shanghai", lat: 31.23, lon: 121.47, zoom: 6 },
  { name: "Hong Kong", lat: 22.3, lon: 114.17, zoom: 9 },
  { name: "Taipei", lat: 25.03, lon: 121.57, zoom: 8 },
  { name: "Singapore", lat: 1.35, lon: 103.82, zoom: 6 },
] as const;

type BaseMap = "vector" | "relief" | "political" | "bathymetry";
type Layers = {
  rivers: boolean;
  settlements: boolean;
  plates: boolean;
  plateFill: boolean;
  climate: boolean;
  volcanoes: boolean;
  quakes: boolean;
  currents: boolean;
  basins: boolean;
  graticule: boolean;
  borders: boolean;
  trenches: boolean;
  ridges: boolean;
  arrows: boolean;
  night: boolean;
};

const LAYER_OFF: Layers = {
  rivers: false,
  settlements: false,
  plates: true,
  plateFill: false,
  climate: false,
  volcanoes: false,
  quakes: false,
  currents: false,
  basins: false,
  graticule: false,
  borders: false,
  trenches: false,
  ridges: false,
  arrows: false,
  night: false,
};

function MapStudio() {
  const [baseMap, setBaseMap] = useState<BaseMap>("vector");
  const [layers, setLayers] = useState<Layers>(LAYER_OFF);
  const [center, setCenter] = useState<[number, number]>([10, 20]);
  const [zoom, setZoom] = useState(2);
  const [centerB, setCenterB] = useState<[number, number]>([100, 20]);
  const [zoomB, setZoomB] = useState(3);
  const [q, setQ] = useState("");
  const [hit, setHit] = useState<MapFeatureHit | null>(null);
  const [opacity, setOpacity] = useState(1);
  const [path, setPath] = useState<{ lat: number; lon: number }[]>([]);
  const [measuring, setMeasuring] = useState<"off" | "line" | "area">("off");
  const [projector, setProjector] = useState(false);
  const [split, setSplit] = useState(false);
  const [land, setLand] = useState<{
    lat: number;
    lon: number;
    name: string;
    notes: string[];
    kind: string;
  } | null>(null);
  const [notice, setNotice] = useState("");
  const [dataset, setDataset] = useState<{
    plates: { type: string; features: any[] };
    polygons: { type: string; features: any[] };
    borders: { type: string; features: any[] };
  } | null>(null);
  const [dataError, setDataError] = useState(false);
  const [dataAttempt, setDataAttempt] = useState(0);
  const viewA = useRef({ center: [10, 20] as [number, number], zoom: 2 });
  const viewB = useRef({ center: [100, 20] as [number, number], zoom: 3 });
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const num = (key: string, fallback: number, min: number, max: number) => {
      const value = q.get(key);
      const n = Number(value);
      return value !== null && Number.isFinite(n) && n >= min && n <= max ? n : fallback;
    };
    setCenter([num("lon", 10, -180, 180), num("lat", 20, -85, 85)]);
    setZoom(num("z", 2, 0, 18));
    setCenterB([num("lonB", 100, -180, 180), num("latB", 20, -85, 85)]);
    setZoomB(num("zB", 3, 0, 18));
    if (["vector", "relief", "political", "bathymetry"].includes(q.get("base") ?? ""))
      setBaseMap(q.get("base") as BaseMap);
    if (q.has("layers"))
      setLayers(
        Object.fromEntries(
          Object.keys(LAYER_OFF).map((k) => [k, q.get("layers")!.split(",").includes(k)]),
        ) as Layers,
      );
    setSplit(q.get("split") === "1");
    setOpacity(num("opacity", 1, 0.25, 1));
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    setDataError(false);
    Promise.all(
      ["plate-boundaries", "plate-polygons", "country-boundaries"].map((name) =>
        fetch(`/geo/${name}.json`, { signal: abort.signal }).then((r) => {
          if (!r.ok) throw new Error("Map dataset unavailable");
          return r.json();
        }),
      ),
    )
      .then(([plates, polygons, borders]) => setDataset({ plates, polygons, borders }))
      .catch(() => {
        if (!abort.signal.aborted) setDataError(true);
      });
    return () => abort.abort();
  }, [dataAttempt]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key.toLowerCase() === "p") setProjector((v) => !v);
      if (e.key === "Escape") setProjector(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  function preset(kind: "tectonics" | "water" | "climate" | "blank") {
    setLayers({
      ...(Object.fromEntries(Object.keys(LAYER_OFF).map((k) => [k, false])) as Layers),
      ...(kind === "tectonics"
        ? { plates: true, volcanoes: true }
        : kind === "water"
          ? { rivers: true, basins: true }
          : kind === "climate"
            ? { climate: true, graticule: true }
            : {}),
    });
    setBaseMap(kind === "water" ? "relief" : "vector");
    setMeasuring("off");
    setPath([]);
    setHit(null);
    setLand(null);
    setCenter([10, 20]);
    setZoom(2);
  }
  async function copyView() {
    const a = viewA.current,
      b = viewB.current;
    const q = new URLSearchParams({
      lat: String(a.center[1]),
      lon: String(a.center[0]),
      z: String(a.zoom),
      latB: String(b.center[1]),
      lonB: String(b.center[0]),
      zB: String(b.zoom),
      base: baseMap,
      layers: Object.entries(layers)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(","),
      split: split ? "1" : "0",
      opacity: String(opacity),
    });
    const url = `${window.location.origin}/tools/map?${q}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("View link copied, including layers and both panes.");
    } catch {
      setNotice("Your view is saved in the address bar. Copy that link.");
    }
  }
  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  // Live day and night: redraw the shadow every minute while the layer is on.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!layers.night) return;
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, [layers.night]);

  const overlays = useMemo(() => {
    const o: {
      id: string;
      data: { type: string; features: unknown[] };
      color: string;
      circle?: boolean;
      width?: number;
      plates?: boolean;
      ranked?: boolean;
      opacity?: number;
      polygon?: boolean;
      labels?: boolean;
    }[] = [];
    if (layers.night)
      o.push({
        id: "night",
        labels: false,
        data: nightPolygon(now),
        color: "#04070d",
        polygon: true,
        opacity: 0.55 * opacity,
      });
    if (layers.plateFill && dataset)
      o.push({
        id: "platefill",
        labels: false,
        data: dataset.polygons,
        color: "#3EE0C6",
        polygon: true,
        opacity: opacity * 0.9,
      });
    if (layers.borders && dataset)
      o.push({
        id: "borders",
        labels: false,
        data: dataset.borders,
        color: "#c9d4d0",
        width: 1.4,
        opacity,
      });
    if (layers.rivers)
      o.push({ id: "rivers", data: RIVERS, color: "#7FD4FF", width: 2.2, opacity });
    if (layers.basins)
      o.push({ id: "basins", data: BASINS, color: "#7c9a6a", width: 1.6, opacity });
    if (layers.currents)
      o.push({ id: "currents", data: CURRENTS, color: "#7FD4FF", width: 2.4, opacity });
    if (layers.trenches && dataset)
      o.push({
        id: "trenches",
        labels: false,
        data: {
          ...dataset.plates,
          features: dataset.plates.features.filter((f) => f.properties.class === "SUB"),
        },
        color: "#FF6A3D",
        width: 3.0,
        opacity,
      });
    if (layers.ridges && dataset)
      o.push({
        id: "ridges",
        labels: false,
        data: {
          ...dataset.plates,
          features: dataset.plates.features.filter((f) => f.properties.class === "OSR"),
        },
        color: "#3EE0C6",
        width: 2.8,
        opacity,
      });
    if (layers.arrows)
      o.push({ id: "arrows", data: PLATE_ARROWS, color: "#E8B86D", width: 2.6, opacity });
    if (layers.plates && dataset)
      o.push({
        id: "plates",
        labels: false,
        data: dataset.plates,
        color: "#FF6A3D",
        width: 2.8,
        plates: true,
        opacity,
      });
    if (layers.settlements)
      o.push({
        id: "towns",
        data: SETTLEMENTS,
        color: "#E8B86D",
        circle: true,
        ranked: true,
        opacity,
      });
    if (layers.climate)
      o.push({ id: "koppen", data: KOPPEN, color: "#3EE0C6", circle: true, opacity });
    if (layers.volcanoes)
      o.push({ id: "volcanoes", data: VOLCANOES, color: "#FF6A3D", circle: true, opacity });
    if (layers.quakes)
      o.push({ id: "quakes", data: QUAKES, color: "#E8B86D", circle: true, opacity });
    if (path.length > 1) {
      const coords = geodesicCoordinates(path, measuring === "area");
      const data = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: measuring === "area" ? "Measured area" : "Measured path",
              kind: "measure",
              note: "Classroom measure. Great-circle km.",
            },
            geometry:
              measuring === "area" && path.length > 2
                ? { type: "Polygon", coordinates: [coords] }
                : { type: "LineString", coordinates: coords },
          },
        ],
      };
      o.push({
        id: `measure-${path.length}`,
        data,
        color: "#3EE0C6",
        width: 2.8,
        opacity: 1,
        polygon: measuring === "area" && path.length > 2,
      });
    }
    return o;
  }, [layers, opacity, path, measuring, dataset, now]);

  const searchHits = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const fromAtlas = ATLAS.filter((p) =>
      `${p.name} ${p.capital} ${p.hook} ${(p.alias ?? []).join(" ")}`
        .toLowerCase()
        .includes(needle),
    ).slice(0, 6);
    const fromPoi = SEARCH_POI.filter((p) => p.name.toLowerCase().includes(needle));
    const fromTeach = TEACHING_PRESETS.filter((p) => p.name.toLowerCase().includes(needle));
    return [
      ...fromTeach.map((p) => ({
        name: p.name,
        lat: p.lat,
        lon: p.lon,
        zoom: p.zoom,
        note: p.note,
      })),
      ...fromPoi.map((p) => ({ name: p.name, lat: p.lat, lon: p.lon, zoom: p.zoom, note: p.note })),
      ...fromAtlas.map((p) => ({
        name: `${p.name} · ${p.capital}`,
        lat: p.lat,
        lon: p.lon,
        zoom: p.kind === "country" ? 4 : 7,
        note: p.hook,
      })),
    ].slice(0, 10);
  }, [q]);

  function go(lat: number, lon: number, z = 5, name = "", note = "") {
    setCenter([lon, lat]);
    setZoom(z);
    const near = nearestAtlasPlace(lat, lon, 4);
    setLand({
      lat,
      lon,
      name: name || near?.name || "Dropped point",
      notes: note
        ? [note]
        : near
          ? [
              `Use the layers to investigate the relief, climate and plate setting around ${near.name}.`,
            ]
          : ["Click a location or a mapped feature to investigate its surroundings."],
      kind: near ? atlasKindLabel(near.kind) : "Locator",
    });
    setHit(null);
  }

  function onClickMap(c: { lat: number; lon: number }, pane: "a" | "b") {
    if (measuring !== "off") {
      setPath((p) => [...p, c]);
      return;
    }
    const near = nearestAtlasPlace(c.lat, c.lon);
    setLand({
      lat: c.lat,
      lon: c.lon,
      name: near ? `Near ${near.name} (reference point)` : "Dropped point",
      notes: near
        ? [
            `Use the layers to investigate the relief, climate and plate setting around ${near.name}.`,
          ]
        : [
            "There is no Atlas reference point within about 400 km. Use the map layers to investigate this location.",
          ],
      kind: near ? atlasKindLabel(near.kind) : "Locator",
    });
    if (pane === "b") {
      setCenterB([c.lon, c.lat]);
    }
  }

  const pathKm = useMemo(() => {
    let n = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      n += haversineKm(a.lat, a.lon, b.lat, b.lon);
    }
    return n;
  }, [path]);
  const areaKm2 = measuring === "area" ? sphericalAreaKm2(path) : 0;

  function setLayer<K extends keyof Layers>(k: K, v: boolean) {
    setLayers((L) => ({ ...L, [k]: v }));
  }

  return (
    <main
      id="main"
      className={cn(
        "mx-auto px-5 pb-24 pt-24",
        projector ? "max-w-[1600px] text-lg" : "max-w-[1280px]",
      )}
    >
      <p className="section-label">{"Tools"}</p>
      <h1 className="mt-3 font-display text-4xl">{"World map studio"}</h1>
      <p className="mt-4 max-w-2xl text-mist">
        {
          "Explore coastlines, relief and ocean depth, then compare them with plate boundaries or climate. Choose a teaching example, inspect a feature or measure between places. Earthquake markers show selected past events."
        }
      </p>
      <p className="mt-2 text-sm text-mist">
        {"Also:"}{" "}
        <Link to="/tools/live-weather" className="text-ice hover:underline">
          {"Live weather"}
        </Link>
        {" · "}
        <Link to="/atlas" className="text-ice hover:underline">
          {"Atlas"}
        </Link>
      </p>

      <section aria-label={"Classroom presets"} className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["tectonics", "Plate margins"],
            ["water", "Water and relief"],
            ["climate", "Climate examples"],
            ["blank", "Blank classroom map"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            className="min-h-11 rounded-full border border-glacier/30 bg-glacier/5 px-4 text-sm hover:bg-glacier/15"
            onClick={() => preset(id)}
          >
            {label}
          </button>
        ))}
      </section>
      <p role="status" className="mt-3 text-sm text-glacier">
        {notice}
      </p>
      <details className="mt-4 rounded-2xl border border-white/10 p-4">
        <summary className="min-h-11 cursor-pointer text-sm text-mist">
          {"Basemap and optional teaching layers"}
        </summary>
        <p className="section-label mt-3 mb-3">{"Basemap"}</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["vector", "Vector coast"],
              ["relief", "Relief hillshade"],
              ["political", "Political outlines"],
              ["bathymetry", "Bathymetry"],
            ] as const
          ).map(([id, label]) => (
            <Toggle key={id} on={baseMap === id} set={() => setBaseMap(id)} label={label} />
          ))}
        </div>

        <p className="section-label mt-6 mb-3">{"Layers"}</p>
        <div className="flex flex-wrap gap-2">
          <Toggle on={layers.rivers} set={(v) => setLayer("rivers", v)} label={"Rivers"} />
          <Toggle on={layers.basins} set={(v) => setLayer("basins", v)} label={"Basin sketches"} />
          <Toggle
            on={layers.settlements}
            set={(v) => setLayer("settlements", v)}
            label={"Settlements"}
          />
          <Toggle on={layers.borders} set={(v) => setLayer("borders", v)} label={"Borders"} />
          <Toggle
            on={layers.plates}
            set={(v) => setLayer("plates", v)}
            label={"Plate boundaries"}
          />
          <Toggle
            on={layers.plateFill}
            set={(v) => setLayer("plateFill", v)}
            label={"Plate polygons"}
          />
          <Toggle on={layers.arrows} set={(v) => setLayer("arrows", v)} label={"Motion sketches"} />
          <Toggle
            on={layers.night}
            set={(v) => setLayer("night", v)}
            label={"Day and night (now)"}
          />
          <Toggle on={layers.trenches} set={(v) => setLayer("trenches", v)} label={"Trenches"} />
          <Toggle on={layers.ridges} set={(v) => setLayer("ridges", v)} label={"Ridges"} />
          <Toggle on={layers.volcanoes} set={(v) => setLayer("volcanoes", v)} label={"Volcanoes"} />
          <Toggle
            on={layers.quakes}
            set={(v) => setLayer("quakes", v)}
            label={"Historical earthquakes"}
          />
          <Toggle
            on={layers.currents}
            set={(v) => setLayer("currents", v)}
            label={"Current paths"}
          />
          <Toggle
            on={layers.climate}
            set={(v) => setLayer("climate", v)}
            label={"Köppen examples"}
          />
          <Toggle on={layers.graticule} set={(v) => setLayer("graticule", v)} label={"Graticule"} />
        </div>

        <label className="mt-4 flex max-w-xs items-center gap-3 text-sm text-mist">
          {"Overlay opacity"}
          <input
            type="range"
            min={0.25}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="flex-1 accent-glacier"
          />
          <span className="font-mono text-xs">{Math.round(opacity * 100)}%</span>
        </label>
      </details>
      <p className="section-label mt-6 mb-3">{"Classroom"}</p>
      <div className="flex flex-wrap gap-2">
        <Toggle
          on={measuring === "line"}
          set={(v) => {
            setMeasuring(v ? "line" : "off");
            setPath([]);
          }}
          label={"Measure km"}
        />
        <Toggle
          on={measuring === "area"}
          set={(v) => {
            setMeasuring(v ? "area" : "off");
            setPath([]);
          }}
          label={"Measure km²"}
        />
        <Toggle on={split} set={setSplit} label={"Split view"} />
        <Toggle on={projector} set={setProjector} label={"Projector"} />
        <button
          type="button"
          onClick={copyView}
          className="min-h-11 rounded-full border border-white/10 px-3.5 text-sm text-mist hover:text-chalk"
        >
          {"Copy view link"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCenter([10, 20]);
            setZoom(2);
            setHit(null);
            setLand(null);
            setPath([]);
            setLayers(LAYER_OFF);
            setBaseMap("vector");
            setMeasuring("off");
            setSplit(false);
            setQ("");
            setOpacity(1);
          }}
          className="min-h-11 rounded-full border border-white/10 px-3.5 text-sm text-mist hover:text-chalk"
        >
          {"Reset view"}
        </button>
      </div>

      <details className="mt-4">
        <summary className="min-h-11 cursor-pointer text-sm text-mist">
          {"Jump to a city or case-study place"}
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {CITY_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => go(p.lat, p.lon, p.zoom, p.name, "")}
              className="min-h-11 rounded-full border border-white/10 bg-white/6 px-3 text-sm text-chalk hover:bg-white/10"
            >
              {p.name}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {TEACHING_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => go(p.lat, p.lon, p.zoom, p.name, p.note)}
              className="min-h-11 rounded-full border border-white/10 px-3 text-sm text-mist hover:bg-white/10 hover:text-chalk"
            >
              {p.name}
            </button>
          ))}
        </div>

        <label className="relative mt-4 block max-w-md">
          <span className="sr-only">{"Search places"}</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={"Holderness, Himalaya, San Andreas, Shanghai…"}
            className="h-11 w-full rounded-[12px] border border-white/10 bg-white/6 px-3 text-chalk placeholder:text-mist/70"
            suppressHydrationWarning
          />
          {searchHits.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-white/10 bg-basalt/95 shadow-2xl">
              {searchHits.map((h) => (
                <li key={`${h.name}-${h.lat}`}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2.5 text-left text-sm text-chalk hover:bg-white/8"
                    onClick={() => {
                      go(h.lat, h.lon, h.zoom, h.name, h.note);
                      setQ("");
                    }}
                  >
                    {h.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </label>

        {q.trim().length >= 2 && searchHits.length === 0 && (
          <p role="status" className="mt-2 text-sm text-mist">
            {"No matching place. Try a country, city or landform name."}
          </p>
        )}
      </details>
      {!dataset && (
        <div role="status" className="mt-3 text-sm text-mist">
          {dataError ? (
            "Plate and border data could not load."
          ) : (
            <LoadingProgress label={"Loading plate and border data"} />
          )}
          {dataError && (
            <button
              className="ml-2 min-h-11 underline"
              onClick={() => setDataAttempt((n) => n + 1)}
            >
              {"Retry layers"}
            </button>
          )}
        </div>
      )}
      {measuring !== "off" && (
        <p className="mt-3 rounded-xl border border-glacier/20 bg-glacier/5 p-3 text-sm">
          {"Click or tap "}
          {measuring === "area"
            ? "at least three corners of a simple polygon"
            : "two or more points"}
          {". Segments follow great circles. "}
          <button
            className="min-h-11 px-3 underline disabled:opacity-40"
            disabled={!path.length}
            onClick={() => setPath((p) => p.slice(0, -1))}
          >
            {"Undo point"}
          </button>
          <button className="min-h-11 px-3 underline" onClick={() => setPath([])}>
            {"Clear"}
          </button>
        </p>
      )}
      <div className={cn("mt-6 grid gap-4", split && "lg:grid-cols-2")}>
        <LibreMap
          center={center}
          onViewChange={(v) => {
            viewA.current = v;
          }}
          inspectFeatures={measuring === "off"}
          zoom={zoom}
          baseMap={baseMap}
          overlays={overlays}
          graticule={layers.graticule}
          onFeature={(f) => {
            setHit(f);
            setLand({
              lat: f.lat,
              lon: f.lon,
              name: f.title,
              notes: [f.note],
              kind: f.kind || "Overlay",
            });
          }}
          onClick={(c) => onClickMap(c, "a")}
          onMove={setCursor}
          className={cn(
            "h-[min(72vh,42rem)] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench",
            projector && "!h-[78vh]",
          )}
          label={"World map studio A"}
        />
        {split && (
          <LibreMap
            center={centerB}
            onViewChange={(v) => {
              viewB.current = v;
            }}
            inspectFeatures={measuring === "off"}
            zoom={zoomB}
            baseMap={baseMap}
            overlays={overlays}
            graticule={layers.graticule}
            onFeature={(f) => {
              setHit(f);
              setLand({
                lat: f.lat,
                lon: f.lon,
                name: f.title,
                notes: [f.note],
                kind: f.kind || "Overlay",
              });
            }}
            onClick={(c) => onClickMap(c, "b")}
            onMove={setCursor}
            className="h-[min(72vh,42rem)] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench"
            label={"World map studio B"}
          />
        )}
      </div>
      <div
        className="mt-4 flex flex-wrap gap-x-5 gap-y-2 rounded-xl border border-white/10 p-4 text-sm text-mist"
        aria-label={"Visible layer legend"}
      >
        {layers.rivers && (
          <span>
            <b className="text-ice">━</b> {"Selected rivers"}
          </span>
        )}
        {layers.basins && (
          <span>
            <b className="text-[#7c9a6a]">━</b> {"Schematic basin/corridor"}
          </span>
        )}
        {layers.volcanoes && (
          <span>
            <b className="text-[#FF6A3D]">●</b> {"Selected volcanoes"}
          </span>
        )}
        {layers.quakes && (
          <span>
            <b className="text-[#E8B86D]">●</b> {"Historical epicentres"}
          </span>
        )}
        {layers.currents && (
          <span>
            <b className="text-ice">━</b> {"Schematic current paths"}
          </span>
        )}
        {layers.arrows && (
          <span>
            <b className="text-[#E8B86D]">━</b> {"Plate movement directions"}
          </span>
        )}
        {layers.settlements && (
          <span>
            <b className="text-[#E8B86D]">●</b> {"Settlements"}
          </span>
        )}
        {layers.plateFill && (
          <span>
            <b className="text-glacier">▰</b> {"PB2002 plate interiors"}
          </span>
        )}
        {layers.graticule && <span>{"Graticule at 30° longitude and 15° latitude"}</span>}
        {layers.night && (
          <span>
            <b className="text-slate">▰</b>
            {` Night side at ${now.toISOString().slice(11, 16)} UTC · Sun overhead at ${Math.abs(subsolarPoint(now).lat).toFixed(1)}°${subsolarPoint(now).lat >= 0 ? "N" : "S"}, updated each minute; twilight not shown`}
          </span>
        )}
      </div>
      {cursor && (
        <p className="mt-2 font-mono text-xs text-mist">
          {"Cursor "}
          {fmtLatLon(cursor.lat, cursor.lon, 2)}
        </p>
      )}
      {split && (
        <p className="mt-2 text-sm text-mist">
          {
            "The left map shows place A. Click the right map to choose place B and compare the same layers in two locations."
          }
        </p>
      )}

      {layers.plates && (
        <ul className="mt-4 grid gap-3 text-sm text-mist md:grid-cols-3">
          {PLATE_LEGEND.map((l) => (
            <li key={l.kind}>
              <button
                type="button"
                className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-white/10 p-4 text-left leading-6 hover:border-glacier/40 hover:text-chalk"
                onClick={() => {
                  if (l.kind === "divergent")
                    go(64.15, -21.94, 4, "Divergent boundary in Iceland", l.note);
                  else if (l.kind === "convergent")
                    go(35.68, 139.65, 4, "Convergent boundary near Japan", l.note);
                  else go(36.0, -120.5, 5, "San Andreas transform boundary", l.note);
                }}
              >
                <span
                  className="inline-block h-1.5 w-8 rounded-full"
                  style={{ background: l.color }}
                />
                <span className="text-chalk">{l.label}</span>
                <span>{l.note}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {layers.climate && (
        <ul
          className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5"
          aria-label="Climate families"
        >
          {[
            ["A: Tropical", "Monthly mean temperatures remain warm throughout the year."],
            ["B: Dry", "Precipitation is below the classification’s dryness threshold."],
            ["C: Temperate", "Winters are mild compared with continental climates."],
            ["D: Continental", "Cold winters contrast with a warmer summer."],
            ["E: Polar", "Even the warmest month remains cool."],
          ].map(([name, description]) => (
            <li key={name} className="rounded-xl border border-white/10 p-4">
              <p className="font-medium text-chalk">{name}</p>
              <p className="mt-2 text-xs leading-6 text-mist">{description}</p>
            </li>
          ))}
        </ul>
      )}

      {path.length > 0 && (
        <p className="mt-4 font-mono text-sm text-glacier">
          {path.length} {"point"}
          {path.length === 1 ? "" : "s"}
          {path.length > 1 && ` · path ${pathKm.toFixed(0)} km`}
          {measuring === "area" && path.length > 2 && ` · area ~${areaKm2.toFixed(0)} km²`}
          {path[0] &&
            ` · last ${fmtLatLon(path[path.length - 1]!.lat, path[path.length - 1]!.lon)}`}
          {" · "}
          <button type="button" className="underline" onClick={() => setPath([])}>
            {"Clear measure"}
          </button>
        </p>
      )}
      {land && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-glacier">
            {hit?.kind || land.kind}
          </p>
          <h2 className="mt-1 font-display text-2xl text-chalk">{land.name}</h2>
          <p className="mt-1 font-mono text-sm text-ice">{fmtLatLon(land.lat, land.lon, 2)}</p>
          <div className="mt-3 space-y-2 leading-7 text-chalk/90">
            {land.notes.filter(Boolean).map((n) => (
              <p key={n.slice(0, 48)}>{n}</p>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 text-sm leading-6 text-mist">
        Drag to pan and use Ctrl + scroll, pinch or the map’s plus and minus controls to zoom. Click
        a location to read its coordinates.
      </p>
      <details className="mt-5 rounded-xl border border-white/10 p-4 text-sm text-mist">
        <summary className="min-h-11 cursor-pointer text-chalk">
          Map sources and measurement method
        </summary>
        <div className="max-w-3xl space-y-3 leading-6">
          <p>
            Plate boundaries use{" "}
            <a href="https://github.com/fraxen/tectonicplates" className="text-ice underline">
              Bird’s PB2002 model (2003), converted by Nordpil under ODC-BY 1.0
            </a>
            . Borders come from Natural Earth’s public-domain dataset. Other overlays show selected
            teaching examples; ocean-current paths and motion arrows are simplified.
          </p>
          <p>
            Distance and area calculations use a sphere with a radius of 6,371 km. For area
            measurements, draw a polygon smaller than a hemisphere without crossing its own edges.
          </p>
          <p>
            Basemaps are supplied by OpenFreeMap, OpenStreetMap contributors, OpenTopoMap and Esri
            Ocean using GEBCO ocean-depth data. Attribution for the active basemap remains on each
            map.
          </p>
        </div>
      </details>
    </main>
  );
}

function Toggle({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => set(!on)}
      className={cn(
        "min-h-11 rounded-full border px-3.5 text-sm",
        on
          ? "border-glacier/40 bg-glacier/15 text-glacier"
          : "border-white/10 text-mist hover:text-chalk",
      )}
    >
      {label}
    </button>
  );
}
