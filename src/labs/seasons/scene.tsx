import { memo, useMemo, useState } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { EarthMesh, Graticule, CityMarker, Atmosphere } from "@/components/globe/earth";
import { useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { Arrow, ScienceReadout, ScienceStudio } from "../shared/science-kit";
import { orbitPosition } from "../shared/science-geometry";
import { Tag } from "../shared/kit";
import { StarMesh } from "@/components/globe/star";
import { latLonToXYZ } from "@/lib/geo";
import { useIsCompact } from "@/hooks/use-media";
import { useT } from "@/lib/i18n";
/** Earth's axis: a rod through the poles with an arrowhead at the north end, toward Polaris. */
function AxisRod({ length, thickness }: { length: number; thickness: number }) {
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[thickness, thickness, length * 2, 10]} />
        <meshBasicMaterial color="#f4efe6" />
      </mesh>
      <mesh position={[0, length + thickness * 3, 0]}>
        <coneGeometry args={[thickness * 2.6, thickness * 7, 14]} />
        <meshBasicMaterial color="#f4efe6" />
      </mesh>
    </group>
  );
}

/** Where Earth is at each solstice and equinox, as a fraction of the year from March. */
const SEASON_POINTS = [0, 0.25, 0.5, 0.75];

/**
 * A smaller Earth at a solstice or equinox, lit by the Sun, with its axis: the axis points
 * the same way at all four, so the north half leans toward the Sun in June and away in
 * December. It shrinks away as the moving Earth arrives, so the two never overlap.
 */
const SeasonEarth = memo(function SeasonEarth({
  at,
  ecc,
  tilt,
  size,
}: {
  at: number;
  ecc: number;
  tilt: number;
  size: number;
}) {
  const position = useMemo(() => orbitPosition(at, ecc, 2.65), [at, ecc]),
    sun = useMemo(() => new THREE.Vector3(...position).negate().normalize(), [position]);
  if (size < 0.01) return null;
  return (
    <group position={position} rotation={[(tilt * Math.PI) / 180, 0, 0]} scale={size}>
      <EarthMesh radius={0.4} sunDirection={sun} segments={48} clouds={false} halo={false} />
      <AxisRod length={0.58} thickness={0.012} />
    </group>
  );
});

