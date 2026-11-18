import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, Graticule, Atmosphere } from "@/components/globe/earth";
import { useLabState } from "@/lib/store/lab-controls";
import { noonIrradiance, dailyMeanIrradiance } from "@/lib/insolation-science";
import { VERIFIED_PHOTOS } from "@/lib/verified-photos";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { photoSrcSet } from "@/lib/responsive-image";
import { beamAxes, footprint, meridianPoint, rayHit, type V3 } from "./beam";

/** Earth's radius in the scene, and the beam: about 880 km across at this scale. */
const R = 1.3,
  BEAM = 0.18,
  GRID = 24,
  CELLS = 4,
  /** How far the beams reach out toward the Sun. */
  SHAFT = 1.3,
  RAY_START = 2.6;
const v3 = (a: V3) => new THREE.Vector3(...a);

export default function SunEarth() {
  const { params } = useLabState("params"),
    lat = params.latitude ?? 40.7,
    decl = params.declination ?? 0,
    d = (decl * Math.PI) / 180,
    incidence = lat - decl,
    cosine = Math.cos((incidence * Math.PI) / 180),
    flux = noonIrradiance(lat, decl),
    photo = VERIFIED_PHOTOS["sdo-visible-sunspots"];
  const sun = useMemo<V3>(() => [0, Math.sin(d), -Math.cos(d)], [d]),
    target = useMemo(() => meridianPoint(lat, R), [lat]),
    overhead = useMemo(() => meridianPoint(decl, R), [decl]),
    { north } = beamAxes(sun),
    along = (p: V3) => p[0] * north[0] + p[1] * north[1] + p[2] * north[2],
    // A second, overhead beam for comparison, once it no longer overlaps the selected one.
    compare = Math.abs(along(target) - along(overhead)) > BEAM * 1.3,
    n = v3(target).normalize(),
    sunV = v3(sun);
  const latitudes = [-90, -60, -30, 0, 30, 60, 90];
  const hemisphere = (a: number) => `${Math.abs(a).toFixed(1)}°${a < 0 ? "S" : a > 0 ? "N" : ""}`;
  return (
    <>
      <ScienceStudio
        slug="sun-earth"
        lights={false}
        space
        camera={[4.4, 1.5, -5.4]}
        scale="Parallel sunlight at 1 AU · 1361 W/m² normal to the beam · local noon meridian"
        trueScale="Earth sphere at one scale · beams about 880 km wide · normal arrow enlarged"
      >
        <EarthMesh radius={R} sunDirection={sunV} />
        <Atmosphere radius={1.345} />
        <Graticule radius={1.307} />
        <Line
          points={Array.from({ length: 121 }, (_, i) => meridianPoint((i / 120) * 180 - 90, 1.315))}
          color="#dcc08d"
          lineWidth={1.5}
        />
        <SunRays sun={sun} clear={[along(target), ...(compare ? [along(overhead)] : [])]} />
        {compare && (
          <Beam
            target={overhead}
            sun={sun}
            label={`Sun overhead at ${hemisphere(decl)} · 1× area`}
            short="Overhead · 1×"
            note="At the subsolar point the noon Sun is straight overhead: the beam meets the ground square-on and lights the smallest possible patch."
            priority={1}
          />
        )}
        {cosine > 0.02 ? (
          <Beam
            target={target}
            sun={sun}
            label={`${compare ? "Same beam" : "Sun nearly overhead"} · ${(1 / cosine).toFixed(2)}× area`}
            short={`${(1 / cosine).toFixed(2)}× area`}
            note="Each beam carries the same power. Where sunlight meets the ground at a low angle, that power is spread over a larger patch, so each square meter receives less: 1/cos of the angle between the sunlight and the vertical. The model's beams are about 880 km wide, so the curving ground stretches the lit patch a little more, and near the day–night line part of the beam passes Earth by."
            priority={2}
          />
        ) : (
          <Tag
            pos={v3(target).multiplyScalar(1.12).toArray() as V3}
            text="No noon Sun here"
            note="At this latitude and declination the Sun stays below the horizon all day: polar night."
            occlude={false}
          />
        )}
        <Line
          points={Array.from({ length: 49 }, (_, i) => {
            // The angle between the ground's normal and the sunlight, in the meridian plane.
            const a = ((lat + ((decl - lat) * i) / 48) * Math.PI) / 180;
            return [
              target[0],
              target[1] + Math.sin(a) * 0.42,
              target[2] - Math.cos(a) * 0.42,
            ] as V3;
          })}
          color="#f2d79e"
          lineWidth={1.6}
        />
        <GlowArrow
          from={target}
          to={v3(target).addScaledVector(n, 0.62).toArray() as V3}
          color="#c4ebe2"
        />
        <Tag
          // East of the meridian, which is to the left as the lab opens: clear of the beam
          // labels, which lie toward the Sun on the right.
          pos={
            v3(target)
              .addScaledVector(n, 0.92)
              .add(new THREE.Vector3(0.5, 0, 0))
              .toArray() as V3
          }
          priority={2}
          text={`Normal at ${hemisphere(lat)}`}
          note="The arrow points straight out from the ground at the lit patch (the surface normal). Its angle to the sunlight sets the energy per square meter above the atmosphere; the daily mean also counts the night. Neither value includes clouds or the atmosphere."
          occlude={false}
        />
        <Tag
          pos={
            v3(north)
              // On the side of the globe away from the selected latitude, where it is clear.
              .multiplyScalar(lat > 0 ? -1.3 : 1.3)
              .addScaledVector(sunV, 0.8 * RAY_START)
              .toArray() as V3
          }
          text="Parallel sunlight"
          note="The Sun is about 150 million km away, so its rays reach Earth almost exactly parallel. Every beam of the same cross-section carries the same power: 1361 watts per square meter of cross-section."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div className="text-center text-xs">Daily mean by latitude (W/m²)</div>
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
        {"° from the surface normal"}
        {Math.abs(lat - decl) > 90 ? " (Sun below the horizon at noon)" : ""}
        {". Declination "}
        {decl.toFixed(2)}
        {"°. These are horizontal top-of-atmosphere values at fixed 1 AU."}
        {params.spots > 0.5 ? (
          <span className="mx-auto mt-2 flex max-w-xl items-center gap-3 text-left">
            <img
              src={photo.src}
              srcSet={photoSrcSet(photo.src)}
              sizes="64px"
              alt={photo.alt}
              className="h-16 w-16 shrink-0 rounded object-contain"
            />
            <span>
              {
                "Real SDO image of the Sun, colored orange in processing. Sunspots are cooler, magnetic regions. This switch does not change the calculation, which uses a fixed solar irradiance. "
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
 * A beam of sunlight with a square cross-section, aimed at `target`: a glowing shaft from the
 * Sun's side, the patch of ground it lights, and the same 4 × 4 cells drawn on both, so the
 * stretch shows how the same power spreads over more ground.
 */
function Beam({
  target,
  sun,
  label,
  short,
  note,
  priority,
}: {
  target: V3;
  sun: V3;
  label: string;
  short: string;
  note: string;
  priority: number;
}) {
  const [tx, ty, tz] = target,
    [sx, sy, sz] = sun;
  const parts = useMemo(() => {
    const at: V3 = [tx, ty, tz],
      toward: V3 = [sx, sy, sz],
      points = footprint(at, toward, BEAM, R * 1.004, GRID),
      patch = new THREE.BufferGeometry(),
      index: number[] = [];
    patch.setAttribute("position", new THREE.Float32BufferAttribute(points.flat(), 3));
    for (let j = 0; j < GRID; j++)
      for (let i = 0; i < GRID; i++) {
        const a = j * (GRID + 1) + i;
        index.push(a, a + 1, a + GRID + 2, a, a + GRID + 2, a + GRID + 1);
      }
    patch.setIndex(index);
    // Cell lines on the ground, then the same cells across the top of the shaft.
    const { north, east } = beamAxes(toward),
      lines: number[] = [],
      step = GRID / CELLS,
      lift = (p: V3) => p.map((v) => v * 1.002);
    for (let k = 0; k <= CELLS; k++)
      for (let m = 0; m < GRID; m++) {
        const row = k * step * (GRID + 1);
        lines.push(...lift(points[row + m]), ...lift(points[row + m + 1]));
        lines.push(
          ...lift(points[m * (GRID + 1) + k * step]),
          ...lift(points[(m + 1) * (GRID + 1) + k * step]),
        );
      }
    const top = v3(at).addScaledVector(v3(toward), SHAFT),
      corner = (u: number, v: number) =>
        top
          .clone()
          .addScaledVector(v3(east), u * BEAM)
          .addScaledVector(v3(north), v * BEAM);
    for (let k = 0; k <= CELLS; k++) {
      const f = k / CELLS - 0.5;
      lines.push(...corner(f, -0.5).toArray(), ...corner(f, 0.5).toArray());
      lines.push(...corner(-0.5, f).toArray(), ...corner(0.5, f).toArray());
    }
    // The shaft's long edges, from the top down to the ground, drawn as bright lines.
    const edges = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ].map(([u, v]) => {
      const end = corner(u, v);
      return [
        end.toArray() as V3,
        rayHit(
          toward,
          v3(at).projectOnPlane(v3(toward)).add(end.clone().sub(top)).toArray() as V3,
          R,
        ),
      ];
    });
    const cells = new THREE.BufferGeometry();
    cells.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    const shaft = {
      center: v3(at)
        .addScaledVector(v3(toward), SHAFT / 2 - 0.08)
        .toArray() as V3,
      q: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), v3(toward)),
    };
    return {
      patch,
      cells,
      shaft,
      edges,
      labelAt: top.addScaledVector(v3(toward), 0.42).toArray() as V3,
    };
  }, [tx, ty, tz, sx, sy, sz]);
  useLayoutEffect(
    () => () => {
      parts.patch.dispose();
      parts.cells.dispose();
    },
    [parts],
  );
  return (
    <group>
      <mesh position={parts.shaft.center} quaternion={parts.shaft.q} raycast={() => null}>
        <boxGeometry args={[BEAM, SHAFT + 0.16, BEAM]} />
        <meshBasicMaterial
          color="#ffc861"
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh geometry={parts.patch} raycast={() => null}>
        <meshBasicMaterial
          color="#ffd47e"
          transparent
          opacity={0.72}
          side={THREE.DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {parts.edges.map((edge, i) => (
        <Line key={i} points={edge} color="#ffe2a0" lineWidth={1.3} transparent opacity={0.9} />
      ))}
      <lineSegments geometry={parts.cells}>
        <lineBasicMaterial color="#fff2cf" transparent opacity={0.8} toneMapped={false} />
      </lineSegments>
      <Tag
        pos={parts.labelAt}
        text={label}
        short={short}
        note={note}
        priority={priority}
        occlude={false}
      />
    </group>
  );
}

/** Parallel rays of sunlight, ending where they reach the ground; none crosses a beam. */
function SunRays({ sun, clear }: { sun: V3; clear: number[] }) {
  const { north } = beamAxes(sun),
    offsets = [-1.12, -0.74, -0.37, 0, 0.37, 0.74, 1.12].filter((o) =>
      clear.every((c) => Math.abs(o - c) > BEAM / 2 + 0.12),
    );
  // Left out of the framing: the rays run on toward the Sun beyond the edge of the view.
  return (
    <group userData={{ noFit: true }}>
      {offsets.map((o) => {
        const across = v3(north).multiplyScalar(o),
          start = across.clone().addScaledVector(v3(sun), RAY_START).toArray() as V3,
          end = rayHit(sun, across.toArray() as V3, R * 1.01);
        return <GlowArrow key={o} from={start} to={end} color="#f7d38a" thin />;
      })}
    </group>
  );
}

/** An arrow drawn in its own light, for scenes lit only by the Sun's shader. */
function GlowArrow({
  from,
  to,
  color,
  thin = false,
}: {
  from: V3;
  to: V3;
  color: string;
  thin?: boolean;
}) {
  const a = v3(from),
    b = v3(to),
    length = a.distanceTo(b),
    q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    ),
    head = thin ? 0.09 : 0.12,
    radius = thin ? 0.026 : 0.04,
    shaft = thin ? 0.006 : 0.014;
  if (length < head) return null;
  return (
    <group position={a} quaternion={q}>
      <mesh position={[0, (length - head) / 2, 0]} scale={[shaft, length - head, shaft]}>
        <cylinderGeometry args={[1, 1, 1, 10]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, length - head / 2, 0]} scale={[radius, head, radius]}>
        <coneGeometry args={[1, 1, 18]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}
