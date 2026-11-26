/**
 * Live weather for the Live weather tool: forecast-model values in SI units with UTC timestamps,
 * never invented replacements. Places in the United States use the National Weather Service's
 * forecast grid (api.weather.gov, public domain); everywhere else, and any US place the NWS
 * cannot serve at the moment, uses Open-Meteo's free API, which allows non-commercial use.
 */
export type WeatherSource = "nws" | "open-meteo";
export type WeatherPoint = { lat: number; lon: number; name: string };
export type WeatherHour = {
  time: string;
  temperature: number | null;
  /** Rain or melted snow in the hour before `time`, in millimeters. */
  precipitation: number | null;
  wind: number | null;
  windDir: number | null;
  cloud: number | null;
};
export type WeatherReading = {
  time: string;
  /** Seconds that `precip` covers. */
  interval: number;
  temperature: number | null;
  apparent: number | null;
  wind: number | null;
  windDir: number | null;
  gust: number | null;
  pressure: number | null;
  precip: number | null;
  cloud: number | null;
  humidity: number | null;
  visibility: number | null;
  code: number | null;
  /** The conditions in words, such as "Partly cloudy" or "Chance of light rain showers". */
  summary: string;
};
export type WeatherResult = {
  source: WeatherSource;
  current: WeatherReading;
  hours: WeatherHour[];
  fetchedAt: number;
  grid: { lat: number; lon: number; elevation: number | null };
  url: string;
};
export class WeatherError extends Error {
  retryAt: number;
  constructor(message: string, retryAt = 0) {
    super(message);
    this.name = "WeatherError";
    this.retryAt = retryAt;
  }
}

/** Who supplies each forecast, for credits on the page. */
export const WEATHER_SOURCE: Record<WeatherSource, { name: string; href: string }> = {
  nws: { name: "National Weather Service", href: "https://www.weather.gov/" },
  "open-meteo": { name: "Open-Meteo", href: "https://open-meteo.com/" },
};

const HOUR = 3_600_000;
const numeric = (n: unknown): number | null =>
  typeof n === "number" && Number.isFinite(n) ? n : null;
const timestamp = (s: unknown) =>
  typeof s === "string" &&
  /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s) &&
  Number.isFinite(Date.parse(s + "Z"));
/** The UTC hour label both sources use, such as "2026-11-26T08:00". */
const hourLabel = (ms: number) => new Date(ms).toISOString().slice(0, 16);

function checkPoint(point: Pick<WeatherPoint, "lat" | "lon">) {
  if (
    !Number.isFinite(point.lat) ||
    !Number.isFinite(point.lon) ||
    Math.abs(point.lat) > 90 ||
    Math.abs(point.lon) > 180
  )
    throw new WeatherError("Choose a valid latitude and longitude.");
}

// ---------------------------------------------------------------------------------------------
// Open-Meteo

export function weatherUrl(point: Pick<WeatherPoint, "lat" | "lon">): string {
  checkPoint(point);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: point.lat.toFixed(3),
    longitude: point.lon.toFixed(3),
    current:
      "temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,relative_humidity_2m,weather_code,visibility",
    hourly: "temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover",
    forecast_hours: "72",
    temperature_unit: "celsius",
    wind_speed_unit: "ms",
    precipitation_unit: "mm",
    timezone: "GMT",
  }).toString();
  return url.toString();
}

/** An Open-Meteo forecast response. */
export function parseWeather(payload: unknown, url: string, fetchedAt = Date.now()): WeatherResult {
  const json = payload as Record<string, any> | null;
  const c = json?.current,
    h = json?.hourly;
  if (!c || !timestamp(c.time) || !h || !Array.isArray(h.time) || h.time.length === 0)
    throw new WeatherError("The weather response was incomplete. Please try again.");
  if (
    json?.current_units?.temperature_2m !== "°C" ||
    json?.current_units?.wind_speed_10m !== "m/s" ||
    json?.hourly_units?.precipitation !== "mm"
  )
    throw new WeatherError("The weather response used unexpected units.");
  const hours: WeatherHour[] = h.time.slice(0, 72).map((time: unknown, i: number) => {
    if (!timestamp(time)) throw new WeatherError("The forecast contained an invalid timestamp.");
    return {
      time: time as string,
      temperature: numeric(h.temperature_2m?.[i]),
      precipitation: numeric(h.precipitation?.[i]),
      wind: numeric(h.wind_speed_10m?.[i]),
      windDir: numeric(h.wind_direction_10m?.[i]),
      cloud: numeric(h.cloud_cover?.[i]),
    };
  });
  const gridLat = numeric(json?.latitude),
    gridLon = numeric(json?.longitude);
  if (gridLat === null || gridLon === null)
    throw new WeatherError("The model grid location was missing.");
  const code = numeric(c.weather_code);
  return {
    source: "open-meteo",
    current: {
      time: c.time,
      interval: numeric(c.interval) ?? 900,
      temperature: numeric(c.temperature_2m),
      apparent: numeric(c.apparent_temperature),
      wind: numeric(c.wind_speed_10m),
      windDir: numeric(c.wind_direction_10m),
      gust: numeric(c.wind_gusts_10m),
      pressure: numeric(c.pressure_msl),
      precip: numeric(c.precipitation),
      cloud: numeric(c.cloud_cover),
      humidity: numeric(c.relative_humidity_2m),
      visibility: numeric(c.visibility),
      code,
      summary: weatherDescription(code),
    },
    hours,
    fetchedAt,
    grid: { lat: gridLat, lon: gridLon, elevation: numeric(json?.elevation) },
    url,
  };
}

