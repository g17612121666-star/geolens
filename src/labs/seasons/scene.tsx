import { useMemo, useState } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { EarthMesh, AxisLine, Graticule, CityMarker } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { Arrow, ScienceReadout, ScienceStudio } from "../shared/science-kit";
import { orbitPosition } from "../shared/science-geometry";
import { Tag } from "../shared/kit";
import { StarMesh } from "@/components/globe/star";
import { latLonToXYZ } from "@/lib/geo";
export default function Seasons() {
  const [close, setClose] = useState(false);
  const { t, params, trueScale } = useLabControls();
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
  const orbit = useMemo(
    () => Array.from({ length: 193 }, (_, i) => orbitPosition(i / 192, ecc, 2.65)),
    [ecc],
  );
  const radius = close ? 1 : trueScale ? (2.65 * 6371) / 149597870.7 : 0.65;
  const centre: [number, number, number] = close ? [0, 0, 0] : position;
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
            : "Earth enlarged · fixed axial direction · T compares actual sizes and distances"
        }
        trueScale={
          close
            ? "Spherical Earth · surface locations to scale · arrows are direction symbols"
            : "Earth radius and orbit distance share a scale · reset to inspect the tiny Earth"
        }
        lights={false}
        camera={close ? [3.8, 1.4, 4.2] : [0, 8, 4]}
      >
        {!close && (
          <>
            <Line points={orbit} color="#98b6bc" lineWidth={1.6} />
            <StarMesh radius={trueScale ? (2.65 * 695700) / 149597870.7 : 0.22} />
            <Tag
              pos={[0, 0.43, 0]}
              text="Sun"
              note="At one focus. Orbit stretch is a hypothetical experiment; Earth's present eccentricity is about 0.0167."
            />
          </>
        )}
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
        <group position={centre} rotation={[(tilt * Math.PI) / 180, 0, 0]}>
          <group rotation={[0, t * Math.PI * 2 * 365.2422, 0]}>
            <EarthMesh radius={radius} sunDirection={sun} />
            <Graticule radius={radius * 1.004} />
            {!trueScale &&
              [-tilt, tilt, -(90 - tilt), 90 - tilt].map((lat, i) => (
                <Line
                  key={i}
                  points={Array.from({ length: 161 }, (_, j) =>
                    latLonToXYZ(lat, -180 + (j / 160) * 360, radius * 1.008),
                  )}
                  color={i < 2 ? "#d9bb87" : "#82bed4"}
                  transparent
                  opacity={0.65}
                  lineWidth={0.9}
                />
              ))}
            {!trueScale && (
              <>
                <CityMarker lat={51.5} lon={-0.1} radius={radius * 1.02} />
                <CityMarker lat={-33.87} lon={151.21} radius={radius * 1.02} color="#efb474" />
              </>
            )}
          </group>
          <AxisLine radius={radius * 1.4} markerRadius={radius * 0.035} tiltDeg={0} />
        </group>
        {close && (
          <Tag
            pos={[centre[0], 1.6, centre[2]]}
            text={`Declination ${declination.toFixed(1)}°`}
            note="Latitude directly under the Sun. North keeps a fixed direction while Earth orbits."
            occlude={false}
          />
        )}
        {!close &&
          [0, 0.25, 0.5, 0.75].map((v, i) => {
            const p = orbitPosition(v, 0, 2.65);
            return (
              <Tag
                key={i}
                pos={[p[0] * 1.2, -0.25, p[2] * 1.2]}
                text={
                  ["March equinox", "June solstice", "September equinox", "December solstice"][i]
                }
                occlude={false}
              />
            );
          })}
      </ScienceStudio>
      <ScienceReadout>
        <div
          className="pointer-events-auto mb-1 flex justify-center gap-2"
          role="group"
          aria-label={"Season model view"}
        >
          <button
            className={`min-h-11 rounded-lg border border-white/15 px-3 ${!close ? "text-glacier" : ""}`}
            aria-pressed={!close}
            onClick={() => setClose(false)}
          >
            {"Orbit overview"}
          </button>
          <button
            className={`min-h-11 rounded-lg border border-white/15 px-3 ${close ? "text-glacier" : ""}`}
            aria-pressed={close}
            onClick={() => setClose(true)}
          >
            {"Earth close-up"}
          </button>
        </div>
        {"Declination "}
        {declination.toFixed(1)}
        {"° · London "}
        {daylight(51.5).toFixed(1)} {"h daylight · Sydney "}
        {daylight(-33.87).toFixed(1)}{" "}
        {"h · geometric horizon. Gold: tropics · blue: polar circles. Tilt "}
        {tilt.toFixed(1)}
        {"°; distance "}
        {(new THREE.Vector3(...position).length() / 2.65).toFixed(3)} {"AU. "}
        {ecc > 0.001
          ? "Stretched orbit: labels mark directions, not equal time intervals."
          : "Set tilt to zero to compare 12-hour days throughout the orbit."}
      </ScienceReadout>
    </>
  );
}