export default function Seasons() {
  const [close, setClose] = useState(false);
  const tr = useT();
  const compact = useIsCompact();
  const { t, params, trueScale } = useLabState("t", "params", "trueScale");
  useLabTick(1 / 36);
  const tilt = params.tilt ?? 23.44,
    ecc = params.ecc ?? 0,
    position = orbitPosition(t, ecc, 2.65);
  // March origin; north leans toward +Z. At June Earth's position is −Z.
  const sun = new THREE.Vector3(...position).negate().normalize();
  const axis = new THREE.Vector3(
    0,
    Math.cos((tilt * Math.PI) / 180),
    Math.sin((tilt * Math.PI) / 180),
  );
  const declination = (Math.asin(axis.dot(sun)) * 180) / Math.PI;
  // Close-up: turn the whole Earth–sunlight system about the vertical so sunlight always comes
  // from the right of the default view. The geometry relative to the Sun is unchanged; the
  // tilted axis then visibly leans toward the Sun in June and away from it in December.
  const viewSun = new THREE.Vector3(0.993, 0, -0.121);
  const viewTurn = close ? Math.atan2(viewSun.x, viewSun.z) - Math.atan2(sun.x, sun.z) : 0;
  const shownSun = close ? viewSun : sun;
  const orbit = useMemo(
    () => Array.from({ length: 193 }, (_, i) => orbitPosition(i / 192, ecc, 2.65)),
    [ecc],
  );
  const radius = close ? 1 : trueScale ? (2.65 * 6371) / 149597870.7 : 0.65;
  // Tropics and polar circles move with the tilt, not with the day, so build them once per tilt.
  const circles = useMemo(
    () =>
      [-tilt, tilt, -(90 - tilt), 90 - tilt].map((lat) =>
        Array.from({ length: 161 }, (_, j) =>
          latLonToXYZ(lat, -180 + (j / 160) * 360, radius * 1.008),
        ),
      ),
    [tilt, radius],
  );
  const center: [number, number, number] = close ? [0, 0, 0] : position;
  const daylight = (lat: number) => {
    const h = -Math.tan((lat * Math.PI) / 180) * Math.tan((declination * Math.PI) / 180);
    return h <= -1 ? 24 : h >= 1 ? 0 : (24 * Math.acos(h)) / Math.PI;
  };
  return (
    <>
      <ScienceStudio
        key={close ? "close" : "orbit"}
        slug="seasons"
        scale={
          close
            ? "Earth close-up · rays show sunlight direction · same tilt and year controls"
            : "Earth enlarged · smaller Earths mark the solstices and equinoxes · the axis keeps one direction in space · physical scale shows true sizes and distances"
        }
        trueScale={
          close
            ? "Spherical Earth · surface locations to scale · arrows are direction symbols"
            : "Earth radius and orbit distance share one scale · Earth is a tiny dot at this scale"
        }
        lights={false}
        space
        // The orbit is seen from the side, as in textbook diagrams: the axis leans toward +z,
        // so from +x the lean shows, toward the Sun at the June solstice and away in December.
        camera={close ? [3.8, 1.4, 4.2] : [7.4, 3.1, 0.4]}
      >
        {!close && (
          <>
            <Line points={orbit} color="#98b6bc" lineWidth={1.6} />
            <StarMesh radius={trueScale ? (2.65 * 695700) / 149597870.7 : 0.4} />
            {!trueScale &&
              Array.from({ length: 12 }, (_, m) => {
                const p = orbitPosition(m / 12, ecc, 2.65);
                const out = new THREE.Vector3(p[0], 0, p[2]).normalize();
                return (
                  <mesh key={m} position={[p[0] + out.x * 0.06, 0, p[2] + out.z * 0.06]}>
                    <sphereGeometry args={[m % 3 === 0 ? 0.045 : 0.028, 16, 12]} />
                    <meshBasicMaterial color={m % 3 === 0 ? "#f2d49b" : "#9fb9bf"} />
                  </mesh>
                );
              })}
            {!trueScale &&
              SEASON_POINTS.map((at) => {
                // Fraction of the year between the moving Earth and this point, either way round.
                const gap = Math.abs(((t - at + 1.5) % 1) - 0.5);
                return (
                  <SeasonEarth
                    key={at}
                    at={at}
                    ecc={ecc}
                    tilt={tilt}
                    size={Math.round(THREE.MathUtils.smoothstep(gap, 0.035, 0.075) * 20) / 20}
                  />
                );
              })}
            <Tag
              pos={[0, 0.15, -0.95]}
              occlude={false}
              text="Sun"
              note="The Sun sits at one focus of the orbit. Orbit stretch is a what-if setting; Earth's real eccentricity is about 0.0167."
            />
          </>
        )}
        <group rotation={[0, viewTurn, 0]}>
          {close &&
            [-0.45, 0, 0.45].map((offset, i) => {
              const shift = new THREE.Vector3(-sun.z, 0, sun.x).multiplyScalar(offset);
              return (
                <Arrow
                  key={i}
                  from={sun.clone().multiplyScalar(2.1).add(shift).toArray()}
                  to={sun.clone().multiplyScalar(1.25).add(shift).toArray()}
                  color="#edd3a4"
                  width={1}
                />
              );
            })}
          <group position={center} rotation={[(tilt * Math.PI) / 180, 0, 0]}>
            {/* 366.2422 turns relative to the stars give 365.2422 solar days. */}
            <group rotation={[0, t * Math.PI * 2 * 366.2422, 0]}>
              <EarthMesh radius={radius} sunDirection={shownSun} />
              {!trueScale && <Atmosphere radius={radius * 1.035} />}
              <Graticule radius={radius * 1.004} />
              {!trueScale &&
                circles.map((points, i) => (
                  <Line
                    key={i}
                    points={points}
                    color={i < 2 ? "#d9bb87" : "#82bed4"}
                    transparent
                    opacity={0.65}
                    lineWidth={0.9}
                  />
                ))}
              {!trueScale && (
                <>
                  <CityMarker lat={40.7} lon={-74} radius={radius * 1.02} />
                  <CityMarker lat={-33.87} lon={151.21} radius={radius * 1.02} color="#efb474" />
                </>
              )}
            </group>
            <AxisRod length={radius * 1.4} thickness={Math.max(radius * 0.02, 0.0008)} />
            {close && (
              // At the southern end of the axis, clear of the declination label above.
              <Tag
                pos={[0, -radius * 1.5, 0]}
                text={`Axis · ${tilt.toFixed(1)}° tilt`}
                short="Axis"
                note="Earth spins about this axis once a day. It keeps pointing the same way in space (toward Polaris) all year, so the Northern Hemisphere leans toward the Sun in June and away from it in December."
                occlude={false}
              />
            )}
          </group>
        </group>
        {close && (
          // The day–night line is the great circle at right angles to the sunlight; this point on
          // it faces the default view.
          <Tag
            pos={new THREE.Vector3(0.121, -0.3, 0.993).normalize().multiplyScalar(1.1).toArray()}
            text="Terminator · day–night line"
            short="Terminator"
            note="The edge between day and night. Where it crosses a line of latitude shows how long the day is there; at the equinoxes it cuts every parallel in half, giving 12 hours of daylight everywhere."
            occlude={false}
          />
        )}
        {close && (
          <Tag
            pos={[center[0], 1.6, center[2]]}
            text={`Declination ${declination.toFixed(1)}°`}
            note="Latitude directly under the Sun. North keeps a fixed direction while Earth orbits."
            occlude={false}
          />
        )}
        {!close &&
          SEASON_POINTS.map((v, i) => {
            // Each label sits just above (below, for the March Earth nearest the viewer) its
            // Earth, clear of the Sun at the center.
            const p = orbitPosition(v, ecc, 2.65),
              names = ["March equinox", "June solstice", "September equinox", "December solstice"];
            return (
              <Tag
                key={i}
                pos={[p[0], i === 0 ? -0.95 : 0.95, p[2]]}
                text={compact ? ["Mar", "Jun", "Sep", "Dec"][i] : names[i]}
                title={names[i]}
                occlude={false}
              />
            );
          })}
      </ScienceStudio>
      <ScienceReadout>
        <div
          className="pointer-events-auto mb-1 flex justify-center gap-2"
          role="group"
          aria-label={tr("Season model view")}
        >
          <button
            className={`min-h-11 rounded-lg border border-white/15 px-3 ${!close ? "text-glacier" : ""}`}
            aria-pressed={!close}
            onClick={() => setClose(false)}
          >
            {tr("Orbit overview")}
          </button>
          <button
            className={`min-h-11 rounded-lg border border-white/15 px-3 ${close ? "text-glacier" : ""}`}
            aria-pressed={close}
            onClick={() => setClose(true)}
          >
            {tr("Earth close-up")}
          </button>
        </div>
        {"Declination "}
        {declination.toFixed(1)}
        {"° · New York "}
        {daylight(40.7).toFixed(1)} {"h daylight · Sydney "}
        {daylight(-33.87).toFixed(1)}{" "}
        {"h · geometric horizon. Gold: tropics · blue: polar circles. Tilt "}
        {tilt.toFixed(1)}
        {"°; distance "}
        {(new THREE.Vector3(...position).length() / 2.65).toFixed(3)} {"AU. "}
        {ecc > 0.001
          ? "Stretched orbit: labels mark directions, not equal time intervals."
          : tilt < 0.05
            ? "No tilt: 12-hour days everywhere except at the poles."
            : "Set Axial tilt to 0° to see 12-hour days all year."}
      </ScienceReadout>
    </>
  );
}