// ---------------------------------------------------------------------------------------------
// National Weather Service

/**
 * Rough boxes around the areas the NWS forecasts: the lower 48 states, Alaska, Hawaii, Puerto
 * Rico with the US Virgin Islands, and Guam with the Northern Mariana Islands. A place inside a
 * box that the NWS does not cover, such as Toronto or Monterrey, gets a 404 and uses Open-Meteo.
 */
const NWS_AREAS: [south: number, north: number, west: number, east: number][] = [
  [24, 50, -125, -66.5],
  [51, 72, -180, -129],
  [18.5, 22.5, -161, -154],
  [17.5, 18.7, -68, -64.4],
  [13, 21, 144, 146.5],
];
export const inNwsArea = (point: Pick<WeatherPoint, "lat" | "lon">) =>
  NWS_AREAS.some(
    ([s, n, w, e]) => point.lat >= s && point.lat <= n && point.lon >= w && point.lon <= e,
  );

/** The NWS "points" request, which finds a place's forecast grid. It takes four decimals. */
export function nwsPointsUrl(point: Pick<WeatherPoint, "lat" | "lon">): string {
  checkPoint(point);
  return `https://api.weather.gov/points/${point.lat.toFixed(4)},${point.lon.toFixed(4)}`;
}

/** The forecast-grid address in a points response. */
export function nwsGridUrl(payload: unknown): string {
  const url = (payload as { properties?: { forecastGridData?: unknown } } | null)?.properties
    ?.forecastGridData;
  if (typeof url !== "string" || !url.startsWith("https://api.weather.gov/gridpoints/"))
    throw new WeatherError("The National Weather Service has no forecast grid for this place.");
  return url;
}

/** Hours in an ISO 8601 duration such as "PT6H" or "P1DT12H". */
function durationHours(duration: string): number | null {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(duration);
  if (!m) return null;
  const hours = Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0) + Number(m[3] ?? 0) / 60;
  return hours > 0 ? hours : null;
}

type Layer = { uom?: string; values?: { validTime?: unknown; value?: unknown }[] };

/** Each entry of an NWS grid layer, by every UTC hour it is valid for. */
function byHour<T>(layer: Layer | undefined, read: (value: unknown, hours: number) => T | null) {
  const out = new Map<number, T>();
  for (const { validTime, value } of layer?.values ?? []) {
    const [start, duration] = typeof validTime === "string" ? validTime.split("/") : [];
    const from = Date.parse(start ?? ""),
      span = durationHours(duration ?? "");
    if (!Number.isFinite(from) || span === null) continue;
    const hours = Math.max(1, Math.round(span)),
      first = Math.floor(from / HOUR) * HOUR,
      v = read(value, hours);
    if (v === null) continue;
    for (let i = 0; i < hours; i++) out.set(first + i * HOUR, v);
  }
  return out;
}

/**
 * One numeric layer as a value for each hour, in the units given by `scale`. A total over
 * several hours (precipitation) is shared evenly among them when `total` is set.
 */
function numericLayer(layer: Layer | undefined, uom: string, scale = 1, total = false) {
  if (layer?.values?.length && layer.uom !== uom)
    throw new WeatherError("The weather response used unexpected units.");
  return byHour(layer, (value, hours) => {
    const v = numeric(value);
    return v === null ? null : (total ? v / hours : v) * scale;
  });
}

const SKY = (cover: number | null) =>
  cover === null
    ? "Sky cover unavailable"
    : cover < 12.5
      ? "Clear sky"
      : cover < 37.5
        ? "Mostly clear"
        : cover < 62.5
          ? "Partly cloudy"
          : cover < 87.5
            ? "Mostly cloudy"
            : "Overcast";

