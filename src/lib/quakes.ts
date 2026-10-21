/** Live earthquake data from the USGS Earthquake Hazards Program (public domain, no key). */

export type FeedId = "4.5_day" | "4.5_week" | "4.5_month" | "significant_month";
export const FEEDS: { id: FeedId; label: string }[] = [
  { id: "4.5_day", label: "M4.5+ · past day" },
  { id: "4.5_week", label: "M4.5+ · past 7 days" },
  { id: "4.5_month", label: "M4.5+ · past 30 days" },
  { id: "significant_month", label: "Significant · past 30 days" },
];
export const feedUrl = (id: FeedId) =>
  `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${id}.geojson`;

export type Quake = {
  id: string;
  mag: number;
  place: string;
  time: number;
  lat: number;
  lon: number;
  depthKm: number;
  url?: string;
  tsunami: boolean;
};

export class QuakeError extends Error {}

type Feature = {
  id?: string;
  properties?: {
    mag?: number | null;
    place?: string | null;
    time?: number;
    url?: string;
    tsunami?: number;
  };
  geometry?: { type?: string; coordinates?: number[] };
};

/** Keep only well-formed events; the feed occasionally includes events without a magnitude. */
export function parseFeed(json: unknown): Quake[] {
  const features = (json as { features?: Feature[] })?.features;
  if (!Array.isArray(features))
    throw new QuakeError("The earthquake feed returned unexpected data.");
  const out: Quake[] = [];
  for (const f of features) {
    const [lon, lat, depth] = f.geometry?.coordinates ?? [];
    const mag = f.properties?.mag;
    if (![lon, lat, depth, mag].every((v) => typeof v === "number" && Number.isFinite(v))) continue;
    out.push({
      id: String(f.id ?? `${lat},${lon},${f.properties?.time}`),
      mag: mag as number,
      place: f.properties?.place ?? "Unnamed location",
      time: f.properties?.time ?? 0,
      lat: lat as number,
      lon: lon as number,
      depthKm: Math.max(0, depth as number),
      url: f.properties?.url,
      tsunami: f.properties?.tsunami === 1,
    });
  }
  return dedupe(out.sort((a, b) => b.mag - a.mag));
}

/**
 * Feeds sometimes list one event twice, reported by two networks under different ids.
 * Treat events within 60 s, 100 km and 0.3 magnitude units of a kept event as the same one.
 */
function dedupe(sorted: Quake[]): Quake[] {
  const kept: Quake[] = [];
  for (const q of sorted) {
    const same = kept.some(
      (k) =>
        Math.abs(k.time - q.time) <= 60_000 &&
        Math.abs(k.mag - q.mag) <= 0.3 &&
        surfaceKm(k.lat, k.lon, q.lat, q.lon) <= 100,
    );
    if (!same) kept.push(q);
  }
  return kept;
}

function surfaceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const a = unit(lat1, lon1),
    b = unit(lat2, lon2);
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * EARTH_RADIUS_KM;
}

export async function fetchQuakes(id: FeedId, signal?: AbortSignal): Promise<Quake[]> {
  let response: Response;
  try {
    response = await fetch(feedUrl(id), { signal });
  } catch {
    throw new QuakeError(
      "The USGS earthquake feed could not be reached. Check the connection and try again.",
    );
  }
  if (!response.ok)
    throw new QuakeError(`The USGS earthquake feed is unavailable (${response.status}).`);
  return parseFeed(await response.json());
}

/** Conventional focus-depth classes used in seismology teaching. */
export function depthClass(depthKm: number): "shallow" | "intermediate" | "deep" {
  return depthKm < 70 ? "shallow" : depthKm < 300 ? "intermediate" : "deep";
}
export const DEPTH_COLOUR = {
  shallow: "#f3866b",
  intermediate: "#f2c45a",
  deep: "#6fb3f2",
} as const;

/** Marker radius on a unit globe. Each whole magnitude releases ~32× more energy; markers grow gently. */
export function markerRadius(mag: number): number {
  return 0.006 + 0.0045 * Math.max(0, mag - 4.5) ** 1.35;
}

const EARTH_RADIUS_KM = 6371;
type Vec = [number, number, number];
export function unit(lat: number, lon: number): Vec {
  const p = (lat * Math.PI) / 180,
    l = (lon * Math.PI) / 180;
  return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
}

/** Boundary segments as pairs of unit vectors, from a GeoJSON collection of LineStrings. */
export function boundarySegments(geo: {
  features: { geometry: { type: string; coordinates: unknown } }[];
}): [Vec, Vec][] {
  const segs: [Vec, Vec][] = [];
  for (const f of geo.features) {
    const lines =
      f.geometry.type === "LineString"
        ? [f.geometry.coordinates as number[][]]
        : f.geometry.type === "MultiLineString"
          ? (f.geometry.coordinates as number[][][])
          : [];
    for (const line of lines)
      for (let i = 1; i < line.length; i++)
        segs.push([unit(line[i - 1][1], line[i - 1][0]), unit(line[i][1], line[i][0])]);
  }
  return segs;
}

/** Shortest surface distance (km) from a point to a set of short boundary segments. */
export function distanceToBoundaryKm(lat: number, lon: number, segs: [Vec, Vec][]): number {
  const p = unit(lat, lon);
  let best = Infinity;
  for (const [a, b] of segs) {
    const ab: Vec = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ap: Vec = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
    const len = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
    const t =
      len > 0 ? Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len)) : 0;
    const c: Vec = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
    const chord = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
    if (chord < best) best = chord;
  }
  // Chord length on the unit sphere → arc length on Earth.
  return 2 * Math.asin(Math.min(1, best / 2)) * EARTH_RADIUS_KM;
}
