export type GeoPlace = { name: string; lat: number; lon: number };

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;
function degToRad(d: number): number {
  return d * DEG;
}
function radToDeg(r: number): number {
  return r * RAD;
}
function clamp(x: number, a: number, b: number): number {
  return Math.min(b, Math.max(a, x));
}

export const CITIES = {
  london: { name: "London", lat: 51.51, lon: -0.13 },
  newYork: { name: "New York", lat: 40.71, lon: -74.01 },
  nairobi: { name: "Nairobi", lat: -1.29, lon: 36.82 },
  sydney: { name: "Sydney", lat: -33.87, lon: 151.21 },
  reykjavik: { name: "Reykjavík", lat: 64.15, lon: -21.94 },
  ushuaia: { name: "Ushuaia", lat: -54.8, lon: -68.3 },
  singapore: { name: "Singapore", lat: 1.35, lon: 103.82 },
  shanghai: { name: "Shanghai", lat: 31.23, lon: 121.47 },
  hongKong: { name: "Hong Kong", lat: 22.3, lon: 114.17 },
  taipei: { name: "Taipei", lat: 25.03, lon: 121.57 },
  macau: { name: "Macau", lat: 22.2, lon: 113.54 },
  cairo: { name: "Cairo", lat: 30.04, lon: 31.24 },
  miami: { name: "Miami", lat: 25.76, lon: -80.19 },
  tokyo: { name: "Tokyo", lat: 35.68, lon: 139.65 },
  sanFrancisco: { name: "San Francisco", lat: 37.77, lon: -122.42 },
} as const satisfies Record<string, GeoPlace>;

/** Sphere mapping used by the Blue Marble globe (lon +180, Y-up). */
export function latLonToXYZ(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = degToRad(90 - lat);
  const th = degToRad(lon + 180);
  return [r * Math.sin(phi) * Math.sin(th), r * Math.cos(phi), r * Math.sin(phi) * Math.cos(th)];
}

export function xyzToLatLon(x: number, y: number, z: number): { lat: number; lon: number } {
  const len = Math.hypot(x, y, z) || 1;
  const ny = y / len;
  const lat = 90 - radToDeg(Math.acos(clamp(ny, -1, 1)));
  let lon = radToDeg(Math.atan2(x / len, z / len)) - 180;
  if (lon <= -180) lon += 360;
  if (lon > 180) lon -= 360;
  return { lat, lon };
}

/** R3F-friendly position with .toArray() for older call sites. Does not import three. */
export function latLonToVector3(lat: number, lon: number, r = 1) {
  const [x, y, z] = latLonToXYZ(lat, lon, r);
  return { x, y, z, toArray: () => [x, y, z] as [number, number, number] };
}

export function vector3ToLatLon(v: { x: number; y: number; z: number }): { lat: number; lon: number } {
  return xyzToLatLon(v.x, v.y, v.z);
}

export function fmtLatLon(lat: number, lon: number, digits = 2): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(digits)}°${ns}  ${Math.abs(lon).toFixed(digits)}°${ew}`;
}

export function dayOfYearUTC(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

/** Approximate solar declination in radians. Day 81 ≈ 22 March. */
export function solarDeclination(dayOfYear: number, tiltDeg = 23.44): number {
  const tilt = degToRad(tiltDeg);
  return tilt * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
}

/** Noon solar altitude in degrees. */
export function solarNoonAltitude(latDeg: number, declRad: number): number {
  const lat = degToRad(latDeg);
  return 90 - Math.abs(radToDeg(lat - declRad));
}

export function dayLengthHours(latDeg: number, declRad: number): number {
  const lat = degToRad(latDeg);
  const arg = -Math.tan(lat) * Math.tan(declRad);
  if (arg <= -1) return 24;
  if (arg >= 1) return 0;
  return (2 * Math.acos(clamp(arg, -1, 1)) * 12) / Math.PI;
}

export function formatDay(dayOfYear: number): string {
  const d = new Date(Date.UTC(2026, 0, 1));
  d.setUTCDate(Math.max(1, Math.min(365, Math.floor(dayOfYear))));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function fmtClock(hours: number): string {
  if (!Number.isFinite(hours)) return "—";
  const h = ((hours % 24) + 24) % 24;
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  if (mm === 60) return `${String((hh + 1) % 24).padStart(2, "0")}:00`;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function sunriseSunsetHours(
  latDeg: number,
  dayOfYear: number,
  lonDeg: number,
  tiltDeg = 23.44,
): { sunrise: number; sunset: number; polar: "none" | "day" | "night" } {
  const decl = solarDeclination(dayOfYear, tiltDeg);
  const lat = degToRad(latDeg);
  const arg = -Math.tan(lat) * Math.tan(decl);
  const offset = lonDeg / 15;
  if (arg <= -1) return { sunrise: 0, sunset: 24, polar: "day" };
  if (arg >= 1) return { sunrise: 0, sunset: 0, polar: "night" };
  const ha = Math.acos(clamp(arg, -1, 1));
  const half = (ha * 12) / Math.PI;
  return {
    sunrise: 12 - half - offset,
    sunset: 12 + half - offset,
    polar: "none",
  };
}

export function seasonName(latDeg: number, dayOfYear: number, tiltDeg = 23.44): string {
  if (Math.abs(latDeg) < 12) return "Tropics — small seasonal swing";
  const decl = solarDeclination(dayOfYear, tiltDeg);
  const toward = latDeg >= 0 ? decl > 0.05 : decl < -0.05;
  const away = latDeg >= 0 ? decl < -0.05 : decl > 0.05;
  if (toward) return latDeg >= 0 ? "Northern summer" : "Southern summer";
  if (away) return latDeg >= 0 ? "Northern winter" : "Southern winter";
  return "Near equinox";
}

/** Spencer approximation, minutes. Clocks can differ by about 16 minutes. */
export function equationOfTimeMinutes(doy: number): number {
  const B = (2 * Math.PI * (doy - 81)) / 364;
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