type Condition = { coverage?: unknown; weather?: unknown; intensity?: unknown };

/** The NWS grid's weather words, such as "Chance of light rain showers", or else the sky cover. */
export function nwsSummary(conditions: unknown, cover: number | null): string {
  const phrases = (Array.isArray(conditions) ? (conditions as Condition[]) : []).flatMap((c) => {
    if (typeof c?.weather !== "string") return [];
    const kind = c.weather === "fog_mist" ? "fog" : c.weather.replaceAll("_", " ");
    const strength =
      typeof c.intensity === "string" && c.intensity !== "moderate"
        ? c.intensity.replaceAll("_", " ") + " "
        : "";
    const what = strength + kind;
    if (c.coverage === "chance") return [`chance of ${what}`];
    if (c.coverage === "slight_chance") return [`slight chance of ${what}`];
    if (c.coverage === "likely") return [`${what} likely`];
    if (typeof c.coverage === "string" && c.coverage !== "definite")
      return [`${c.coverage.replaceAll("_", " ")} ${what}`];
    return [what];
  });
  if (phrases.length === 0) return SKY(cover);
  const text = [...new Set(phrases)].slice(0, 2).join(" and ");
  return text[0].toUpperCase() + text.slice(1);
}

/**
 * An NWS forecast-grid response, as 72 hourly values from the current UTC hour. The grid gives
 * wind in km/h (converted to m/s), precipitation as totals over several hours (shared evenly
 * among them) and no air pressure.
 */
export function parseNwsGrid(
  payload: unknown,
  url: string,
  fetchedAt = Date.now(),
  now = fetchedAt,
): WeatherResult {
  const json = payload as Record<string, any> | null;
  const p = json?.properties;
  if (!p || typeof p !== "object")
    throw new WeatherError("The weather response was incomplete. Please try again.");
  const temperature = numericLayer(p.temperature, "wmoUnit:degC"),
    apparent = numericLayer(p.apparentTemperature, "wmoUnit:degC"),
    humidity = numericLayer(p.relativeHumidity, "wmoUnit:percent"),
    wind = numericLayer(p.windSpeed, "wmoUnit:km_h-1", 1 / 3.6),
    windDir = numericLayer(p.windDirection, "wmoUnit:degree_(angle)"),
    gust = numericLayer(p.windGust, "wmoUnit:km_h-1", 1 / 3.6),
    cloud = numericLayer(p.skyCover, "wmoUnit:percent"),
    precip = numericLayer(p.quantitativePrecipitation, "wmoUnit:mm", 1, true),
    visibility = numericLayer(p.visibility, "wmoUnit:m"),
    weather = byHour(p.weather, (value) => (Array.isArray(value) ? value : null));
  const start = Math.floor(now / HOUR) * HOUR;
  if (!temperature.has(start))
    throw new WeatherError("The National Weather Service forecast does not cover this hour.");
  const at = (layer: Map<number, number>, t: number) => layer.get(t) ?? null;
  const hours: WeatherHour[] = Array.from({ length: 72 }, (_, i) => {
    const t = start + i * HOUR;
    return {
      time: hourLabel(t),
      temperature: at(temperature, t),
      precipitation: at(precip, t - HOUR),
      wind: at(wind, t),
      windDir: at(windDir, t),
      cloud: at(cloud, t),
    };
  });
  // The grid cell is a small polygon; its center stands for the forecast location.
  const ring: unknown[] =
    json?.geometry?.type === "Polygon" && Array.isArray(json.geometry.coordinates?.[0])
      ? json.geometry.coordinates[0].slice(0, -1)
      : [];
  const corners = ring.filter(
    (c): c is [number, number] =>
      Array.isArray(c) && numeric(c[0]) !== null && numeric(c[1]) !== null,
  );
  if (corners.length < 3) throw new WeatherError("The model grid location was missing.");
  const mean = (i: 0 | 1) => corners.reduce((sum, c) => sum + c[i], 0) / corners.length;
  return {
    source: "nws",
    current: {
      time: hourLabel(start),
      interval: 3600,
      temperature: at(temperature, start),
      apparent: at(apparent, start),
      wind: at(wind, start),
      windDir: at(windDir, start),
      gust: at(gust, start),
      pressure: null,
      precip: at(precip, start - HOUR),
      cloud: at(cloud, start),
      humidity: at(humidity, start),
      visibility: at(visibility, start),
      code: null,
      summary: nwsSummary(weather.get(start), at(cloud, start)),
    },
    hours,
    fetchedAt,
    grid: {
      lat: mean(1),
      lon: mean(0),
      elevation: p.elevation?.unitCode === "wmoUnit:m" ? numeric(p.elevation.value) : null,
    },
    url,
  };
}

