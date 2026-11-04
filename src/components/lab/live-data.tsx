import { useEffect, useMemo, useState } from "react";
import { useLabControls } from "@/lib/store/lab-controls";

/**
 * Live public data beside three labs: today's ENSO status (NOAA CPC, via the site's own cached
 * route), tide predictions (NOAA CO-OPS) and stream discharge (USGS Water Data). Nothing loads
 * until the reader opens the panel, and no key or personal data is sent.
 */
export function LiveData({ slug }: { slug: string }) {
  const kind =
    slug === "enso"
      ? "enso"
      : slug === "tides"
        ? "tides"
        : slug === "hydrograph" || slug === "river-hydrology"
          ? "river"
          : null;
  const [open, setOpen] = useState(false);
  if (!kind) return null;
  const title = {
    enso: "Live: today's El Niño status",
    tides: "Live: today's tides at a US station",
    river: "Live: a US river right now",
  }[kind];
  return (
    <details
      className="pointer-events-auto rounded-2xl border border-white/10 bg-basalt/95 p-4 text-sm leading-6"
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer font-medium text-chalk">{title}</summary>
      {open && (
        <div className="mt-3">
          {kind === "enso" && <EnsoNow />}
          {kind === "tides" && <TidesNow />}
          {kind === "river" && <RiverNow slug={slug} />}
        </div>
      )}
    </details>
  );
}

type Load<T> = { data?: T; error?: string };

function useJson<T>(url: string | null) {
  const [state, setState] = useState<Load<T>>({});
  useEffect(() => {
    if (!url) return;
    let live = true;
    setState({});
    fetch(url, { signal: AbortSignal.timeout(15000) })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<T>;
      })
      .then((data) => live && setState({ data }))
      .catch(
        () =>
          live && setState({ error: "The data could not be loaded just now. Try again later." }),
      );
    return () => {
      live = false;
    };
  }, [url]);
  return state;
}

const note = "mt-2 text-xs text-mist";
const link = "text-ice hover:underline";

type Enso = {
  status: string | null;
  synopsis: string | null;
  oni: { season: string; year: number; anomaly: number }[];
  sources: { oni: string; discussion: string };
  error?: string;
};

function EnsoNow() {
  const { data, error } = useJson<Enso>("/api/enso");
  const setParam = useLabControls((s) => s.setParam);
  if (error || data?.error) return <p className="text-sandstone">{data?.error ?? error}</p>;
  if (!data) return <p className="text-mist">{"Loading NOAA's latest ENSO update…"}</p>;
  const latest = data.oni.at(-1);
  // The model's slider is a teaching scale from −1 to +1, not a measured index.
  const sliderValue = latest ? Math.max(-1, Math.min(1, latest.anomaly / 2)) : 0;
  return (
    <div>
      {data.status && <p className="font-medium text-chalk">{data.status}</p>}
      {latest && (
        <p className="mt-1 text-chalk/90">
          {`Oceanic Niño Index for ${latest.season} ${latest.year}: ${latest.anomaly > 0 ? "+" : ""}${latest.anomaly.toFixed(2)} °C`}
          <span className="text-mist">
            {latest.anomaly >= 0.5
              ? " (El Niño range: +0.5 °C or more)"
              : latest.anomaly <= -0.5
                ? " (La Niña range: −0.5 °C or less)"
                : " (neutral range)"}
          </span>
        </p>
      )}
      {data.synopsis && <p className="mt-2 text-mist">{data.synopsis}</p>}
      {data.oni.length > 1 && (
        <Spark values={data.oni.map((r) => r.anomaly)} zero label="ONI, last 12 seasons" />
      )}
      {latest && (
        <button
          type="button"
          onClick={() => setParam("enso", Math.round(sliderValue * 20) / 20)}
          className="mt-3 inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 text-chalk hover:border-glacier"
        >
          {"Set the model to match"}
        </button>
      )}
      <p className={note}>
        {
          "The model's ENSO slider is a teaching scale, not a measured index; this button sets it to the index divided by 2. Source: NOAA Climate Prediction Center, "
        }
        <a className={link} href={data.sources.discussion} target="_blank" rel="noreferrer">
          {"ENSO diagnostic discussion"}
        </a>
        {" and "}
        <a className={link} href={data.sources.oni} target="_blank" rel="noreferrer">
          {"ONI table"}
        </a>
        {"."}
      </p>
    </div>
  );
}

