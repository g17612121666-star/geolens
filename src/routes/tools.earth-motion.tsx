import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { CITIES, dayOfYearUTC, fmtClock, fmtLatLon, latLonToXYZ, xyzToLatLon } from "@/lib/geo";
import {
  daysInYear,
  solarReading,
  solarAltitude,
  subsolarLongitude,
  validSolarDate,
  SOLAR_MODEL,
} from "@/lib/solar";
import { ClientCanvas } from "@/components/globe/client-canvas";
import { EarthMesh, Graticule } from "@/components/globe/earth";
import { OrbitControls, Line, Html } from "@react-three/drei";
import { headFor } from "@/lib/seo";
import { Figure } from "@/components/figure";
import { VERIFIED_PHOTOS } from "@/lib/verified-photos";

export const Route = createFileRoute("/tools/earth-motion")({
  component: EarthMotion,
  head: () =>
    headFor({
      title: "Earth-motion calculator",
      description:
        "Calculate daylight and the Sun’s height for any place and date, and see the day–night boundary on a 3D Earth.",
      path: "/tools/earth-motion",
    }),
});
type Site = { name: string; lat: number; lon: number };
const PRESETS = Object.values(CITIES);
const button =
  "min-h-11 rounded-full border border-white/15 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
const field = "mt-1 h-11 w-full rounded-xl border border-white/15 bg-basalt px-3 text-chalk";
function utcLabel(value: number | null) {
  if (value === null) return "No crossing";
  const offset = Math.floor(value / 24);
  return `${fmtClock(value)}${offset ? ` (${offset > 0 ? "+" : ""}${offset} day)` : ""}`;
}
function EarthMotion() {
  const [date, setDate] = useState("2026-06-21");
  const [a, setA] = useState<Site>({ ...CITIES.london });
  const [b, setB] = useState<Site | null>({ ...CITIES.sydney });
  const [tilt, setTilt] = useState(23.44);
  const [hour, setHour] = useState(12);
  const [equationOn, setEquationOn] = useState(true);
  const [refraction, setRefraction] = useState(false);
  const [projector, setProjector] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const ignored: string[] = [];
    if (q.has("date")) {
      if (validSolarDate(q.get("date")!)) setDate(q.get("date")!);
      else ignored.push("date");
    }
    const read = (key: string): Site | null => {
      const raw = q.get(key)?.split(",");
      if (!raw || raw.length !== 2 || raw.some((v) => !v.trim())) return null;
      const [lat, lon] = raw.map(Number);
      return Number.isFinite(lat) &&
        Number.isFinite(lon) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lon) <= 180
        ? { name: `Place ${key.toUpperCase()}`, lat, lon }
        : null;
    };
    const pa = read("a"),
      pb = read("b");
    if (pa) setA(pa);
    if (pb) setB(pb);
    else if (q.get("b") === "off") setB(null);
    if (q.has("a") && !pa) ignored.push("place A");
    if (q.has("b") && !pb && q.get("b") !== "off") ignored.push("place B");
    if (q.get("tilt") === "0") setTilt(0);
    else if (q.has("tilt") && q.get("tilt") !== "23.44") ignored.push("tilt");
    if (q.has("hour")) {
      const value = Number(q.get("hour"));
      if (q.get("hour")?.trim() && Number.isFinite(value) && value >= 0 && value < 24)
        setHour(value);
      else ignored.push("UTC time");
    }
    setRefraction(q.get("refraction") === "1");
    setEquationOn(q.get("eot") !== "0");
    for (const key of ["refraction", "eot"])
      if (q.has(key) && !["0", "1"].includes(q.get(key)!)) ignored.push(key);
    if (ignored.length)
      setNotice(`Invalid shared ${ignored.join(", ")}. Default values are shown for those fields.`);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key.toLowerCase() === "p") setProjector((v) => !v);
      if (e.key === "Escape") setProjector(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const parsed = validSolarDate(date);
  const dateKey = parsed?.getTime();
  const outA = useMemo(
    () => (parsed ? solarReading(parsed, a.lat, a.lon, tilt, refraction, equationOn) : null),
    [dateKey, a, tilt, refraction, equationOn],
  );
  const outB = useMemo(
    () => (parsed && b ? solarReading(parsed, b.lat, b.lon, tilt, refraction, equationOn) : null),
    [dateKey, b, tilt, refraction, equationOn],
  );
  const year = parsed?.getUTCFullYear() ?? 2026;
  const doy = parsed ? dayOfYearUTC(parsed) : 1;
  const subLon = outA ? subsolarLongitude(hour, equationOn ? outA.equationOfTime : 0) : 0;
  function applyDay(n: number) {
    setDate(new Date(Date.UTC(year, 0, n, 12)).toISOString().slice(0, 10));
  }
  async function share() {
    const q = new URLSearchParams({
      date,
      a: `${a.lat},${a.lon}`,
      b: b ? `${b.lat},${b.lon}` : "off",
      tilt: String(tilt),
      hour: String(hour),
      refraction: refraction ? "1" : "0",
      eot: equationOn ? "1" : "0",
    });
    const url = `${window.location.origin}/tools/earth-motion?${q}`;
    window.history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Classroom link copied.");
    } catch {
      setNotice("The address bar now contains your classroom link.");
    }
  }
  function download() {
    if (!outA) return;
    const rows = [
      [
        "model",
        "date_UTC",
        "time_UTC_hours",
        "latitude_deg",
        "longitude_deg",
        "tilt_deg",
        "horizon_deg",
        "equation_of_time_enabled",
        "declination_deg",
        "subsolar_longitude_deg",
        "solar_altitude_now_deg",
        "noon_altitude_deg",
        "daylight_hours",
        "sunrise_UTC_hours",
        "sunset_UTC_hours",
        "polar_state",
      ],
      ...[
        [a, outA],
        [b, outB],
      ]
        .filter(([s, o]) => s && o)
        .map(([s, o]) => {
          const site = s as Site,
            out = o as NonNullable<typeof outA>;
          return [
            SOLAR_MODEL,
            date,
            hour,
            site.lat,
            site.lon,
            tilt,
            refraction ? -0.833 : 0,
            equationOn,
            (out.declination * 180) / Math.PI,
            subLon,
            solarAltitude(site.lat, site.lon, out.declination, subLon),
            out.noonAltitude,
            out.polar === "horizon" ? "" : out.hours,
            out.sunriseUTC ?? "",
            out.sunsetUTC ?? "",
            out.polar,
          ];
        }),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.join(",")).join("\n")], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `geolens-solar-${date}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Calculations prepared for download, including the selected UTC time.");
  }
  return (
    <main
      id="main"
      className={`mx-auto px-5 pb-24 pt-24 ${projector ? "max-w-[1600px] text-lg" : "max-w-[1280px]"}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="section-label">{"Explore Earth and Sun"}</p>
          <h1 className="mt-3 font-display text-4xl">{"Earth-motion calculator"}</h1>
        </div>
        <button className={button} aria-pressed={projector} onClick={() => setProjector((v) => !v)}>
          {projector ? "Projector on" : "Projector off"}
        </button>
      </div>
      <p className="mt-4 max-w-3xl text-mist">
        {
          "Move through the year, compare two latitudes, then change the time of day. The readings and illuminated hemisphere use the same solar geometry."
        }
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className={button} onClick={share}>
          {"Share this setup"}
        </button>
        <button className={button} onClick={download} disabled={!outA}>
          {"Download calculations (CSV)"}
        </button>
        <Link to="/lab/$slug" params={{ slug: "seasons" }} className={button}>
          {"Open the seasons lab →"}
        </Link>
      </div>
      <p role="status" className="mt-2 text-sm text-glacier">
        {notice}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <section
          aria-label={"Calculation parameters"}
          className="rounded-2xl border border-white/10 bg-white/[.025] p-5"
        >
          <label className="block text-sm text-mist">
            {"Date (UTC)"}
            <input
              type="date"
              min="1901-01-01"
              max="2099-12-31"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
          {!parsed && (
            <p role="alert" className="mt-2 text-amber-300">
              {"Choose a valid date between 1901 and 2099."}
            </p>
          )}
          <label className="mt-4 block text-sm text-mist">
            {"Day "}
            {doy} {"of "}
            {daysInYear(year)} · {year}
            <input
              type="range"
              min="1"
              max={daysInYear(year)}
              value={doy}
              disabled={!parsed}
              onChange={(e) => applyDay(Number(e.target.value))}
              className="mt-2 min-h-8 w-full accent-glacier"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["March", 3, 20],
              ["June", 6, 21],
              ["September", 9, 22],
              ["December", 12, 21],
            ].map(([name, month, day]) => (
              <button
                key={name}
                className={button}
                onClick={() => setDate(`${year}-${String(month).padStart(2, "0")}-${day}`)}
              >
                {name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-mist">
            {
              "These dates provide seasonal reference points. The exact equinox and solstice times vary by year."
            }
          </p>
          <SiteFields label={"Place A"} site={a} set={setA} />
          {b ? (
            <>
              <SiteFields label={"Place B"} site={b} set={setB} />
              <button className={`${button} mt-3`} onClick={() => setB(null)}>
                {"Remove comparison"}
              </button>
            </>
          ) : (
            <button className={`${button} mt-4`} onClick={() => setB({ ...CITIES.sydney })}>
              {"Compare a second place"}
            </button>
          )}
          <fieldset className="mt-6">
            <legend className="text-sm text-mist">{"Axial tilt"}</legend>
            <div className="mt-2 flex gap-2">
              {[23.44, 0].map((t) => (
                <button
                  key={t}
                  aria-pressed={tilt === t}
                  className={`${button} ${tilt === t ? "bg-glacier/15 text-glacier" : ""}`}
                  onClick={() => setTilt(t)}
                >
                  {t}°{t === 0 ? " (experiment)" : ""}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="mt-4 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={equationOn}
              onChange={(e) => setEquationOn(e.target.checked)}
            />
            {"Include equation of time"}
          </label>
          <label className="mt-2 flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={refraction}
              onChange={(e) => setRefraction(e.target.checked)}
            />
            {"Use the conventional sunrise angle (−0.833°)"}
          </label>
          <p className="mt-2 text-xs leading-5 text-mist">
            {
              "By default, sunrise occurs when the Sun’s centre crosses a level horizon. The −0.833° option accounts approximately for atmospheric refraction and the Sun’s visible disc; the globe still shows the geometric day–night boundary."
            }
          </p>
        </section>
        <section aria-label={"Earth illumination and readings"} className="min-w-0">
          {outA ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-void">
                <div
                  className={`relative ${projector ? "aspect-square max-h-[65vh] lg:aspect-auto lg:h-[65vh]" : "aspect-square max-h-[34rem] lg:aspect-auto lg:h-[min(62vh,34rem)]"}`}
                >
                  <MotionGlobe
                    declination={outA.declination}
                    subLon={subLon}
                    site={a}
                    other={b}
                    onPick={(lat, lon) => setA({ name: "Dropped point", lat, lon })}
                  />
                  <div className="pointer-events-none absolute left-4 top-4 rounded-xl bg-basalt/85 px-3 py-2 text-sm">
                    <p className="font-mono text-glacier">
                      {fmtClock(hour)} {"UTC · "}
                      {date}
                    </p>
                    <p className="mt-1 text-mist">
                      {"Subsolar latitude "}
                      {((outA.declination * 180) / Math.PI).toFixed(2)}°
                    </p>
                  </div>
                </div>
                <div className="border-t border-white/10 p-4">
                  <label className="block text-sm">
                    {"Time of day: "}
                    {fmtClock(hour)} {"UTC"}
                    <input
                      className="mt-2 min-h-8 w-full accent-glacier"
                      type="range"
                      min="0"
                      max="23.9833333333"
                      step={1 / 60}
                      value={hour}
                      onChange={(e) => setHour(Number(e.target.value))}
                    />
                  </label>
                  <p className="mt-2 text-sm leading-6 text-mist">
                    Drag to rotate the globe. Use Ctrl + scroll or pinch to zoom, and click Earth to
                    move place A.
                  </p>
                  <ul
                    className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
                    aria-label="Globe legend"
                  >
                    <li className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-glacier" aria-hidden="true" />
                      Place A
                    </li>
                    {b && (
                      <li className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-sandstone" aria-hidden="true" />
                        Place B
                      </li>
                    )}
                    <li className="flex items-center gap-2">
                      <span className="h-px w-4 bg-chalk" aria-hidden="true" />
                      Day–night boundary
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <OutCard
                  site={a}
                  label={"A"}
                  out={outA}
                  altitude={solarAltitude(a.lat, a.lon, outA.declination, subLon)}
                />
                {b && outB && (
                  <OutCard
                    site={b}
                    label={"B"}
                    out={outB}
                    altitude={solarAltitude(b.lat, b.lon, outA.declination, subLon)}
                  />
                )}
              </div>
              {outB && (
                <p className="mt-4 rounded-xl border border-glacier/20 bg-glacier/5 p-4 text-sm">
                  {"Difference (A − B): daylight "}
                  {outA.polar === "horizon" || outB.polar === "horizon"
                    ? "undefined"
                    : `${(outA.hours - outB.hours).toFixed(2)} h`}{" "}
                  {"; noon solar altitude "}
                  {(outA.noonAltitude - outB.noonAltitude).toFixed(1)}
                  {
                    "°. Longitude changes the UTC time of noon; latitude and declination control the daylight span."
                  }
                </p>
              )}
              <YearChart year={year} day={doy} a={a} b={b} tilt={tilt} refraction={refraction} />
            </>
          ) : (
            <div className="flex min-h-96 items-center justify-center rounded-2xl border border-white/10 p-8 text-mist">
              {"Choose a valid date to calculate illumination."}
            </div>
          )}
        </section>
      </div>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 p-6">
          <h2 className="font-display text-2xl">{"Read the geometry"}</h2>
          <p className="mt-3 leading-7 text-mist">
            <span className="formula">{"Noon altitude = 90° − |latitude − declination|."}</span>{" "}
            {
              "Negative altitude means the Sun remains below the horizon at noon. At 0° tilt, almost every latitude gets twelve hours of geometric daylight; at the poles the Sun circles along the horizon."
            }
          </p>
          <p className="mt-3 leading-7 text-mist">
            <span className="formula">
              {"Solar noon in UTC = 12 h − longitude/15 − equation of time/60."}
            </span>{" "}
            {
              "Positive equation of time means the apparent Sun is ahead of mean solar time. All event times here are UTC, with day offsets shown; civil time zones and daylight saving are not applied."
            }
          </p>
          <p className="mt-3 text-sm leading-6 text-mist">
            {
              "Calculations cover 1901–2099 and use daily declination at 12:00 UTC. Local hills, observer height and weather are not included. "
            }
            <a
              href="https://gml.noaa.gov/grad/solcalc/calcdetails.html"
              target="_blank"
              rel="noreferrer"
              className="text-ice underline"
            >
              {"Read the NOAA / Meeus method"}
            </a>
            .{" "}
            <Link
              to="/lab/$slug"
              params={{ slug: "solar-altitude" }}
              className="text-ice underline"
            >
              {"Explore solar altitude →"}
            </Link>
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Figure {...VERIFIED_PHOTOS["meteosat-december-solstice"]} />
          <Figure {...VERIFIED_PHOTOS["greens-mill-sundial"]} />
        </div>
      </section>
    </main>
  );
}
function SiteFields({ label, site, set }: { label: string; site: Site; set: (s: Site) => void }) {
  return (
    <fieldset className="mt-5 grid grid-cols-2 gap-3">
      <legend className={`text-sm ${label === "Place A" ? "text-glacier" : "text-amber-200"}`}>
        {label} · {site.name}
      </legend>
      <label className="col-span-2 text-sm text-mist">
        {"Preset"}
        <select
          className={field}
          value={PRESETS.find((p) => p.lat === site.lat && p.lon === site.lon)?.name ?? ""}
          onChange={(e) => {
            const p = PRESETS.find((p) => p.name === e.target.value);
            if (p) set({ ...p });
          }}
        >
          <option value="" disabled>
            {"Custom point"}
          </option>
          {PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      {(["lat", "lon"] as const).map((k) => (
        <label key={k} className="text-sm text-mist">
          {k === "lat" ? "Latitude °N" : "Longitude °E"}
          <input
            type="number"
            min={k === "lat" ? -90 : -180}
            max={k === "lat" ? 90 : 180}
            step="0.01"
            value={site[k]}
            className={field}
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (Number.isFinite(n))
                set({
                  ...site,
                  name: "Custom point",
                  [k]: Math.max(k === "lat" ? -90 : -180, Math.min(k === "lat" ? 90 : 180, n)),
                });
            }}
          />
        </label>
      ))}
    </fieldset>
  );
}
function OutCard({
  site,
  label,
  out,
  altitude,
}: {
  site: Site;
  label: string;
  out: ReturnType<typeof solarReading>;
  altitude: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.025] p-5">
      <p className={`font-mono text-xs ${label === "A" ? "text-glacier" : "text-amber-200"}`}>
        {label} · {fmtLatLon(site.lat, site.lon)}
      </p>
      <h2 className="mt-2 font-display text-2xl">{site.name}</h2>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
        <div>
          <p className="font-mono text-3xl">
            {out.polar === "horizon" ? "—" : out.hours.toFixed(2)}
            <span className="text-base text-mist"> {"h"}</span>
          </p>
          <p className="mt-1 text-sm text-mist">{"Daylight"}</p>
        </div>
        <div>
          <p className="font-mono text-3xl">{altitude.toFixed(1)}°</p>
          <p className="mt-1 text-sm text-mist">{"Sun altitude now"}</p>
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        {[
          ["Noon altitude", `${out.noonAltitude.toFixed(1)}°`],
          ["Solar noon (UTC)", utcLabel(out.noonUTC)],
          ["Sunrise (UTC)", utcLabel(out.sunriseUTC)],
          ["Sunset (UTC)", utcLabel(out.sunsetUTC)],
          ["Equation of time", `${out.equationOfTime.toFixed(2)} min`],
        ].map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-mist">{k}</dt>
            <dd className="font-mono">{v}</dd>
          </div>
        ))}
      </dl>
      {out.polar !== "none" && (
        <p className="mt-3 text-sm text-glacier">
          {out.polar === "horizon"
            ? "Sun on the geometric horizon all day; no ordinary sunrise or sunset."
            : `Polar ${out.polar}: no sunrise or sunset on this modelled day.`}
        </p>
      )}
    </div>
  );
}
function MotionGlobe({
  declination,
  subLon,
  site,
  other,
  onPick,
}: {
  declination: number;
  subLon: number;
  site: Site;
  other: Site | null;
  onPick: (lat: number, lon: number) => void;
}) {
  const sun = useMemo(
    () => new THREE.Vector3(...latLonToXYZ((declination * 180) / Math.PI, subLon)),
    [declination, subLon],
  );
  const terminator = useMemo(() => {
    const v = new THREE.Vector3(0, 1, 0).cross(sun).normalize(),
      w = sun.clone().cross(v).normalize();
    return Array.from({ length: 181 }, (_, i) =>
      v
        .clone()
        .multiplyScalar(Math.cos((i * Math.PI) / 90) * 1.006)
        .addScaledVector(w, Math.sin((i * Math.PI) / 90) * 1.006),
    );
  }, [sun]);
  return (
    <ClientCanvas camera={{ position: [1.3, 0.6, -3.3], fov: 38 }} className="absolute inset-0">
      <ambientLight intensity={0.15} />
      <directionalLight position={sun.clone().multiplyScalar(10)} intensity={2} />
      <group
        onClick={(e) => {
          if (e.delta > 4) return;
          e.stopPropagation();
          const p = xyzToLatLon(e.point.x, e.point.y, e.point.z);
          onPick(Number(p.lat.toFixed(2)), Number(p.lon.toFixed(2)));
        }}
      >
        <EarthMesh sunDirection={sun} radius={1} />
      </group>
      <Graticule />
      <Line points={terminator} color="#f4efe6" lineWidth={1.5} />
      <Line
        points={[
          [0, -1.2, 0],
          [0, 1.2, 0],
        ]}
        color="#859a9c"
      />
      <Html
        position={[0, 1.24, 0]}
        center
        style={{ pointerEvents: "none", color: "#c9d8d5", fontSize: 12 }}
      >
        {"N"}
      </Html>
      <Pin site={site} label={"A"} color="#3ee0c6" />
      {other && <Pin site={other} label={"B"} color="#e8b86d" />}
      <OrbitControls enablePan={false} minDistance={1.5} maxDistance={5.5} />
    </ClientCanvas>
  );
}
function Pin({ site, label, color }: { site: Site; label: string; color: string }) {
  return (
    <group position={latLonToXYZ(site.lat, site.lon, 1.012)}>
      <mesh>
        <sphereGeometry args={[0.018, 24, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html
        position={[0, 0.045, 0]}
        center
        occlude
        distanceFactor={4}
        style={{
          pointerEvents: "none",
          color,
          background: "#10191ce6",
          borderRadius: 6,
          padding: "2px 6px",
          fontSize: 12,
        }}
      >
        {label}
      </Html>
    </group>
  );
}
function YearChart({
  year,
  day,
  a,
  b,
  tilt,
  refraction,
}: {
  year: number;
  day: number;
  a: Site;
  b: Site | null;
  tilt: number;
  refraction: boolean;
}) {
  const n = daysInYear(year);
  const paths = useMemo(
    () =>
      [a, b].map((site) => {
        if (!site) return null;
        let penDown = false;
        return Array.from({ length: n }, (_, i) => {
          const out = solarReading(
            new Date(Date.UTC(year, 0, i + 1, 12)),
            site.lat,
            site.lon,
            tilt,
            refraction,
          );
          if (out.polar === "horizon") {
            penDown = false;
            return "";
          }
          const command = penDown ? "L" : "M";
          penDown = true;
          return `${command}${(40 + (i * 540) / (n - 1)).toFixed(3)},${(150 - out.hours * 5).toFixed(3)}`;
        })
          .join(" ")
          .trim();
      }),
    [year, a, b, tilt, refraction, n],
  );
  return (
    <div className="mt-5 rounded-2xl border border-white/10 p-4">
      <h2 className="text-sm text-mist">
        {"Daylight during "}
        {year} {"(hours)"}
      </h2>
      <svg
        viewBox="0 0 600 182"
        role="img"
        aria-label={`Annual daylight curve for ${a.name}${b ? ` and ${b.name}` : ""}; selected day ${day}`}
        className="mt-3 w-full"
      >
        {[0, 6, 12, 18, 24].map((h) => (
          <g key={h}>
            <line x1="40" x2="580" y1={150 - h * 5} y2={150 - h * 5} stroke="#ffffff15" />
            <text x="6" y={154 - h * 5} fill="#9daead" fontSize="12">
              {h} {"h"}
            </text>
          </g>
        ))}
        {paths.map(
          (path, i) =>
            path && (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={i ? "#e8b86d" : "#3ee0c6"}
                strokeWidth="2.5"
              />
            ),
        )}
        <line
          x1={40 + ((day - 1) * 540) / (n - 1)}
          x2={40 + ((day - 1) * 540) / (n - 1)}
          y1="24"
          y2="155"
          stroke="#f4efe6"
          strokeDasharray="4 4"
        />
        <text x="40" y="177" fill="#9daead" fontSize="12">
          {"Jan"}
        </text>
        <text x="302" y="177" fill="#9daead" fontSize="12">
          {"Jul"}
        </text>
        <text x="557" y="177" fill="#9daead" fontSize="12">
          {"Dec"}
        </text>
      </svg>
      <ul
        className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"
        aria-label="Annual daylight chart legend"
      >
        <li className="flex items-center gap-2">
          <span className="h-0.5 w-4 bg-glacier" aria-hidden="true" />
          A: {a.name}
        </li>
        {b && (
          <li className="flex items-center gap-2">
            <span className="h-0.5 w-4 bg-sandstone" aria-hidden="true" />
            B: {b.name}
          </li>
        )}
        <li className="flex items-center gap-2">
          <span className="h-4 border-l border-dashed border-chalk" aria-hidden="true" />
          Selected date
        </li>
      </ul>
      {tilt === 0 && (Math.abs(a.lat) === 90 || (b && Math.abs(b.lat) === 90)) && (
        <p className="mt-3 text-sm text-mist">
          At a pole with zero axial tilt, the Sun remains on the geometric horizon, so a daylight
          duration is undefined.
        </p>
      )}
    </div>
  );
}