// ---------------------------------------------------------------------------------------------
// Client

/**
 * Fetches a place's forecast: the NWS for US places, Open-Meteo for the rest and as the fallback
 * when the NWS cannot answer. A small per-tab cache stops repeat classroom clicks from sending the
 * same request again, and a 429 pauses that service until it allows requests again.
 */
export function createWeatherClient(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string, WeatherResult>();
  const retryAt: Record<WeatherSource, number> = { nws: 0, "open-meteo": 0 };
  const canceled = () => new DOMException("Canceled", "AbortError");

  async function getJson(source: WeatherSource, url: string, signal?: AbortSignal, wait = 12_000) {
    if (now() < retryAt[source])
      throw new WeatherError(
        "The weather service is rate-limited. Please wait before retrying.",
        retryAt[source],
      );
    const timeout = AbortSignal.timeout(wait);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetcher(url, { signal: combined });
    } catch {
      if (signal?.aborted) throw canceled();
      throw new WeatherError(
        timeout.aborted
          ? "The weather request timed out. Please try again."
          : "The weather service could not be reached. Check the connection and try again.",
      );
    }
    if (response.status === 429) {
      const header = response.headers.get("Retry-After");
      const seconds = header && /^\d+$/.test(header) ? Number(header) : 0;
      retryAt[source] = Math.max(
        now() + 60_000,
        seconds ? now() + seconds * 1000 : header ? Date.parse(header) || 0 : 0,
      );
      throw new WeatherError(
        "The weather service is rate-limited. Please wait before retrying.",
        retryAt[source],
      );
    }
    if (!response.ok)
      throw new WeatherError(
        `The weather service could not complete this request (${response.status}). The map is still available.`,
      );
    try {
      return (await response.json()) as unknown;
    } catch {
      if (signal?.aborted) throw canceled();
      throw new WeatherError("The weather response was incomplete. Please try again.");
    }
  }

  return async (
    point: Pick<WeatherPoint, "lat" | "lon">,
    signal?: AbortSignal,
  ): Promise<WeatherResult> => {
    checkPoint(point);
    const key = `${point.lat.toFixed(3)},${point.lon.toFixed(3)}`;
    const cached = cache.get(key);
    if (signal?.aborted) throw canceled();
    if (cached && now() - cached.fetchedAt < 600_000) return cached;
    let result: WeatherResult | null = null;
    if (inNwsArea(point) && now() >= retryAt.nws) {
      try {
        const gridUrl = nwsGridUrl(await getJson("nws", nwsPointsUrl(point), signal, 8_000));
        result = parseNwsGrid(await getJson("nws", gridUrl, signal, 8_000), gridUrl, now(), now());
      } catch {
        if (signal?.aborted) throw canceled();
        // Outside the NWS's area, or the NWS did not answer: Open-Meteo forecasts the place.
      }
    }
    if (!result) {
      const url = weatherUrl(point);
      result = parseWeather(await getJson("open-meteo", url, signal), url, now());
    }
    cache.set(key, result);
    if (cache.size > 24) cache.delete(cache.keys().next().value!);
    return result;
  };
}
export const fetchWeather = createWeatherClient();

export const weatherNumber = (value: number | null | undefined, unit: string, digits = 1) =>
  value == null ? "—" : `${value.toFixed(digits)} ${unit}`;
export function compass(deg: number) {
  return [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ][Math.round((((deg % 360) + 360) % 360) / 22.5) % 16];
}
const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};
/** Words for an Open-Meteo (WMO) weather code. */
export const weatherDescription = (code: number | null) =>
  code === null ? "Weather code unavailable" : (WMO[code] ?? `Weather code ${code}`);

const CSV_SOURCE: Record<WeatherSource, string> = {
  nws: "# National Weather Service forecast grid (api.weather.gov); educational; not a warning service",
  "open-meteo": "# Open-Meteo model output; educational; not a warning service",
};
export function weatherCsv(result: WeatherResult, point: WeatherPoint): string {
  return [
    CSV_SOURCE[result.source],
    `# Requested latitude ${point.lat}; longitude ${point.lon}; fetched ${new Date(result.fetchedAt).toISOString()}`,
    `# Model grid ${result.grid.lat},${result.grid.lon}; source ${result.url}`,
    "time_utc,temperature_C,precipitation_mm_preceding_hour,wind_10m_m_s,wind_from_degrees,cloud_percent",
    ...result.hours.map((h) =>
      [h.time + "Z", h.temperature, h.precipitation, h.wind, h.windDir, h.cloud]
        .map((n) => n ?? "")
        .join(","),
    ),
  ].join("\r\n");
}
