/** Meeus / NOAA solar geometry; degrees east, UTC, Gregorian dates 1901–2099.
 * https://gml.noaa.gov/grad/solcalc/calcdetails.html
 * No weather/refraction forecast: the optional −0.833° horizon is conventional.
 */
const D = Math.PI / 180;
const wrap = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
export const SOLAR_MODEL = "Meeus / NOAA · geometric sphere";
export function daysInYear(year: number) {
  return (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / 86400000;
}
export function validSolarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) &&
    d.toISOString().slice(0, 10) === value &&
    d.getUTCFullYear() >= 1901 &&
    d.getUTCFullYear() <= 2099
    ? d
    : null;
}
export function solarEphemeris(date: Date, tilt = 23.44) {
  const t = (date.getTime() / 86400000 + 2440587.5 - 2451545) / 36525;
  const l = wrap(280.46646 + t * (36000.76983 + 0.0003032 * t)) * D;
  const m = (357.52911 + t * (35999.05029 - 0.0001537 * t)) * D;
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const c =
    (1.914602 - t * (0.004817 + 0.000014 * t)) * Math.sin(m) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * m) +
    0.000289 * Math.sin(3 * m);
  const omega = (125.04 - 1934.136 * t) * D;
  const lambda = l + (c - 0.00569 - 0.00478 * Math.sin(omega)) * D;
  // Keep the chosen teaching tilt explicit, including the exact 0° experiment.
  const obliquity = tilt * D;
  const declination = Math.asin(Math.sin(obliquity) * Math.sin(lambda));
  const y = Math.tan(obliquity / 2) ** 2;
  const equationOfTime =
    (4 / D) *
    (y * Math.sin(2 * l) -
      2 * e * Math.sin(m) +
      4 * e * y * Math.sin(m) * Math.cos(2 * l) -
      0.5 * y * y * Math.sin(4 * l) -
      1.25 * e * e * Math.sin(2 * m));
  return { declination, equationOfTime };
}
export function daylight(lat: number, declination: number, horizon = 0) {
  const a = Math.sin(lat * D) * Math.sin(declination);
  const b = Math.cos(lat * D) * Math.cos(declination);
  const threshold = Math.sin(horizon * D);
  if (Math.abs(b) < 1e-12)
    return {
      hours: a > threshold + 1e-12 ? 24 : 0,
      polar: (Math.abs(a - threshold) < 1e-12 ? "horizon" : a > threshold ? "day" : "night") as
        "horizon" | "day" | "night",
    };
  const cosH = (threshold - a) / b;
  if (cosH <= -1) return { hours: 24, polar: "day" as const };
  if (cosH >= 1) return { hours: 0, polar: "night" as const };
  return { hours: (24 * Math.acos(cosH)) / Math.PI, polar: "none" as const };
}
export function solarReading(
  date: Date,
  lat: number,
  lon: number,
  tilt = 23.44,
  refraction = false,
  equationOn = true,
) {
  const ephemeris = solarEphemeris(date, tilt);
  const length = daylight(lat, ephemeris.declination, refraction ? -0.833 : 0);
  const noonUTC = 12 - lon / 15 - (equationOn ? ephemeris.equationOfTime / 60 : 0);
  return {
    ...ephemeris,
    ...length,
    noonUTC,
    noonAltitude: 90 - Math.abs(lat - ephemeris.declination / D),
    sunriseUTC: length.polar === "none" ? noonUTC - length.hours / 2 : null,
    sunsetUTC: length.polar === "none" ? noonUTC + length.hours / 2 : null,
  };
}
export function subsolarLongitude(utcHours: number, equationMinutes: number) {
  return wrap(180 - utcHours * 15 - equationMinutes / 4);
}
export function solarAltitude(lat: number, lon: number, declination: number, subsolarLon: number) {
  return (
    Math.asin(
      Math.max(
        -1,
        Math.min(
          1,
          Math.sin(lat * D) * Math.sin(declination) +
            Math.cos(lat * D) * Math.cos(declination) * Math.cos((lon - subsolarLon) * D),
        ),
      ),
    ) / D
  );
}
/** Point where the Sun is overhead at a given moment (degrees). */
export function subsolarPoint(date: Date) {
  const { declination, equationOfTime } = solarEphemeris(date);
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let lon = -15 * (utcHours - 12 + equationOfTime / 60);
  lon = ((lon + 540) % 360) - 180;
  return { lat: declination / D, lon };
}
/** The night half of the Earth as a GeoJSON polygon, for a web map (latitudes kept within ±85°). */
export function nightPolygon(date: Date) {
  const sun = subsolarPoint(date),
    dec = Math.max(1e-4, Math.abs(sun.lat)) * Math.sign(sun.lat || 1) * D,
    pole = sun.lat >= 0 ? -85 : 85,
    edge: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    // The terminator is where the Sun's altitude is zero: tan(lat) = -cos(hour angle) / tan(dec).
    const lat = Math.atan(-Math.cos((lon - sun.lon) * D) / Math.tan(dec)) / D;
    edge.push([lon, Math.max(-85, Math.min(85, lat))]);
  }
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: { type: "Polygon", coordinates: [[...edge, [180, pole], [-180, pole], edge[0]]] },
      },
    ],
  };
}
