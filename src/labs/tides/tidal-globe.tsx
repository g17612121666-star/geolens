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

function PotentialEnvelope({ radius, moon }: { radius: number; moon: [number, number, number] }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius, 128, 96), [radius]),
    rest = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);
  useLayoutEffect(() => {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n: [number, number, number] = [rest[i * 3], rest[i * 3 + 1], rest[i * 3 + 2]],
        scale = 1.14 + 0.07 * tidalPotential(n, moon);
      p.setXYZ(i, n[0] * scale, n[1] * scale, n[2] * scale);
    }
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }, [geometry, rest, moon]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <FlowWaterMaterial color="#7cc7e2" opacity={0.26} flow={[0, 0]} roughness={0.23} />
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
      r = radius * (1.14 + 0.07 * tidalPotential(n, moon));
    return [n[0] * r, 0, n[2] * r] as [number, number, number];
  });
  return (
    <>
      <ScienceStudio
        slug="tides"
        camera={[2.6, 4.3, 7]}
        lights={false}
        space
        scale="Earth–Moon sizes enlarged · blue surface is exaggerated tidal potential"
        trueScale="Earth–Moon sizes and separation share one scale · potential symbol remains enlarged"
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
          note="The potential envelope combines lunar and solar quadrupole terms. The Moon changes its direction relative to the Sun through an ideal synodic month."
          occlude={false}
        />
        <Tag
          pos={[-1.4, -1.35, 0]}
          text="Two tidal lobes"
          note="Blue is an enlarged, offset surface representing gravitational tidal potential, not an actual shell of ocean or a predicted water height. Ocean basins, inertia, friction and coastlines determine local tide times and ranges."
          occlude={false}
        />
        <group position={[3.95, 0.6, 0]}>
          <StarMesh radius={0.26} />
        </group>
        <Tag
          pos={[3.95, 1.15, 0]}
          text="Sun direction"
          note="The solar potential term remains fixed in this Sun-relative view. New and full Moon reinforce the lunar and solar patterns; at quarters they partly oppose."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Day "}
        {(t * 29.53059).toFixed(1)} {"of an ideal synodic month · "}
        {(fraction * 100).toFixed(1)}
        {"% illuminated · Moon "}
        {(distance / 1000).toFixed(1)} {"thousand km away."}
        <br />
        <span className="formula">{"Lunar tidal strength ∝ 1/r³"}</span>
        {
          "; solar contribution 0.46 at mean lunar distance. Earth rotates while the potential follows the Moon–Sun geometry. No tide times, flood heights or coast-specific forecast."
        }
      </ScienceReadout>
    </>
  );
}
