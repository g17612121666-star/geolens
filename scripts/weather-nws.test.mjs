import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createWeatherClient,
  inNwsArea,
  nwsPointsUrl,
  nwsSummary,
  parseNwsGrid,
  weatherCsv,
} from "../src/lib/weather.ts";

const NOW = Date.UTC(2026, 10, 26, 8, 36); // 08:36 UTC
const DC = { lat: 38.8894, lon: -77.0352, name: "Washington, DC" };
const GRID_URL = "https://api.weather.gov/gridpoints/LWX/97,71";

/** A trimmed NWS forecast-grid response in the shape api.weather.gov returns. */
function grid() {
  const hourly = (value) =>
    Array.from({ length: 96 }, (_, i) => ({
      validTime: `${new Date(Date.UTC(2026, 10, 26, i)).toISOString().slice(0, 19)}+00:00/PT1H`,
      value: value(i),
    }));
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-77.02, 38.87],
          [-77.0, 38.87],
          [-77.0, 38.89],
          [-77.02, 38.89],
          [-77.02, 38.87],
        ],
      ],
    },
    properties: {
      elevation: { unitCode: "wmoUnit:m", value: 6.1 },
      temperature: { uom: "wmoUnit:degC", values: hourly((i) => 5 + i / 10) },
      apparentTemperature: {
        uom: "wmoUnit:degC",
        values: [{ validTime: "2026-11-26T06:00:00+00:00/PT6H", value: 2 }],
      },
      relativeHumidity: { uom: "wmoUnit:percent", values: hourly(() => 70) },
      windSpeed: { uom: "wmoUnit:km_h-1", values: hourly(() => 36) },
      windDirection: { uom: "wmoUnit:degree_(angle)", values: hourly(() => 270) },
      windGust: { uom: "wmoUnit:km_h-1", values: hourly(() => 54) },
      skyCover: { uom: "wmoUnit:percent", values: hourly(() => 50) },
      quantitativePrecipitation: {
        uom: "wmoUnit:mm",
        values: [
          { validTime: "2026-11-26T00:00:00+00:00/PT6H", value: 0 },
          { validTime: "2026-11-26T06:00:00+00:00/PT6H", value: 12 },
        ],
      },
      pressure: { values: [] },
      weather: {
        values: [
          {
            validTime: "2026-11-26T08:00:00+00:00/PT2H",
            value: [{ coverage: "chance", weather: "rain_showers", intensity: "light" }],
          },
        ],
      },
    },
  };
}

function openMeteo() {
  return {
    latitude: 38.9,
    longitude: -77,
    elevation: 10,
    current_units: { temperature_2m: "°C", wind_speed_10m: "m/s" },
    hourly_units: { precipitation: "mm" },
    current: { time: "2026-11-26T08:30", temperature_2m: 6, wind_speed_10m: 3, interval: 900 },
    hourly: {
      time: Array.from({ length: 72 }, (_, i) =>
        new Date(Date.UTC(2026, 10, 26, 8 + i)).toISOString().slice(0, 16),
      ),
      temperature_2m: Array(72).fill(6),
      precipitation: Array(72).fill(0),
    },
  };
}

test("the NWS serves places in the US and its territories; the rest of the world uses Open-Meteo", () => {
  for (const p of [
    DC,
    { lat: 21.31, lon: -157.86 },
    { lat: 61.22, lon: -149.9 },
    { lat: 18.47, lon: -66.11 },
  ])
    assert.ok(inNwsArea(p), JSON.stringify(p));
  for (const p of [
    { lat: 51.51, lon: -0.13 },
    { lat: 48.86, lon: 2.35 },
    { lat: -33.87, lon: 151.21 },
  ])
    assert.ok(!inNwsArea(p), JSON.stringify(p));
  // The NWS redirects addresses with more than four decimals.
  assert.equal(
    nwsPointsUrl({ lat: 38.889444, lon: -77 }),
    "https://api.weather.gov/points/38.8894,-77.0000",
  );
});

test("an NWS grid becomes 72 UTC hours from the current hour, in SI units", () => {
  const r = parseNwsGrid(grid(), GRID_URL, NOW, NOW);
  assert.equal(r.source, "nws");
  assert.equal(r.hours.length, 72);
  assert.equal(r.hours[0].time, "2026-11-26T08:00");
  assert.equal(r.hours.at(-1).time, "2026-11-29T07:00");
  assert.equal(r.current.time, "2026-11-26T08:00");
  assert.equal(r.current.interval, 3600);
  assert.ok(Math.abs(r.current.temperature - 5.8) < 1e-9);
  // 36 km/h is 10 m/s; a 6-hour block's value applies to each of its hours.
  assert.ok(Math.abs(r.current.wind - 10) < 1e-9);
  assert.ok(Math.abs(r.current.gust - 15) < 1e-9);
  assert.equal(r.current.apparent, 2);
  assert.equal(r.current.windDir, 270);
  assert.equal(r.current.cloud, 50);
  assert.equal(r.current.humidity, 70);
  assert.equal(r.current.summary, "Chance of light rain showers");
  // The grid has no pressure and this one no visibility: they stay missing, never zero.
  assert.equal(r.current.pressure, null);
  assert.equal(r.current.visibility, null);
  // The grid cell's center and height.
  assert.ok(Math.abs(r.grid.lat - 38.88) < 1e-9 && Math.abs(r.grid.lon + 77.01) < 1e-9);
  assert.equal(r.grid.elevation, 6.1);
});

