import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowLeftRight,
  Cloud,
  Download,
  MapPin,
  Thermometer,
  Wind,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LoadingProgress } from "@/components/loading-progress";
import { LibreMap } from "@/components/map/libre-map";
import { fmtLatLon } from "@/lib/geo";
import { headFor } from "@/lib/seo";
import {
  compass,
  fetchWeather,
  WeatherError,
  weatherCsv,
  weatherDescription,
  weatherNumber as number,
  type WeatherHour,
  type WeatherPoint,
  type WeatherResult,
} from "@/lib/weather";
import "@/components/atlas-weather.css";

export const Route = createFileRoute("/tools/live-weather")({
  component: LiveWeather,
  head: () =>
    headFor({
      title: "Live weather",
      description:
        "Compare weather in two places and follow the next 72 hours together. A free classroom tool connecting weather forecasts with Earth science.",
      path: "/tools/live-weather",
    }),
});
const PRESETS: WeatherPoint[] = [
  { name: "London", lat: 51.51, lon: -0.13 },
  { name: "New York", lat: 40.71, lon: -74.01 },
  { name: "Nairobi", lat: -1.29, lon: 36.82 },
  { name: "Sydney", lat: -33.87, lon: 151.21 },
  { name: "Tokyo", lat: 35.68, lon: 139.69 },
  { name: "Reykjavík", lat: 64.15, lon: -21.94 },
  { name: "Cairo", lat: 30.04, lon: 31.24 },
  { name: "Shanghai", lat: 31.23, lon: 121.47 },
  { name: "Hong Kong", lat: 22.3, lon: 114.17 },
  { name: "Taipei", lat: 25.03, lon: 121.57 },
  { name: "Macau", lat: 22.2, lon: 113.54 },
  { name: "Singapore", lat: 1.35, lon: 103.82 },
];
type Layer = "temperature" | "precipitation" | "wind" | "cloud";
const LAYERS: { id: Layer; label: string; unit: string; note: string }[] = [
  {
    id: "temperature",
    label: "Temperature",
    unit: "°C",
    note: "Air temperature is measured in the model at 2 m above the surface.",
  },
  {
    id: "precipitation",
    label: "Precipitation",
    unit: "mm",
    note: "Precipitation is the water equivalent of rain or snow accumulated in the preceding hour.",
  },
  {
    id: "wind",
    label: "Wind",
    unit: "m s⁻¹",
    note: "Wind speed is measured in the model at 10 m; the direction tells you where it comes from.",
  },
  {
    id: "cloud",
    label: "Cloud cover",
    unit: "%",
    note: "Cloud cover ranges from a clear sky at 0% to complete cover at 100%.",
  },
];
type ReadingState = {
  data: WeatherResult | null;
  busy: boolean;
  error: WeatherError | null;
  key?: string;
};
function useWeather(point: WeatherPoint) {
  const [state, setState] = useState<ReadingState>({ data: null, busy: true, error: null });
  const [version, reload] = useState(0);
  const key = `${point.lat},${point.lon}`;
  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, busy: true, error: null, key });
    const timer = setTimeout(() => {
      void fetchWeather(point, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setState({ data, busy: false, error: null, key });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setState({
              data: null,
              busy: false,
              error:
                error instanceof WeatherError
                  ? error
                  : new WeatherError("Weather unavailable. Please try again."),
              key,
            });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [point.lat, point.lon, version]);
  return {
    ...(state.key === key ? state : { data: null, busy: true, error: null }),
    retry: () => reload((v) => v + 1),
  };
}
const utc = (time: string) => `${time.replace("T", " ")} UTC`;
const samePoint = (a: WeatherPoint, b: WeatherPoint) =>
  Math.abs(a.lat - b.lat) < 0.005 && Math.abs(a.lon - b.lon) < 0.005;
function LiveWeather() {
  const [a, setA] = useState<WeatherPoint>(PRESETS[0]),
    [b, setB] = useState<WeatherPoint>(PRESETS[11]);
  const [target, setTarget] = useState<"A" | "B">("A"),
    [layer, setLayer] = useState<Layer>("temperature");
  const [hour, setHour] = useState(0),
    [projector, setProjector] = useState(false),
    [share, setShare] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const wa = useWeather(a),
    wb = useWeather(b);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const parse = (key: string): WeatherPoint | null => {
      const raw = params.get(key);
      if (!raw) return null;
      const pieces = raw.split(",");
      if (pieces.length !== 2 || pieces.some((piece) => !piece.trim())) return null;
      const coordinates = pieces.map(Number);
      const [lat, lon] = coordinates;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon) ||
        Math.abs(lat) > 90 ||
        Math.abs(lon) > 180
      )
        return null;
      return {
        ...(PRESETS.find((p) => Math.abs(p.lat - lat) < 0.005 && Math.abs(p.lon - lon) < 0.005) ?? {
          name: "Map point",
        }),
        lat,
        lon,
      };
    };
    const pa = parse("a"),
      pb = parse("b");
    if (pa) setA(pa);
    if (pb) setB(pb);
    const view = params.get("layer");
    if (LAYERS.some((l) => l.id === view)) setLayer(view as Layer);
  }, []);
  function choose(point: WeatherPoint, id = target) {
    const p = { ...point, lon: ((((point.lon + 180) % 360) + 360) % 360) - 180 };
    if (id === "B") setB(p);
    else setA(p);
    setHour(0);
  }
  const selected = LAYERS.find((l) => l.id === layer)!;
  const timeline = wa.data?.hours ?? wb.data?.hours ?? [];
  const selectedIndex = Math.min(hour, Math.max(0, timeline.length - 1));
  const selectedTime = timeline[selectedIndex]?.time;
  const ha = wa.data?.hours.find((h) => h.time === selectedTime),
    hb = wb.data?.hours.find((h) => h.time === selectedTime);
  const forecast = useMemo(
    () =>
      timeline.map((h) => ({
        time: h.time,
        a: wa.data?.hours.find((x) => x.time === h.time)?.[layer] ?? null,
        b: wb.data?.hours.find((x) => x.time === h.time)?.[layer] ?? null,
      })),
    [wa.data, wb.data, layer],
  );
  const defaultPair = samePoint(a, PRESETS[0]) && samePoint(b, PRESETS[11]);
  async function copyView() {
    const url = new URL(location.href);
    url.search = "";
    url.searchParams.set("a", `${a.lat.toFixed(3)},${a.lon.toFixed(3)}`);
    url.searchParams.set("b", `${b.lat.toFixed(3)},${b.lon.toFixed(3)}`);
    url.searchParams.set("layer", layer);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShare("Comparison link copied. Weather values refresh when it is opened.");
    } catch {
      setShare("Your browser could not copy the link. Select and copy it below.");
    }
    setShareUrl(url.toString());
  }
  return (
    <main
      id="main"
      className={`field-page weather-page ${projector ? "field-page--projector" : ""}`}
    >
      <header className="field-page-heading">
        <div>
          <p className="section-label">Observe the atmosphere</p>
          <h1>Live weather</h1>
          <p className="field-intro">
            Compare the weather in two places, then follow the next three days together. Start with
            London’s temperate setting and Singapore’s position near the equator.
          </p>
        </div>
        <div className="field-actions">
          <button className="field-button" onClick={() => void copyView()}>
            Share comparison
          </button>
          <button
            className="field-button"
            aria-pressed={projector}
            onClick={() => setProjector((v) => !v)}
          >
            Projector {projector ? "on" : "off"}
          </button>
        </div>
      </header>
      {share && (
        <div className="field-notice" role="status">
          <p>{share}</p>
          {shareUrl && (
            <input
              className="weather-share-link"
              aria-label="Comparison link"
              value={shareUrl}
              readOnly
              onFocus={(e) => e.currentTarget.select()}
            />
          )}
        </div>
      )}
      <section className="weather-places" aria-label="Choose two places">
        <PlacePicker id="A" point={a} onChoose={(p) => choose(p, "A")} />
        <button
          className="field-button weather-swap"
          aria-label="Swap the two places"
          onClick={() => {
            setA(b);
            setB(a);
            setHour(0);
          }}
        >
          <ArrowLeftRight size={18} aria-hidden="true" />
        </button>
        <PlacePicker id="B" point={b} onChoose={(p) => choose(p, "B")} />
      </section>
      <div className="weather-current-heading">
        <h2>Current model conditions</h2>
        <p>Open-Meteo supplies model estimates rather than readings from a weather station.</p>
      </div>
      <div className="weather-current-grid">
        <WeatherCard id="A" point={a} state={wa} />
        <WeatherCard id="B" point={b} state={wb} />
      </div>
      <Comparison
        a={wa.data}
        b={wb.data}
        names={[a.name, b.name]}
        defaultPair={defaultPair}
        sameLocation={samePoint(a, b)}
      />
      <section className="weather-forecast" aria-label="Compare the hourly forecast">
        <div className="weather-section-heading">
          <div>
            <p className="section-label">Follow the next 72 hours</p>
            <h2>One timeline, two places.</h2>
          </div>
          <div className="weather-layer-buttons" role="group" aria-label="Weather variable">
            {LAYERS.map((l) => (
              <button
                key={l.id}
                className="field-button"
                aria-pressed={layer === l.id}
                onClick={() => setLayer(l.id)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        <div className="weather-forecast-legend">
          <span>
            <i className="weather-key-a" />
            A: {a.name}
          </span>
          <span>
            <i className="weather-key-b" />
            B: {b.name}
          </span>
          <span>{selected.unit}</span>
        </div>
        {forecast.length ? (
          <>
            <Forecast
              rows={forecast}
              layer={layer}
              names={[a.name, b.name]}
              selectedTime={selectedTime}
              unit={selected.unit}
            />
            <div className="weather-timeline">
              <label htmlFor="weather-hour">
                Compare at <strong>{selectedTime ? utc(selectedTime) : "the selected hour"}</strong>
              </label>
              <input
                id="weather-hour"
                aria-label="Forecast hour"
                type="range"
                min={0}
                max={timeline.length - 1}
                value={selectedIndex}
                onChange={(e) => setHour(Number(e.target.value))}
              />
              <div className="weather-hour-values" aria-live="polite">
                <span>
                  <span className="field-letter">A</span>
                  {a.name}
                  <strong>{number(ha?.[layer], selected.unit)}</strong>
                </span>
                <span>
                  <span className="field-letter field-letter--b">B</span>
                  {b.name}
                  <strong>{number(hb?.[layer], selected.unit)}</strong>
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="weather-forecast-empty">
            {wa.busy || wb.busy ? (
              <LoadingProgress
                label="Loading the shared forecast"
                detail="Both places will use the same UTC timeline."
              />
            ) : (
              <p>
                The forecast is unavailable. Retry either place above; the map and related labs are
                still available.
              </p>
            )}
          </div>
        )}
        <p className="weather-chart-note">
          {selected.note} Both series use UTC, so the same hour can fall at different times of day
          locally.
        </p>
        {forecast.length > 0 && (
          <details className="weather-table">
            <summary>Read or download the hourly values</summary>
            <div className="field-actions">
              {wa.data && (
                <button className="field-button" onClick={() => downloadCsv(wa.data!, a)}>
                  <Download size={15} aria-hidden="true" />
                  {a.name} CSV
                </button>
              )}
              {wb.data && (
                <button className="field-button" onClick={() => downloadCsv(wb.data!, b)}>
                  <Download size={15} aria-hidden="true" />
                  {b.name} CSV
                </button>
              )}
            </div>
            <div className="weather-table-scroll">
              <table>
                <caption>
                  {selected.label} in {selected.unit}; a dash means the provider supplied no value.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Time (UTC)</th>
                    <th scope="col">A: {a.name}</th>
                    <th scope="col">B: {b.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((r) => (
                    <tr key={r.time}>
                      <th scope="row">{r.time.replace("T", " ")}</th>
                      <td>{r.a?.toFixed(1) ?? "—"}</td>
                      <td>{r.b?.toFixed(1) ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>
      <section className="weather-map-section" aria-label="Locate the comparison">
        <div className="weather-section-heading">
          <div>
            <p className="section-label">Put the readings on the map</p>
            <h2>Where does the weather change?</h2>
          </div>
          <div className="field-actions" role="group" aria-label="Choose the place to move">
            {(["A", "B"] as const).map((id) => (
              <button
                key={id}
                className="field-button"
                aria-pressed={target === id}
                onClick={() => setTarget(id)}
              >
                Move place {id}
              </button>
            ))}
          </div>
        </div>
        <p className="weather-chart-note">
          Choose which place to move, then click the map. Pin readings follow the selected forecast
          hour above.
        </p>
        <LibreMap
          center={[a.lon, a.lat]}
          zoom={3}
          marker={[a.lon, a.lat]}
          markerB={[b.lon, b.lat]}
          markerContent={<WeatherMapPin id="A" hour={ha} layer={layer} />}
          markerBContent={<WeatherMapPin id="B" hour={hb} layer={layer} />}
          draggableMarker
          fitMarkers
          onClick={(p) => choose({ ...p, name: "Map point" })}
          onMarkerDrag={(p) => choose({ ...p, name: "Map point" }, "A")}
          label="Live weather comparison map"
          className="weather-comparison-map"
        />
      </section>
      <section className="weather-learning" aria-label="Connect the observations">
        <div>
          <p className="section-label">From observation to explanation</p>
          <h2>What would you investigate next?</h2>
          <p>
            Choose a difference in the forecast and suggest a cause. Use a model to test your
            explanation, then decide what other evidence you would need.
          </p>
        </div>
        <div className="weather-learning-links">
          <Link to="/lab/$slug" params={{ slug: "wind" }}>
            <Wind size={21} aria-hidden="true" />
            <span>
              <strong>Why does the wind move?</strong>
              <small>Explore pressure gradients and Earth’s rotation.</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/lab/$slug" params={{ slug: "fronts" }}>
            <Cloud size={21} aria-hidden="true" />
            <span>
              <strong>What brings changing weather?</strong>
              <small>Follow warm and cold air at a front.</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/lab/$slug" params={{ slug: "climate-types" }}>
            <Thermometer size={21} aria-hidden="true" />
            <span>
              <strong>How is this different from climate?</strong>
              <small>Compare long-term temperature and rainfall patterns.</small>
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>
      <details className="field-methods">
        <summary>About the forecast data</summary>
        <p>
          Open-Meteo combines numerical weather models and chooses a suitable model grid cell near
          each pin. The terrain height and location of that cell can differ from your selected
          coordinates. A dash means no value was supplied. Requests are cached for ten minutes in
          this tab.
        </p>
        <p>
          Use these forecasts to investigate patterns in class. For decisions about severe weather,
          consult the relevant local weather service.
        </p>
        <p>
          <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
            Weather data by Open-Meteo
          </a>
          . <Link to="/atlas">Explore the Atlas</Link> to connect today’s weather with longer-term
          climate and landscapes.
        </p>
      </details>
    </main>
  );
}
function PlacePicker({
  id,
  point,
  onChoose,
}: {
  id: "A" | "B";
  point: WeatherPoint;
  onChoose: (p: WeatherPoint) => void;
}) {
  const selected = PRESETS.find((p) => samePoint(p, point));
  return (
    <label className="field-label weather-place-picker">
      <span>
        <span className={`field-letter ${id === "B" ? "field-letter--b" : ""}`}>{id}</span>Place{" "}
        {id}
      </span>
      <select
        aria-label={`Place ${id}`}
        value={selected?.name ?? "custom"}
        onChange={(e) => {
          const p = PRESETS.find((item) => item.name === e.target.value);
          if (p) onChoose(p);
        }}
      >
        {!selected && (
          <option value="custom">Map point ({fmtLatLon(point.lat, point.lon, 2)})</option>
        )}
        {PRESETS.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}
function WeatherCard({
  id,
  point,
  state,
}: {
  id: "A" | "B";
  point: WeatherPoint;
  state: ReadingState & { retry: () => void };
}) {
  const [clock, setClock] = useState(Date.now());
  useEffect(() => {
    if (!state.error?.retryAt) return;
    const timer = setInterval(() => setClock(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [state.error?.retryAt]);
  const wait = Math.max(0, Math.ceil(((state.error?.retryAt ?? 0) - clock) / 1000));
  const data = state.data,
    c = data?.current;
  return (
    <section
      aria-label={`Place ${id} weather`}
      aria-busy={state.busy}
      className={`weather-current-card ${id === "B" ? "weather-current-card--b" : ""}`}
    >
      <div className="weather-card-title">
        <h3>{point.name}</h3>
        <span className={`field-letter ${id === "B" ? "field-letter--b" : ""}`}>{id}</span>
      </div>
      <p className="weather-coordinates">
        <MapPin size={13} aria-hidden="true" />
        {fmtLatLon(point.lat, point.lon, 2)}
      </p>
      <div role="status">
        {state.busy && (
          <div className="weather-card-loading">
            <LoadingProgress
              label={`Loading weather for ${point.name}`}
              detail="Contacting Open-Meteo…"
            />
          </div>
        )}
        {state.error && (
          <div className="weather-card-error">
            <p>{state.error.message}</p>
            <button disabled={wait > 0} className="field-button" onClick={state.retry}>
              {wait > 0 ? `Retry in ${wait} seconds` : "Retry weather"}
            </button>
          </div>
        )}
      </div>
      {c && data && (
        <>
          <div className="weather-primary-reading">
            <p>
              {c.temperature === null ? "—" : c.temperature.toFixed(1)}
              <span>°C</span>
            </p>
            <div>
              <span>{weatherDescription(c.code)}</span>
              <small>Feels like {number(c.apparent, "°C")}</small>
            </div>
          </div>
          <p className="weather-model-time">Model time: {utc(c.time)}</p>
          <dl className="weather-main-metrics">
            <Metric label="Wind at 10 m" value={number(c.wind, "m s⁻¹")} />
            <Metric label="Cloud cover" value={number(c.cloud, "%", 0)} />
            <Metric
              label={`Rain / snow in ${c.interval / 60} min`}
              value={number(c.precip, "mm")}
            />
          </dl>
          <details className="weather-more-readings">
            <summary>More readings and data source</summary>
            <dl className="weather-extra-metrics">
              <Metric label="Relative humidity" value={number(c.humidity, "%", 0)} />
              <Metric label="Mean sea-level pressure" value={number(c.pressure, "hPa", 0)} />
              <Metric label="Wind gust at 10 m" value={number(c.gust, "m s⁻¹")} />
              <Metric
                label="Visibility"
                value={number(c.visibility === null ? null : c.visibility / 1000, "km")}
              />
            </dl>
            {c.wind !== null && c.windDir !== null && (
              <p className="weather-chart-note">
                {c.wind < 0.3
                  ? "The wind is calm."
                  : `The wind comes from ${compass(c.windDir)} (${c.windDir.toFixed(0)}°).`}
              </p>
            )}
            <p className="weather-chart-note">
              The model grid cell is at {fmtLatLon(data.grid.lat, data.grid.lon, 3)}, with an
              elevation of {number(data.grid.elevation, "m", 0)}. Retrieved at{" "}
              {new Date(data.fetchedAt).toISOString().replace("T", " ").slice(0, 19)} UTC.
            </p>
            <div className="field-actions">
              <a className="field-text-button" href={data.url} target="_blank" rel="noreferrer">
                Open the data request <ArrowRight size={15} aria-hidden="true" />
              </a>
              <button className="field-text-button" onClick={() => downloadCsv(data, point)}>
                Download CSV
              </button>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
function Comparison({
  a,
  b,
  names,
  defaultPair,
  sameLocation,
}: {
  a: WeatherResult | null;
  b: WeatherResult | null;
  names: string[];
  defaultPair: boolean;
  sameLocation: boolean;
}) {
  const same = a && b && a.current.time === b.current.time;
  const delta =
    same && a.current.temperature !== null && b.current.temperature !== null
      ? b.current.temperature - a.current.temperature
      : null;
  const sentence =
    delta === null
      ? "Compare the temperature, cloud cover and wind, then look for changes along the forecast."
      : Math.abs(delta) < 0.05
        ? `${names[0]} and ${names[1]} have the same modelled temperature at this time.`
        : `${names[1]} is ${Math.abs(delta).toFixed(1)} °C ${delta > 0 ? "warmer" : "cooler"} than ${names[0]} at the same model time.`;
  return (
    <aside className="weather-comparison-note" aria-label="Read the comparison">
      <p className="section-label">Notice and explain</p>
      <p>
        {sameLocation
          ? "Both pins are at the same location. Choose a different second place to investigate a contrast."
          : sentence}
      </p>
      <p>
        {a && b && !same
          ? "The current model times differ; use the shared forecast timeline for a comparison at the same UTC hour."
          : defaultPair
            ? "London and Singapore differ in latitude and local time. Follow their daily temperature cycles before deciding how much a single reading can tell you about climate."
            : "Consider latitude, elevation, distance from the sea and local time when proposing an explanation. One forecast does not establish a place’s climate."}
      </p>
    </aside>
  );
}
function WeatherMapPin({
  id,
  hour,
  layer,
}: {
  id: "A" | "B";
  hour: WeatherHour | undefined;
  layer: Layer;
}) {
  const unit = LAYERS.find((l) => l.id === layer)!.unit;
  return (
    <div
      data-weather-pin={id}
      className={`weather-map-pin ${id === "B" ? "weather-map-pin--b" : ""}`}
    >
      <strong>{id}</strong>
      <span>{number(hour?.[layer], unit)}</span>
      {layer === "wind" && hour?.windDir != null && <small>From {compass(hour.windDir)}</small>}
    </div>
  );
}
function Forecast({
  rows,
  layer,
  names,
  selectedTime,
  unit,
}: {
  rows: { time: string; a: number | null; b: number | null }[];
  layer: Layer;
  names: string[];
  selectedTime: string | undefined;
  unit: string;
}) {
  return (
    <div
      className="weather-chart"
      role="img"
      aria-label={`${LAYERS.find((l) => l.id === layer)!.label} forecast for ${names[0]} and ${names[1]}. Both use the same UTC timeline. An accessible data table follows.`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={rows} margin={{ top: 16, right: 12, bottom: 8, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-glass-border)" />
          <XAxis
            dataKey="time"
            minTickGap={60}
            tickFormatter={(value) => String(value).slice(5).replace("T", " ")}
            stroke="var(--color-mist)"
            tick={{ fontSize: 11 }}
          />
          <YAxis
            width={42}
            stroke="var(--color-mist)"
            tick={{ fontSize: 11 }}
            domain={
              layer === "cloud"
                ? [0, 100]
                : layer === "temperature"
                  ? ["auto", "auto"]
                  : [0, "auto"]
            }
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-basalt)",
              color: "var(--color-chalk)",
              border: "1px solid var(--color-glass-border)",
              borderRadius: 10,
              fontSize: 12,
            }}
            labelFormatter={(value) => utc(String(value))}
            formatter={(value: number, name: string) => [`${value.toFixed(1)} ${unit}`, name]}
          />
          {layer === "precipitation" ? (
            <>
              <Bar
                dataKey="a"
                name={`A: ${names[0]}`}
                fill="var(--color-glacier)"
                isAnimationActive={false}
              />
              <Bar
                dataKey="b"
                name={`B: ${names[1]}`}
                fill="var(--color-sandstone)"
                isAnimationActive={false}
              />
            </>
          ) : (
            <>
              <Line
                dataKey="a"
                name={`A: ${names[0]}`}
                stroke="var(--color-glacier)"
                strokeWidth={2.5}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
              <Line
                dataKey="b"
                name={`B: ${names[1]}`}
                stroke="var(--color-sandstone)"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </>
          )}
          {selectedTime && (
            <ReferenceLine x={selectedTime} stroke="var(--color-chalk)" strokeDasharray="3 4" />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
function downloadCsv(data: WeatherResult, point: WeatherPoint) {
  const url = URL.createObjectURL(
    new Blob([weatherCsv(data, point)], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `geolens-weather-${point.lat.toFixed(2)}-${point.lon.toFixed(2)}.csv`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
