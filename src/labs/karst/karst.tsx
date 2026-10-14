import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import {
  GeomorphicTerrain,
  WaterRibbon,
  GrassPatch,
  DebrisField,
} from "../shared/geomorphic-terrain";
import { RockPrism } from "../shared/rock-prism";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { PhotographicRockMaterial } from "../shared/photographic-rock";
import { karstRoof, karstSlab, caveFloor, caveCeiling } from "./geometry";
function Limestone() {
  return (
    <PhotographicRockMaterial
      tint="#efece2"
      desaturate={0.9}
      wet={false}
      sceneScale={8}
      exposure={1.85}
    />
  );
}
function Slab({
  upper,
  lower,
}: {
  upper: (x: number, z: number) => number;
  lower: (x: number, z: number) => number;
}) {
  const g = useMemo(() => karstSlab(upper, lower), [upper, lower]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} castShadow receiveShadow>
      <Limestone />
    </mesh>
  );
}
const base = () => -1.1;
const rand = (i: number) => {
  const n = Math.sin(i * 73.173 + 41.7) * 43758.5453;
  return n - Math.floor(n);
};
export default function Karst() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const cut = params.cutaway > 0.5,
    opening = params.joint ?? 0.06,
    v = trueScale ? 1 : 1.3;
  const colour = useMemo(() => () => "#9caaa2", []);
  const roof = useMemo(() => (x: number, z: number) => karstRoof(x, z, opening), [opening]);
  const flow = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1, 1.3, 0),
        new THREE.Vector3(-0.85, 0.93, 0),
        new THREE.Vector3(-0.65, 0.42, 0),
        new THREE.Vector3(0.4, 0.2, 0),
        new THREE.Vector3(1.6, 0.08, 0),
        new THREE.Vector3(3, -0.05, 0),
      ])
        .getPoints(140)
        .map((a) => a.toArray() as [number, number, number]),
    [],
  );
  const river = useMemo(
    () =>
      Array.from({ length: 101 }, (_, i) => {
        const x = -2.7 + (i / 100) * 5.7;
        return [x, caveFloor(x, 0.02) + 0.016, 0.02] as [number, number, number];
      }),
    [],
  );
  return (
    <>
      <ScienceStudio
        slug="karst"
        camera={[4.5, 3.8, 7]}
        scale="Selected 60 × 30 m limestone block · relief ×1.3 · joints enlarged"
        trueScale="1 scene unit = 10 m · common geometric scale · joints, tracers and vegetation enlarged"
      >
        <group scale={[1, v, 1]}>
          <Slab upper={roof} lower={caveCeiling} />
          <Slab upper={caveFloor} lower={base} />
          <mesh position={[0, 0.34, -1.45]}>
            <boxGeometry args={[6, 1.1, 0.1]} />
            <Limestone />
          </mesh>
          {!cut && (
            <mesh position={[0, 0.34, 1.45]}>
              <boxGeometry args={[6, 1.1, 0.1]} />
              <Limestone />
            </mesh>
          )}
          <WaterRibbon path={river} width={0.14} />
          {cut && (
            <>
              <Line
                points={flow}
                color="#85bdc5"
                lineWidth={1.4}
                dashed
                dashSize={0.08}
                gapSize={0.07}
              />
              {Array.from({ length: 16 }, (_, i) => {
                const a = flow[Math.floor(((t + i / 16) % 1) * (flow.length - 1))];
                return (
                  <mesh key={i} position={a}>
                    <sphereGeometry args={[0.026, 8, 6]} />
                    <meshBasicMaterial color="#b9e2df" />
                  </mesh>
                );
              })}
              {[0.3, 1.2, 2.1].map((x, i) => {
                const length = 0.29 + i * 0.035,
                  ceiling = caveCeiling(x, -0.42),
                  floor = caveFloor(x, -0.42),
                  profile = Array.from({ length: 33 }, (_, j) => {
                    const u = j / 32;
                    return new THREE.Vector2(
                      0.008 + 0.06 * (1 - u) ** 1.7 * (1 + 0.065 * Math.sin(j * 2.1)),
                      u * length,
                    );
                  });
                return (
                  <group key={x}>
                    <mesh position={[x, ceiling, -0.42]} rotation={[0, 0, Math.PI]}>
                      <latheGeometry args={[profile, 32]} />
                      <Limestone />
                    </mesh>
                    <mesh position={[x, floor, -0.42]}>
                      <latheGeometry args={[profile, 32]} />
                      <Limestone />
                    </mesh>
                    <mesh
                      position={[
                        x,
                        ceiling -
                          length -
                          ((t * 3 + i * 0.2) % 1) * Math.max(0, ceiling - floor - 2 * length),
                        -0.42,
                      ]}
                    >
                      <sphereGeometry args={[0.013, 10, 8]} />
                      <meshPhysicalMaterial color="#a5d8df" roughness={0.12} />
                    </mesh>
                  </group>
                );
              })}
              <DebrisField
                points={Array.from({ length: 48 }, (_, i) => {
                  const x = -2.8 + rand(i) * 5.5,
                    z = -1.25 + rand(i + 61) * 2.4;
                  return [x, caveFloor(x, z) + 0.02, z];
                })}
                size={0.034}
                color="#969a8a"
              />
              <Tag
                pos={[0.8, 0.5, 1.7]}
                text="Cave passage"
                note="A selected open passage lies within soluble rock. Dissolution can enlarge fractures and bedding-plane openings. Most of the landscape remains rock; it is not a hollow underground lake. Cave networks can be much more complex."
                occlude={false}
              />
            </>
          )}
          <GrassPatch
            positions={Array.from({ length: 90 }, (_, i) => {
              const x = -2.8 + rand(i + 97) * 5.6,
                z = -1.35 + rand(i + 181) * 2.7;
              return [x, roof(x, z) + 0.002, z] as [number, number, number];
            }).filter(([x, y, z]) => y < 1.72 && Math.abs(x + 1) > 0.5)}
            height={0.07}
          />
          <Tag
            pos={[-2.1, 2.25, -0.9]}
            text="Clints and grykes"
            note="Clints are limestone blocks; grykes are enlarged fissures between them. Joint opening is exaggerated for inspection and changes a chosen geometry, not a calculated dissolution rate."
            occlude={false}
          />
          <Tag
            pos={[-0.6, 2.2, 0.8]}
            text="Doline"
            note="This surface depression is a solutional sinkhole example. Other sinkholes involve subsidence or collapse. Water can enter connected fractures and underground drainage; not all depressions open directly into a large cave."
            occlude={false}
          />
          <Tag
            pos={[3.1, 0.25, 0.7]}
            text="Spring"
            note="Groundwater emerges where the connected drainage intersects the land surface. The route is schematic; it does not calculate hydraulic head, transit time or contaminant transport."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">{"CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻."}</span>{" "}
        {"Water containing dissolved CO₂ can dissolve calcite and enlarge connected openings."}
        <br />
        {cut
          ? "Cutaway exposes a selected passage and enlarged flow tracers."
          : "The front rock face hides the passage; enable Cutaway to inspect it."}{" "}
        {"Calcite can precipitate from cave water where carbon dioxide escapes."}
      </ScienceReadout>
    </>
  );
}