const STATIONS = [
  { id: "8518750", name: "The Battery, New York" },
  { id: "8443970", name: "Boston, Massachusetts" },
  { id: "8724580", name: "Key West, Florida" },
  { id: "8771450", name: "Galveston, Texas" },
  { id: "9414290", name: "San Francisco, California" },
  { id: "9447130", name: "Seattle, Washington" },
  { id: "9455920", name: "Anchorage, Alaska" },
  { id: "1612340", name: "Honolulu, Hawaiʻi" },
];

/** Days since new Moon, from a reference new Moon on 6 Jan 2000 18:14 UTC. */
function moonAge(date: Date) {
  const synodic = 29.530589;
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 86_400_000;
  return ((days % synodic) + synodic) % synodic;
}

type Tides = {
  predictions?: { t: string; v: string; type: "H" | "L" }[];
  error?: { message: string };
};

function TidesNow() {
  const [station, setStation] = useState(STATIONS[0].id);
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&datum=MLLW&station=${station}&interval=hilo&units=metric&time_zone=lst_ldt&format=json&begin_date=${today}&range=48&application=Geolens`;
  const { data, error } = useJson<Tides>(url);
  const age = moonAge(new Date());
  const phase =
    age < 2 || age > 27.5
      ? "near new Moon: expect spring tides, with a large range"
      : Math.abs(age - 14.77) < 2
        ? "near full Moon: expect spring tides, with a large range"
        : Math.abs(age - 7.38) < 2 || Math.abs(age - 22.15) < 2
          ? "near a quarter Moon: expect neap tides, with a small range"
          : "between spring and neap tides";
  const rows = data?.predictions ?? [];
  const highs = rows.filter((r) => r.type === "H").map((r) => Number(r.v)),
    lows = rows.filter((r) => r.type === "L").map((r) => Number(r.v));
  const range = highs.length && lows.length ? Math.max(...highs) - Math.min(...lows) : null;
  return (
    <div>
      <label className="block text-[13px] text-mist">
        {"Tide station"}
        <select
          value={station}
          onChange={(e) => setStation(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-basalt px-2 text-chalk"
        >
          {STATIONS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-chalk/90">{`The Moon is ${age.toFixed(1)} days old: ${phase}.`}</p>
      {error || data?.error ? (
        <p className="mt-2 text-sandstone">{data?.error?.message ?? error}</p>
      ) : !data ? (
        <p className="mt-2 text-mist">{"Loading NOAA tide predictions…"}</p>
      ) : (
        <>
          <ul className="mt-2 space-y-0.5 font-mono text-[13px]">
            {rows.map((r) => (
              <li key={r.t} className={r.type === "H" ? "text-chalk" : "text-mist"}>
                {`${r.type === "H" ? "High" : "Low "}  ${r.t.slice(5, 16).replace("-", "/")}  ${Number(r.v).toFixed(2)} m`}
              </li>
            ))}
          </ul>
          {range !== null && (
            <p className="mt-2 text-chalk/90">{`Largest range in these 48 hours: ${range.toFixed(2)} m.`}</p>
          )}
        </>
      )}
      <p className={note}>
        {
          "Predicted heights above mean lower low water, in local time. Is this station's pattern two highs a day, two unequal highs, or one? Check again in a week and compare the range. Source: "
        }
        <a
          className={link}
          href={`https://tidesandcurrents.noaa.gov/noaatidepredictions.html?id=${station}`}
          target="_blank"
          rel="noreferrer"
        >
          {"NOAA Tides & Currents"}
        </a>
        {"."}
      </p>
    </div>
  );
}

