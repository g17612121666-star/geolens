import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, Atmosphere } from "@/components/globe/earth";
import { StarMesh } from "@/components/globe/star";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { LUNAR, lunarPosition, illuminatedFraction } from "@/lib/lunar-science";
import { LunarSurface } from "../shared/lunar-model";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { Tag } from "../shared/kit";
import { tidalPotential } from "./tidal-potential";

/** Display only: the tidal surface is drawn at radius × (BASE + GAIN × potential), hugely exaggerated. */
const BASE = 1.12,
  GAIN = 0.14,
  /** Equatorial potential range at spring (Sun–Moon aligned) and neap (at right angles). */
  SPRING_RANGE = 2.19,
  NEAP_RANGE = 0.81;

function PotentialEnvelope({ radius, moon }: { radius: number; moon: [number, number, number] }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 128, 96), [radius]),
    rest = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);
  useLayoutEffect(() => {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n: [number, number, number] = [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]],
        scale = BASE + GAIN * tidalPotential(n, moon);
      p.setXYZ(i, n[0] * scale, n[1] * scale, n[2] * scale);
    }
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [geometry, rest, moon]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <FlowWaterMaterial color="#7cc7e2" opacity={0.4} flow={[0, 0]} roughness={0.23} />
    </mesh>
  );
}
export default function Tides() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 32);
  const distance = params.distance ?? LUNAR.distance,
    node = params.node ?? 60,
    aligned = params.align > 0.5,
    moon = lunarPosition(t, node, aligned, distance),
    position = moon.map((v) => (v * 2.8) / distance) as [number, number, number],
    radius = trueScale ? (2.8 * LUNAR.earth) / distance : 0.92,
    fraction = illuminatedFraction(moon);
  const phase =
    fraction < 0.01
      ? "New Moon"
      : fraction > 0.99
        ? "Full Moon"
        : Math.abs(fraction - 0.5) < 0.04
          ? "Quarter Moon"
          : fraction < 0.5
            ? "Crescent Moon"
            : "Gibbous Moon";
  const trace = Array.from({ length: 193 }, (_, i) => {
    const a = (i / 192) * Math.PI * 2,
      n: [number, number, number] = [Math.cos(a), 0, Math.sin(a)],
      r = radius * (BASE + GAIN * tidalPotential(n, moon));
    return [n[0] * r, 0, n[2] * r] as [number, number, number];
  });
  const potentials = trace.map((p) => tidalPotential([p[0], 0, p[2]], moon)),
    range = Math.max(...potentials) - Math.min(...potentials),
    springness = (range - NEAP_RANGE) / (SPRING_RANGE - NEAP_RANGE),
    tideState =
      springness > 0.85
        ? "spring tides (largest range)"
        : springness < 0.15
          ? "neap tides (smallest range)"
          : "between spring and neap";
  const moonLength = Math.hypot(...moon),
    farLobe = moon.map((v) => (-v / moonLength) * radius * (BASE + GAIN * 1.2)) as [
      number,
      number,
      number,
    ];
  return (
    <>
      <ScienceStudio
        slug="tides"
        camera={[2, 6.6, 5]}
        lights={false}
        space
        scale="Earth and Moon enlarged · blue surface shows the tidal effect, greatly exaggerated"
        trueScale="Earth–Moon sizes and separation share one scale · blue tidal surface still exaggerated"
      >
        <directionalLight position={[10, 3, 2]} intensity={3} />
        <ambientLight intensity={0.16} />
        <group rotation={[0, t * 29.53059 * Math.PI * 2, 0]}>
          <EarthMesh radius={radius} sunDirection={new THREE.Vector3(1, 0.15, 0)} />
        </group>
        {!trueScale && <Atmosphere radius={radius * 1.03} />}
        <PotentialEnvelope radius={radius} moon={moon} />
        <Line points={trace} color="#a5dce6" lineWidth={2} />
        <Line
          points={Array.from(
            { length: 193 },
            (_, i) =>
              lunarPosition(i / 192, node, aligned, distance).map((v) => (v * 2.8) / distance) as [
                number,
                number,
                number,
              ],
          )}
          color="#8aa3aa"
          lineWidth={1.3}
        />
        <LunarSurface
          position={position}
          radius={(radius * LUNAR.moon) / LUNAR.earth}
          angle={t * Math.PI * 2}
        />
        <Line
          points={[[0, 0, 0], position]}
          color="#749fac"
          transparent
          opacity={0.35}
          dashed
          dashSize={0.07}
          gapSize={0.06}
        />
        <Tag
          pos={[position[0], position[1] + radius * 0.4 + 0.22, position[2]]}
          text={phase}
          note="The blue surface adds the Moon's and the Sun's tidal effects. Over one synodic month the Moon's direction changes relative to the Sun."
          occlude={false}
        />
        <Tag
          pos={[farLobe[0], farLobe[1] - radius * 0.35, farLobe[2]]}
          text="Two tidal lobes"
          note="The blue surface is an enlarged picture of the tide-raising effect, not a layer of ocean or a predicted water height. Ocean basins, friction and coastlines set real tide times and ranges."
          occlude={false}
        />
        <group position={[3.95, 0.6, 0]}>
          <StarMesh radius={0.26} />
        </group>
        <Tag
          pos={[3.95, 1.15, 0]}
          text="Sun direction"
          note="The Sun stays in one direction in this view. At new and full Moon the lunar and solar effects add; at the quarters they partly cancel."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Day "}
        {(t * 29.53059).toFixed(1)} {"of an ideal synodic month · "}
        {(fraction * 100).toFixed(1)}
        {"% illuminated · "}
        {tideState}
        {" · relative equatorial range "}
        {range.toFixed(2)} {"(spring 2.19, neap 0.81) · Moon "}
        {(distance / 1000).toFixed(1)} {"thousand km away."}
        <br />
        <span className="formula">{"Lunar tidal strength ∝ 1/r³"}</span>
        {
          "; the Sun's effect is 0.46 of the Moon's at mean distance. Earth rotates beneath a pattern that follows the Moon and Sun. This is not a forecast of tide times or heights."
        }
      </ScienceReadout>
    </>
  );
}
