import { LoadingProgress } from "@/components/loading-progress";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { attachStyleFallback, basemapStyle, type MapBasemap, type MapPhase } from "@/lib/map-style";
import { pageScrollUnlessCtrl } from "@/lib/embedded-wheel";

export { FIORD, LIBERTY } from "@/lib/map-style";

export type MapClick = { lat: number; lon: number };
export type MapFeatureHit = {
  title: string;
  note: string;
  kind: string;
  lat: number;
  lon: number;
};

export type Overlay = {
  id: string;
  data: { type: string; features: unknown[] };
  color: string;
  width?: number;
  circle?: boolean;
  /** data-driven plate kinds */
  plates?: boolean;
  /** settlements: hide small cities at world zoom */
  ranked?: boolean;
  /** translucent halo, e.g. atlas selection */
  fill?: boolean;
  labels?: boolean;
  /** overlay opacity 0–1 */
  opacity?: number;
  /** fill polygons (plate interiors) */
  polygon?: boolean;
};

type MapHandle = {
  remove: () => void;
  flyTo: (o: { center: [number, number]; zoom?: number; essential?: boolean }) => void;
  fitBounds?: (
    bounds: [[number, number], [number, number]],
    options: {
      padding: number | { top: number; bottom: number; left: number; right: number };
      maxZoom: number;
      duration: number;
      essential: boolean;
    },
  ) => void;
  getCanvas: () => HTMLCanvasElement;
  loaded: () => boolean;
  isStyleLoaded?: () => boolean;
  setStyle: (s: unknown) => void;
  on: (ev: string, fn: (e?: unknown) => void) => void;
  off?: (ev: string, fn: (e?: unknown) => void) => void;
  getSource: (id: string) => unknown;
  getLayer?: (id: string) => unknown;
  addSource: (id: string, spec: unknown) => void;
  addLayer: (layer: unknown, before?: string) => void;
  removeLayer?: (id: string) => void;
  removeSource?: (id: string) => void;
  resize: () => void;
  zoomIn?: () => void;
  zoomOut?: () => void;
  queryRenderedFeatures?: (
    pt: unknown,
    opts?: { layers?: string[] },
  ) => { properties?: Record<string, string>; geometry?: { type: string } }[];
};

const CREDIT: Record<MapBasemap, string> = {
  openfreemap: "OpenFreeMap vector · OpenStreetMap contributors",
  osm: "OpenStreetMap contributors · raster basemap",
  "natural-earth": "Natural Earth 110m land — offline fallback. Coastlines only.",
  relief: "OpenTopoMap relief · OSM / SRTM · land elevation",
  bathymetry: "Esri Ocean / GEBCO. Seafloor as colour. Not a navigation chart.",
};

function meridians(): { type: string; features: unknown[] } {
  const features = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    const coordinates = [];
    for (let lat = -80; lat <= 80; lat += 5) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: { name: `${Math.abs(lon)}°${lon < 0 ? "W" : lon > 0 ? "E" : ""}` },
      geometry: { type: "LineString", coordinates },
    });
  }
  for (let lat = -60; lat <= 60; lat += 15) {
    const coordinates = [];
    for (let lon = -180; lon <= 180; lon += 5) coordinates.push([lon, lat]);
    features.push({
      type: "Feature",
      properties: { name: `${Math.abs(lat)}°${lat < 0 ? "S" : lat > 0 ? "N" : ""}` },
      geometry: { type: "LineString", coordinates },
    });
  }
  return { type: "FeatureCollection", features };
}

