import { useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, Graticule } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { noonIrradiance, dailyMeanIrradiance } from "@/lib/insolation-science";
import { VERIFIED_PHOTOS } from "@/lib/verified-photos";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
export default function SunEarth() {
  const { params } = useLabControls(),
    lat = params.latitude ?? 51.5,
    decl = params.declination ?? 0,
    d = (decl * Math.PI) / 180,
    p = (lat * Math.PI) / 180,
    sun = useMemo(() => new THREE.Vector3(0, Math.sin(d), -Math.cos(d)), [d]),
    point = new THREE.Vector3(0, Math.sin(p), -Math.cos(p)).multiplyScalar(1.3),
    n = point.clone().normalize(),
    flux = noonIrradiance(lat, decl),
    photo = VERIFIED_PHOTOS["sdo-visible-sunspots"];
  const latitudes = [-90, -60, -30, 0, 30, 60, 90];
  return (
    <>
      <ScienceStudio
        slug="sun-earth"
        lights={false}
        camera={[3.8, 2.3, -5.5]}
        scale="Parallel sunlight at 1 AU · 1361 W/m² normal to the beam · local noon meridian"
        trueScale="Earth sphere at one scale · arrows and selected patch enlarged"
      >
        <EarthMesh radius={1.3} sunDirection={sun} />
        <Graticule radius={1.307} />
        <Line
          points={Array.from({ length: 121 }, (_, i) => {
            const a = (((i / 120) * 180 - 90) * Math.PI) / 180;
            return [0, 1.315 * Math.sin(a), -1.315 * Math.cos(a)] as [number, number, number];
          })}
          color="#dcc08d"
          lineWidth={1.5}
        />
        <mesh
          position={point.clone().multiplyScalar(1.015)}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)}
        >
          <circleGeometry args={[0.075, 40]} />
          <meshBasicMaterial color="#f2d194" side={THREE.DoubleSide} />
        </mesh>
        <mesh
          position={point.clone().multiplyScalar(1.018)}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)}
        >
          <ringGeometry args={[0.11, 0.13, 64]} />
          <meshBasicMaterial color="#f2d194" side={THREE.DoubleSide} />
        </mesh>
        <Line
          points={Array.from({ length: 65 }, (_, i) => {
            const a = p + ((d - p) * i) / 64;
            return [point.x, point.y + Math.sin(a) * 0.48, point.z - Math.cos(a) * 0.48] as [
              number,
              number,
              number,
            ];
          })}
          color="#e6be84"
          lineWidth={1.6}
        />
        <Arrow
          from={point.toArray() as [number, number, number]}
          to={point.clone().addScaledVector(n, 0.65).toArray() as [number, number, number]}
          color="#c7ded9"
          width={0.7}
        />
        {[-0.6, 0, 0.6].map((x) => (
          <Arrow
            key={x}
            from={[x, sun.y * 3.3, sun.z * 3.3]}
            to={[x, sun.y * 1.5, sun.z * 1.5]}
            color="#e2bd7b"
            width={0.85}
          />
        ))}
        <Line
          points={[
            point.clone().addScaledVector(n, 0.65).toArray() as [number, number, number],
            [-1.25, 1.55, -0.5],
          ]}
          color="#a1bbb8"
          lineWidth={0.8}
        />
        <Tag
          pos={[-1.25, 1.55, -0.5]}
          text={`Normal at ${Math.abs(lat).toFixed(1)}°${lat < 0 ? "S" : "N"}`}
          note="The leader points to the outward normal at the gold local-noon patch. Its angle to incoming sunlight determines horizontal top-of-atmosphere flux; the daily mean also includes night. Neither calculation includes atmospheric absorption or reflection."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div
          className="mx-auto flex max-w-xl items-end justify-center gap-2"
          aria-label={"Daily mean top-of-atmosphere flux by latitude"}
        >
          {latitudes.map((a) => (
            <div key={a} className="flex w-10 flex-col items-center gap-1">
              <span className="text-xs">{dailyMeanIrradiance(a, decl).toFixed(0)}</span>
              <span
                className="w-3 rounded-t bg-glacier/70"
                style={{ height: `${2 + dailyMeanIrradiance(a, decl) / 12}px` }}
              />
              <span className="text-xs">{a}°</span>
            </div>
          ))}
        </div>
        {"Selected latitude: local noon "}
        {flux.toFixed(0)} {"W/m² · daily mean "}
        {dailyMeanIrradiance(lat, decl).toFixed(0)} {"W/m². Incidence angle "}
        {Math.abs(lat - decl).toFixed(1)}
        {"° from the surface normal. Declination "}
        {decl.toFixed(2)}
        {"°. These are horizontal top-of-atmosphere values at fixed 1 AU."}
        {params.spots > 0.5 ? (
          <span className="mx-auto mt-2 flex max-w-xl items-center gap-3 text-left">
            <img
              src={photo.src}
              alt={photo.alt}
              className="h-16 w-16 shrink-0 rounded object-contain"
            />
            <span>
              {
                "Actual SDO solar observation, displayed in processed orange colour. Sunspots are cooler magnetic regions. The switch does not alter this fixed-irradiance experiment. "
              }
              <a
                className="pointer-events-auto text-ice underline"
                href={photo.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                {photo.credit}
              </a>
            </span>
          </span>
        ) : null}
      </ScienceReadout>
    </>
  );
}
