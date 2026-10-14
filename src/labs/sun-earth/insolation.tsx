import { useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, Graticule, Atmosphere } from "@/components/globe/earth";
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
        space
        camera={[3.8, 2.3, -5.5]}
        scale="Parallel sunlight at 1 AU · 1361 W/m² normal to the beam · local noon meridian"
        trueScale="Earth sphere at one scale · arrows and selected patch enlarged"
      >
        <EarthMesh radius={1.3} sunDirection={sun} />
        <Atmosphere radius={1.345} />
        <Graticule radius={1.307} />
        <SunBeam point={point} normal={n} sun={sun} />
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

/**
 * A beam of fixed cross-section arriving at the selected patch, and the ellipse it lights
 * on the surface. The footprint lengthens by 1/cos(incidence) as latitude moves away from
 * the subsolar point: the same energy is spread over a larger area.
 */
function SunBeam({
  point,
  normal,
  sun,
}: {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  sun: THREE.Vector3;
}) {
  const width = 0.24,
    length = 1.7,
    cosine = normal.dot(sun);
  const beam = useMemo(() => {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sun);
    const centre = point.clone().addScaledVector(sun, length / 2 + 0.01);
    return { q, centre };
  }, [point, sun]);
  const footprint = useMemo(() => {
    // Right-handed local frame: x across the meridian, y along it (north), z outward normal.
    const north = new THREE.Vector3()
      .crossVectors(normal, new THREE.Vector3(1, 0, 0))
      .normalize()
      .negate();
    const across = new THREE.Vector3().crossVectors(north, normal).normalize();
    const basis = new THREE.Matrix4().makeBasis(across, north, normal);
    return new THREE.Quaternion().setFromRotationMatrix(basis);
  }, [normal]);
  if (cosine <= 0.02) return null;
  const stretch = Math.min(1 / cosine, 8);
  return (
    <>
      <mesh position={beam.centre} quaternion={beam.q} raycast={() => null}>
        <boxGeometry args={[width, length, width]} />
        <meshBasicMaterial
          color="#ffd98f"
          transparent
          opacity={0.16}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={point.clone().multiplyScalar(1.012)}
        quaternion={footprint}
        scale={[1, stretch, 1]}
        raycast={() => null}
      >
        <circleGeometry args={[width / 2, 48]} />
        <meshBasicMaterial
          color="#ffcf73"
          transparent
          opacity={0.55}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <Tag
        pos={
          point
            .clone()
            .addScaledVector(sun, length + 0.15)
            .toArray() as [number, number, number]
        }
        text={`Same beam · ${stretch.toFixed(2)}× area`}
        note="Each beam carries the same power. Where sunlight meets the ground at a low angle, that power is spread over a larger patch, so each square metre receives less."
        occlude={false}
      />
    </>
  );
}