function paintCoast(
  canvas: HTMLCanvasElement,
  fc: { features: { geometry: { type: string; coordinates: unknown } }[] },
) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext("2d");
  if (!ctx || w < 4 || h < 4) return;
  ctx.fillStyle = "#0e2a38";
  ctx.fillRect(0, 0, w, h);
  const project = (lon: number, lat: number) => [((lon + 180) / 360) * w, ((90 - lat) / 180) * h];
  ctx.fillStyle = "#7C9A6A";
  ctx.strokeStyle = "#F4EFE6";
  ctx.lineWidth = Math.max(0.6, w / 900);
  const ring = (coords: number[][]) => {
    ctx.beginPath();
    coords.forEach(([lon, lat], i) => {
      const [x, y] = project(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  const walk = (geom: { type: string; coordinates: unknown }) => {
    if (geom.type === "Polygon") (geom.coordinates as number[][][]).forEach(ring);
    else if (geom.type === "MultiPolygon")
      (geom.coordinates as number[][][][]).forEach((poly) => poly.forEach(ring));
  };
  for (const f of fc.features) walk(f.geometry);
}

function StaticCoast({ className, hidden }: { className: string; hidden: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    const draw = (fc: { features: { geometry: { type: string; coordinates: unknown } }[] }) => {
      const parent = el.parentElement;
      const w = parent?.clientWidth || 640;
      const h = parent?.clientHeight || 360;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.max(2, Math.floor(w * dpr));
      el.height = Math.max(2, Math.floor(h * dpr));
      el.style.width = "100%";
      el.style.height = "100%";
      paintCoast(el, fc);
    };
    void fetch("/geo/ne_110m_land.geojson")
      .then((r) => r.json())
      .then((fc) => {
        if (cancelled) return;
        draw(fc);
        const ro = new ResizeObserver(() => draw(fc));
        if (el.parentElement) ro.observe(el.parentElement);
        (el as HTMLCanvasElement & { __ro?: ResizeObserver }).__ro = ro;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      (el as HTMLCanvasElement & { __ro?: ResizeObserver }).__ro?.disconnect();
    };
  }, []);
  return (
    <canvas
      ref={ref}
      className={className}
      aria-hidden={hidden}
      style={{ position: "absolute", inset: 0, opacity: hidden ? 0 : 1, pointerEvents: "none" }}
    />
  );
}

function applyOverlays(m: MapHandle, overlays: Overlay[], prev: string[], graticule: boolean) {
  for (const id of prev) {
    if (id === "relief") continue;
    try {
      if (m.getLayer?.(`${id}-label`)) m.removeLayer?.(`${id}-label`);
      if (m.getLayer?.(`${id}-outline`)) m.removeLayer?.(`${id}-outline`);
      if (m.getLayer?.(id)) m.removeLayer?.(id);
      if (m.getSource(id)) m.removeSource?.(id);
    } catch {
      /* style swap */
    }
  }
  if (graticule) {
    try {
      if (!m.getSource("graticule")) {
        m.addSource("graticule", { type: "geojson", data: meridians() as never });
        m.addLayer({
          id: "graticule",
          type: "line",
          source: "graticule",
          paint: { "line-color": "#F4EFE6", "line-width": 0.6, "line-opacity": 0.35 },
        });
      }
    } catch {
      /* */
    }
  } else {
    try {
      if (m.getLayer?.("graticule")) m.removeLayer?.("graticule");
      if (m.getSource("graticule")) m.removeSource?.("graticule");
    } catch {
      /* */
    }
  }
  for (const ov of overlays) {
    if (m.getSource(ov.id)) continue;
    try {
      m.addSource(ov.id, { type: "geojson", data: ov.data as never });
      if (ov.fill && ov.circle) {
        m.addLayer({
          id: ov.id,
          type: "circle",
          source: ov.id,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 22, 5, 52, 8, 90],
            "circle-color": ov.color,
            "circle-opacity": 0.22 * (ov.opacity ?? 1),
            "circle-stroke-color": ov.color,
            "circle-stroke-width": 2.2,
            "circle-stroke-opacity": 0.95,
          },
        });
      } else if (ov.polygon) {
        m.addLayer({
          id: ov.id,
          type: "fill",
          source: ov.id,
          paint: {
            "fill-color": ov.color,
            "fill-opacity": 0.14 * (ov.opacity ?? 1),
            "fill-outline-color": ov.color,
          },
        });
        m.addLayer({
          id: `${ov.id}-outline`,
          type: "line",
          source: ov.id,
          paint: {
            "line-color": ov.color,
            "line-width": 1.2,
            "line-opacity": 0.85 * (ov.opacity ?? 1),
          },
        });
      } else if (ov.plates) {
        m.addLayer({
          id: ov.id,
          type: "line",
          source: ov.id,
          paint: {
            "line-color": [
              "match",
              ["get", "kind"],
              "divergent",
              "#3EE0C6",
              "transform",
              "#E8B86D",
              "#FF6A3D",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 1, 2.2, 4, ov.width ?? 2.8, 8, 4.2],
            "line-opacity": ov.opacity ?? 1,
          },
        });
      } else if (ov.circle && ov.ranked) {
        m.addLayer({
          id: ov.id,
          type: "circle",
          source: ov.id,
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["case", ["==", ["get", "rank"], "capital"], 4.5, 0],
              3,
              ["case", ["==", ["get", "rank"], "capital"], 5.5, 3.5],
              6,
              7,
            ],
            "circle-color": ov.color,
            "circle-stroke-color": "#07090C",
            "circle-stroke-width": 1,
            "circle-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              1,
              ["case", ["==", ["get", "rank"], "capital"], 1, 0],
              2.4,
              1,
            ],
          },
        });
      } else if (ov.circle) {
        m.addLayer({
          id: ov.id,
          type: "circle",
          source: ov.id,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 7, 4, 11],
            "circle-color": ["coalesce", ["get", "color"], ov.color],
            "circle-stroke-color": "#07090C",
            "circle-stroke-width": 1.2,
          },
        });
      } else {
        m.addLayer({
          id: ov.id,
          type: "line",
          source: ov.id,
          paint: {
            "line-color": ov.color,
            "line-width": ["interpolate", ["linear"], ["zoom"], 1, 1.4, 4, ov.width ?? 2.2, 8, 3.6],
            "line-opacity": ov.opacity ?? 1,
          },
        });
      }
      if (ov.labels !== false && !ov.fill) {
        try {
          m.addLayer({
            id: `${ov.id}-label`,
            type: "symbol",
            source: ov.id,
            layout: {
              "text-field": ov.circle
                ? ["coalesce", ["get", "letter"], ["get", "name"]]
                : ["get", "name"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 1, 10, 6, 13],
              "text-font": ["Noto Sans Regular"],
              "text-offset": ov.circle ? [0, 1.05] : [0, 0],
              "text-anchor": ov.circle ? "top" : "center",
              "symbol-placement": ov.circle ? "point" : "line",
              "text-max-angle": 30,
              "text-optional": true,
            },
            paint: {
              "text-color": "#F4EFE6",
              "text-halo-color": "#07090C",
              "text-halo-width": 1.35,
            },
          });
        } catch {
          /* glyphs missing on this style */
        }
      }
    } catch {
      /* style not ready */
    }
  }
}