const GAUGES = [
  { id: "01646500", name: "Potomac River near Washington, DC" },
  { id: "07010000", name: "Mississippi River at St. Louis, Missouri" },
  { id: "12144500", name: "Snoqualmie River near Snoqualmie, Washington" },
  { id: "08158000", name: "Colorado River at Austin, Texas" },
  { id: "09380000", name: "Colorado River at Lees Ferry, Arizona (below Glen Canyon Dam)" },
];

type Flow = { features?: { properties: { time: string; value: string } }[] };

function RiverNow({ slug }: { slug: string }) {
  const [gauge, setGauge] = useState(slug === "river-hydrology" ? "09380000" : GAUGES[0].id);
  const url = `https://api.waterdata.usgs.gov/ogcapi/v0/collections/continuous/items?monitoring_location_id=USGS-${gauge}&parameter_code=00060&time=P7D&f=json&limit=5000&properties=time,value`;
  const { data, error } = useJson<Flow>(url);
  const points = (data?.features ?? [])
    .map((f) => ({ t: f.properties.time, q: Number(f.properties.value) * 0.0283168 }))
    .filter((p) => Number.isFinite(p.q));
  const latest = points.at(-1);
  const max = points.reduce((m, p) => Math.max(m, p.q), 0),
    min = points.reduce((m, p) => Math.min(m, p.q), Infinity);
  return (
    <div>
      <label className="block text-[13px] text-mist">
        {"Stream gauge"}
        <select
          value={gauge}
          onChange={(e) => setGauge(e.target.value)}
          className="mt-1 block min-h-11 w-full rounded-lg border border-white/15 bg-basalt px-2 text-chalk"
        >
          {GAUGES.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>
      {error ? (
        <p className="mt-2 text-sandstone">{error}</p>
      ) : !data ? (
        <p className="mt-2 text-mist">{"Loading USGS discharge for the past 7 days…"}</p>
      ) : points.length === 0 ? (
        <p className="mt-2 text-sandstone">
          {"This gauge has no discharge readings for the past week."}
        </p>
      ) : (
        <>
          <p className="mt-2 text-chalk/90">
            {`Latest: ${fmt(latest!.q)} m³/s at ${new Date(latest!.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}. Past 7 days: ${fmt(min)} to ${fmt(max)} m³/s.`}
          </p>
          <Spark values={points.map((p) => p.q)} label="Discharge, past 7 days" />
        </>
      )}
      <p className={note}>
        {slug === "river-hydrology"
          ? "Below a dam, flow follows the release schedule: look for a daily rhythm at Lees Ferry and compare it with a river without a large dam upstream. "
          : "Look for a rising limb, a peak and a falling limb after rain. A large river rises and falls over days; a small, steep one within hours. "}
        {"Recent readings are provisional and can be revised. Source: "}
        <a
          className={link}
          href={`https://waterdata.usgs.gov/monitoring-location/USGS-${gauge}/`}
          target="_blank"
          rel="noreferrer"
        >
          {"USGS Water Data"}
        </a>
        {"."}
      </p>
    </div>
  );
}

function fmt(q: number) {
  return q >= 100 ? Math.round(q).toLocaleString("en-US") : q.toFixed(q >= 10 ? 1 : 2);
}

/** A small line chart; the y-axis spans the data, with a zero line when asked. */
function Spark({
  values,
  label,
  zero = false,
}: {
  values: number[];
  label: string;
  zero?: boolean;
}) {
  const lo = Math.min(...values, zero ? 0 : Infinity),
    hi = Math.max(...values, zero ? 0 : -Infinity),
    span = hi - lo || 1;
  const pts = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * 300},${56 - ((v - lo) / span) * 52}`)
    .join(" ");
  const zeroY = 56 - ((0 - lo) / span) * 52;
  return (
    <figure className="mt-3">
      <svg viewBox="0 0 300 60" className="h-16 w-full" role="img" aria-label={label}>
        {zero && (
          <line x1="0" x2="300" y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.3" />
        )}
        <polyline points={pts} fill="none" stroke="#2a9d8f" strokeWidth="2" />
      </svg>
      <figcaption className="text-xs text-mist">{label}</figcaption>
    </figure>
  );
}