test("a 6-hour precipitation total is shared evenly, and each hour shows the hour before it", () => {
  const r = parseNwsGrid(grid(), GRID_URL, NOW, NOW);
  // 12 mm from 06:00 to 12:00 is 2 mm an hour; 08:00 shows 07:00–08:00.
  assert.equal(r.current.precip, 2);
  assert.equal(r.hours[0].precipitation, 2);
  assert.equal(r.hours[4].time, "2026-11-26T12:00");
  assert.equal(r.hours[4].precipitation, 2);
  // 12:00–13:00 has no forecast total in this grid.
  assert.equal(r.hours[5].precipitation, null);
});

test("NWS units other than the expected ones, or a grid that misses this hour, fail visibly", () => {
  const f = grid();
  f.properties.windSpeed.uom = "wmoUnit:m_s-1";
  assert.throws(() => parseNwsGrid(f, GRID_URL, NOW, NOW), /units/);
  assert.throws(
    () => parseNwsGrid(grid(), GRID_URL, Date.UTC(2026, 11, 20), Date.UTC(2026, 11, 20)),
    /this hour/,
  );
  assert.throws(() => parseNwsGrid({}, GRID_URL, NOW, NOW), /incomplete/);
});

test("NWS weather words read as plain English, and a dry hour falls back to the sky cover", () => {
  assert.equal(
    nwsSummary([{ coverage: "likely", weather: "rain", intensity: "moderate" }], 90),
    "Rain likely",
  );
  assert.equal(
    nwsSummary([{ coverage: "slight_chance", weather: "thunderstorms" }], 40),
    "Slight chance of thunderstorms",
  );
  assert.equal(nwsSummary([{ coverage: "patchy", weather: "fog_mist" }], 100), "Patchy fog");
  assert.equal(
    nwsSummary(
      [
        { coverage: "chance", weather: "snow", intensity: "light" },
        { coverage: "chance", weather: "rain", intensity: "light" },
      ],
      95,
    ),
    "Chance of light snow and chance of light rain",
  );
  assert.equal(nwsSummary([{ coverage: null, weather: null, intensity: null }], 5), "Clear sky");
  assert.equal(nwsSummary(undefined, 70), "Mostly cloudy");
  assert.equal(nwsSummary(undefined, null), "Sky cover unavailable");
});

test("a US place asks the NWS for its grid, then the forecast; the CSV names the source", async () => {
  const asked = [];
  const client = createWeatherClient(
    async (url) => {
      asked.push(url);
      if (url.startsWith("https://api.weather.gov/points/"))
        return Response.json({ properties: { forecastGridData: GRID_URL } });
      if (url === GRID_URL) return Response.json(grid());
      throw new Error("unexpected request " + url);
    },
    () => NOW,
  );
  const r = await client(DC);
  assert.equal(r.source, "nws");
  assert.deepEqual(asked, ["https://api.weather.gov/points/38.8894,-77.0352", GRID_URL]);
  assert.match(weatherCsv(r, DC).split("\r\n")[0], /National Weather Service/);
  await client(DC);
  assert.equal(asked.length, 2, "the cache answers a repeat click");
});

test("when the NWS has no grid for a place or does not answer, Open-Meteo forecasts it", async () => {
  for (const failure of [
    (url) => (url.includes("/points/") ? new Response("", { status: 404 }) : null),
    (url) => (url.includes("/gridpoints/") ? new Response("", { status: 503 }) : null),
  ]) {
    const client = createWeatherClient(
      async (url) =>
        failure(url) ??
        (url.includes("/points/")
          ? Response.json({ properties: { forecastGridData: GRID_URL } })
          : url.startsWith("https://api.open-meteo.com/")
            ? Response.json(openMeteo())
            : Response.json(grid())),
      () => NOW,
    );
    const r = await client({ lat: 43.65, lon: -79.38, name: "Toronto" });
    assert.equal(r.source, "open-meteo");
    assert.match(weatherCsv(r, DC).split("\r\n")[0], /Open-Meteo/);
  }
  const down = createWeatherClient(
    async () => new Response("", { status: 500 }),
    () => NOW,
  );
  await assert.rejects(down(DC), /could not complete/);
});