export function LibreMap({
  center,
  zoom = 3,
  styleUrl,
  relief = false,
  baseMap = "vector",
  overlays = [],
  marker,
  markerB,
  markerContent,
  markerBContent,
  onClick,
  onMarkerDrag,
  onFeature,
  onMove,
  onViewChange,
  inspectFeatures = true,
  className = "h-[28rem] w-full overflow-hidden rounded-2xl border border-white/10 bg-trench",
  label,
  graticule = false,
  draggableMarker = false,
  fitMarkers = false,
}: {
  center: [number, number];
  zoom?: number;
  styleUrl?: string;
  relief?: boolean;
  /** Classroom basemap. Vector first; relief / political / bathymetry on demand. */
  baseMap?: "vector" | "relief" | "political" | "bathymetry";
  overlays?: Overlay[];
  marker?: [number, number] | null;
  markerB?: [number, number] | null;
  /** Accessible readings anchored to the same coordinates as the draggable pin. */
  markerContent?: ReactNode;
  markerBContent?: ReactNode;
  onClick?: (c: MapClick) => void;
  onMarkerDrag?: (c: MapClick) => void;
  onFeature?: (f: MapFeatureHit) => void;
  onMove?: (c: MapClick) => void;
  onViewChange?: (view: { center: [number, number]; zoom: number }) => void;
  inspectFeatures?: boolean;
  className?: string;
  label?: string;
  graticule?: boolean;
  draggableMarker?: boolean;
  fitMarkers?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [portalA, setPortalA] = useState<HTMLElement | null>(null),
    [portalB, setPortalB] = useState<HTMLElement | null>(null);
  const customA = markerContent != null,
    customB = markerBContent != null;
  const markerModes = useRef({ a: customA, b: customB });
  const pinsRef = useRef({ marker, markerB, fitMarkers, custom: customA || customB });
  pinsRef.current = { marker, markerB, fitMarkers, custom: customA || customB };
  function framePins(m: MapHandle | null, duration = 0) {
    const { marker: a, markerB: b, fitMarkers: fit, custom } = pinsRef.current;
    if (!m || !fit || !a || !b) return;
    let lonB = b[0];
    if (lonB - a[0] > 180) lonB -= 360;
    if (lonB - a[0] < -180) lonB += 360;
    m.fitBounds?.(
      [
        [Math.min(a[0], lonB), Math.min(a[1], b[1])],
        [Math.max(a[0], lonB), Math.max(a[1], b[1])],
      ],
      {
        padding: custom ? { top: 80, bottom: 110, left: 70, right: 70 } : 60,
        maxZoom: 6,
        duration,
        essential: false,
      },
    );
  }
  const mapRef = useRef<MapHandle | null>(null);
  const markerRef = useRef<{
    setLngLat: (p: [number, number]) => unknown;
    remove: () => void;
    getLngLat?: () => { lat: number; lng: number };
  } | null>(null);
  const markerBRef = useRef<{
    setLngLat: (p: [number, number]) => unknown;
    remove: () => void;
  } | null>(null);
  const clickRef = useRef(onClick);
  clickRef.current = onClick;
  const markerDragRef = useRef(onMarkerDrag);
  markerDragRef.current = onMarkerDrag;
  const featRef = useRef(onFeature);
  featRef.current = onFeature;
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const viewRef = useRef(onViewChange);
  viewRef.current = onViewChange;
  const inspectRef = useRef(inspectFeatures);
  inspectRef.current = inspectFeatures;
  const overlaysRef = useRef(overlays);
  overlaysRef.current = overlays;
  const overlayIdsRef = useRef<string[]>([]);
  const graticuleRef = useRef(graticule);
  graticuleRef.current = graticule;
  const requestedBase: MapBasemap =
    baseMap === "political"
      ? "osm"
      : baseMap === "bathymetry"
        ? "bathymetry"
        : relief || baseMap === "relief"
          ? "relief"
          : "openfreemap";
  const requestedBaseRef = useRef(requestedBase);
  requestedBaseRef.current = requestedBase;
  const fallbackRef = useRef<ReturnType<typeof attachStyleFallback> | null>(null);
  const [basemap, setBasemap] = useState<MapBasemap | null>(null);
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<MapPhase>("loading");
  const [retry, setRetry] = useState(0);
  const [mapVersion, setMapVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let detach = () => undefined as void;
    const el = ref.current;
    if (!el) return;
    setFailed(false);
    setPhase("loading");
    setPortalA(null);
    setPortalB(null);

    void (async () => {
      try {
        const maplibregl = await import("maplibre-gl");
        await import("maplibre-gl/dist/maplibre-gl.css");
        if (cancelled || !el) return;
        try {
          maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        } catch {
          /* already set */
        }
        const style = styleUrl ?? basemapStyle(requestedBaseRef.current);
        const m = new maplibregl.Map({
          container: el,
          style,
          center,
          zoom,
          attributionControl: { compact: true },
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          doubleClickZoom: true,
          keyboard: true,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        // Keep north up for geographic bearings and weather wind staffs.
        m.touchZoomRotate.disableRotation();
        m.keyboard.disableRotation();
        m.addControl(
          new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }),
          "top-right",
        );
        m.addControl(
          new maplibregl.ScaleControl({ maxWidth: 140, unit: "metric" }),
          "bottom-right",
        );
        const fallback = attachStyleFallback(m as never, {
          start: requestedBaseRef.current,
          onBasemap: (b) => {
            if (cancelled) return;
            setBasemap(b);
          },
          onPhase: (p) => {
            if (!cancelled) setPhase(p);
          },
        });
        fallbackRef.current = fallback;
        detach = fallback;
        const syncOverlays = () => {
          const next = overlaysRef.current;
          applyOverlays(
            m as unknown as MapHandle,
            next,
            overlayIdsRef.current,
            graticuleRef.current,
          );
          overlayIdsRef.current = next
            .map((o) => o.id)
            .concat(graticuleRef.current ? ["graticule"] : []);
          next.forEach((o) => {
            if (o.labels !== false && !o.fill) overlayIdsRef.current.push(`${o.id}-label`);
          });
        };
        m.on("load", () => {
          m.resize();
          framePins(m as unknown as MapHandle);
          syncOverlays();
        });
        m.on("style.load", syncOverlays);
        m.on(
          "click",
          (e: { lngLat: { lat: number; lng: number }; point: { x: number; y: number } }) => {
            const layers = overlaysRef.current.map((o) => o.id).filter((id) => m.getLayer(id));
            const hits =
              inspectRef.current && layers.length && m.queryRenderedFeatures
                ? m.queryRenderedFeatures(e.point as never, { layers })
                : [];
            const hit = hits[0];
            const props = hit?.properties;
            if (props?.name || props?.title) {
              featRef.current?.({
                title: props.title || props.name,
                note: props.note || "",
                kind: props.kind || "",
                lat: e.lngLat.lat,
                lon: e.lngLat.lng,
              });
              try {
                new maplibregl.Popup({
                  closeButton: true,
                  maxWidth: "240px",
                  className: "tl-popup",
                })
                  .setLngLat(e.lngLat)
                  .setHTML(
                    `<p style="font:500 13px Geist,sans-serif;margin:0 0 4px;color:#F4EFE6">${props.title || props.name}</p>
                   <p style="font:400 12px Geist,sans-serif;margin:0;color:#C4D0CC">${props.note || props.kind || ""}</p>`,
                  )
                  .addTo(m);
              } catch {
                /* */
              }
            }
            if (!(featRef.current && (props?.name || props?.title)))
              clickRef.current?.({
                lat: e.lngLat.lat,
                lon: ((((e.lngLat.lng + 180) % 360) + 360) % 360) - 180,
              });
          },
        );
        m.on("mousemove", (e: { lngLat: { lat: number; lng: number } }) => {
          moveRef.current?.({ lat: e.lngLat.lat, lon: e.lngLat.lng });
        });
        m.on("moveend", () => {
          const c = m.getCenter();
          viewRef.current?.({
            center: [((((c.lng + 180) % 360) + 360) % 360) - 180, c.lat],
            zoom: m.getZoom(),
          });
        });
        if (clickRef.current) m.getCanvas().style.cursor = "crosshair";
        mapRef.current = m as unknown as MapHandle;
        setMapVersion((n) => n + 1);
        // MapLibre handles +/- on its focused canvas. A window listener would
        // zoom every locator on an Atlas comparison and double-handle the key.
        const ro = new ResizeObserver(() => {
          m.resize();
          // A portrait viewport or newly loaded CSS changes the fitted extent.
          // Keep both readings clear of the map controls after that resize.
          framePins(m as unknown as MapHandle);
        });
        ro.observe(el);
        const tResize = [50, 250, 800].map((ms) => window.setTimeout(() => m.resize(), ms));
        const prevDetach = detach;
        detach = () => {
          tResize.forEach((id) => window.clearTimeout(id));
          ro.disconnect();
          prevDetach();
        };
      } catch {
        if (!cancelled) {
          setFailed(true);
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      detach();
      fallbackRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      markerBRef.current?.remove();
      markerBRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      overlayIdsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleUrl, draggableMarker, retry]);

  useEffect(() => {
    fallbackRef.current?.select(requestedBase);
  }, [requestedBase]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m || !m.isStyleLoaded?.()) return;
    applyOverlays(m, overlays, overlayIdsRef.current, graticule);
    overlayIdsRef.current = overlays.map((o) => o.id).concat(graticule ? ["graticule"] : []);
    overlays.forEach((o) => {
      if (o.labels !== false && !o.fill) overlayIdsRef.current.push(`${o.id}-label`);
      if (o.polygon) overlayIdsRef.current.push(`${o.id}-outline`);
    });
  }, [overlays, graticule]);

  const [centerLng, centerLat] = center;
  useEffect(() => {
    mapRef.current?.flyTo({ center, zoom, essential: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- center is a fresh array from callers each render; keyed on its listed coordinates
  }, [centerLng, centerLat, zoom, mapVersion]);

  const markerLng = marker?.[0],
    markerLat = marker?.[1],
    markerBLng = markerB?.[0],
    markerBLat = markerB?.[1];
  useEffect(() => {
    framePins(mapRef.current, 500);
  }, [fitMarkers, markerLng, markerLat, markerBLng, markerBLat, mapVersion, customA, customB]);

  useEffect(() => {
    if (markerModes.current.a !== customA) {
      markerRef.current?.remove();
      markerRef.current = null;
      setPortalA(null);
      markerModes.current.a = customA;
    }
    if (!marker) {
      markerRef.current?.remove();
      markerRef.current = null;
      setPortalA(null);
      return;
    }
    if (markerRef.current) {
      markerRef.current.setLngLat(marker);
      return;
    }
    const m = mapRef.current;
    if (!m) return;
    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || mapRef.current !== m || markerRef.current) return;
      const element = customA ? document.createElement("div") : undefined;
      const mk = new maplibregl.Marker({
        color: "#3EE0C6",
        draggable: draggableMarker,
        ...(element ? { element, anchor: "center" as const } : {}),
      })
        .setLngLat(marker)
        .addTo(m as never);
      if (element) setPortalA(element);
      mk.getElement().setAttribute("aria-label", "Location A");
      if (draggableMarker)
        mk.on("dragend", () => {
          const ll = mk.getLngLat();
          (markerDragRef.current ?? clickRef.current)?.({
            lat: ll.lat,
            lon: ((((ll.lng + 180) % 360) + 360) % 360) - 180,
          });
        });
      markerRef.current = mk;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- marker is a fresh array from callers each render; keyed on its listed coordinates
  }, [markerLng, markerLat, mapVersion, draggableMarker, customA]);

  useEffect(() => {
    if (markerModes.current.b !== customB) {
      markerBRef.current?.remove();
      markerBRef.current = null;
      setPortalB(null);
      markerModes.current.b = customB;
    }
    if (!markerB) {
      markerBRef.current?.remove();
      markerBRef.current = null;
      setPortalB(null);
      return;
    }
    if (markerBRef.current) {
      markerBRef.current.setLngLat(markerB);
      return;
    }
    const m = mapRef.current;
    if (!m) return;
    let cancelled = false;
    void import("maplibre-gl").then((maplibregl) => {
      if (cancelled || mapRef.current !== m || markerBRef.current) return;
      const element = customB ? document.createElement("div") : undefined;
      const mkB = new maplibregl.Marker({
        color: "#FF6A3D",
        ...(element ? { element, anchor: "center" as const } : {}),
      })
        .setLngLat(markerB)
        .addTo(m as never);
      if (element) setPortalB(element);
      mkB.getElement().setAttribute("aria-label", "Location B");
      markerBRef.current = mkB;
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markerB is a fresh array from callers each render; keyed on its listed coordinates
  }, [markerBLng, markerBLat, mapVersion, customB]);

  const credit = basemap ? CREDIT[basemap] : null;

  return (
    <div className="relative" data-basemap={basemap ?? "loading"} data-map-phase={phase}>
      {portalA && marker && createPortal(markerContent, portalA)}
      {portalB && markerB && createPortal(markerBContent, portalB)}
      <div className={`relative min-h-[16rem] ${className}`}>
        {failed && <StaticCoast className="h-full w-full" hidden={false} />}
        <div
          ref={ref}
          onWheelCapture={pageScrollUnlessCtrl}
          data-wheel-zoom="ctrl"
          title={"Drag to pan · Ctrl + scroll to zoom · pinch on touch screens"}
          className="absolute inset-0 h-full w-full min-h-[16rem]"
          role="region"
          aria-label={label ?? "Interactive map"}
        />
      </div>
      {credit && <p className="mt-2 font-mono text-xs leading-5 text-mist">{credit}</p>}
      <div role="status" aria-live="polite" className="mt-2 text-sm leading-6 text-mist">
        {phase === "loading" && (
          <LoadingProgress
            label={"Loading the basemap"}
            detail="Preparing map style and visible tiles…"
          />
        )}
        {phase === "offline" &&
          "Online tiles are unavailable. Local coastlines remain interactive; street detail is unavailable."}
        {phase === "error" &&
          (failed
            ? "Interactive mapping is unavailable in this browser. The world overview is static."
            : "The basemap could not load. Try again when the connection is available.")}
        {(phase === "offline" || phase === "error") && (
          <button
            type="button"
            className="ml-2 min-h-11 px-3 text-glacier underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            {"Retry map"}
          </button>
        )}
      </div>
    </div>
  );
}
