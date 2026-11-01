import { useMemo } from "react";
import { LibreMap, type Overlay } from "./libre-map";

/** A small ring marker: unlike a pin, it leaves the basemap's own place label readable. */
export function MapDot({ tone = "a" }: { tone?: "a" | "b" }) {
  return <span aria-hidden="true" className={`map-dot ${tone === "b" ? "map-dot--b" : ""}`} />;
}

export function MiniMap({
  lat,
  lon,
  zoom = 7,
  label,
  className,
  second,
  area,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  label?: string;
  className?: string;
  /** A second place for two-place case studies; the map frames both markers. */
  second?: { lat: number; lon: number; name: string };
  /** A named region outlined on the map, as [west, south, east, north] in degrees. */
  area?: { name: string; bounds: [number, number, number, number] };
}) {
  const overlays = useMemo<Overlay[]>(() => {
    if (!area) return [];
    const [w, s, e, n] = area.bounds;
    return [
      {
        id: "case-area",
        color: "#E8613A",
        width: 2.4,
        labels: false,
        data: {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { name: area.name },
              geometry: {
                type: "LineString",
                coordinates: [
                  [w, s],
                  [e, s],
                  [e, n],
                  [w, n],
                  [w, s],
                ],
              },
            },
          ],
        },
      },
    ];
  }, [area]);
  return (
    <LibreMap
      center={[lon, lat]}
      zoom={zoom}
      marker={[lon, lat]}
      markerContent={<MapDot />}
      markerB={second ? [second.lon, second.lat] : null}
      markerBContent={second ? <MapDot tone="b" /> : undefined}
      fitMarkers={Boolean(second)}
      overlays={overlays}
      label={
        label ? `Locator map for ${label}${second ? ` and ${second.name}` : ""}` : "Locator map"
      }
      className={
        className ??
        "h-[min(52vh,28rem)] w-full min-h-[20rem] overflow-hidden rounded-2xl border border-white/10 bg-trench"
      }
    />
  );
}
