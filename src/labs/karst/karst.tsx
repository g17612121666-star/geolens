import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { WaterRibbon, GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";
import { landscapeNoise as noise } from "../shared/landscape-noise";
import { karstRoof, karstSlab, karstTop, caveFloor, caveCeiling } from "./geometry";

/** Bedded limestone on every cut, wall and roof; upward-facing ground keeps its own colour. */
const LIMESTONE = cliffFaceGlsl({ rock: "limestone", beds: 3.4, bedOffset: 0.15 });
function Limestone({ ground = "#c8c4b8", vertexColors = false }) {
  return (
    <SectionMaterial
      glsl={LIMESTONE}
      cliff={0.55}
      cacheKey="karst-limestone"
      color={vertexColors ? "#ffffff" : ground}
      vertexColors={vertexColors}
      roughness={0.85}
    />
  );
}
const PAVEMENT = new THREE.Color("#c9c6bb"),
  LICHEN = new THREE.Color("#a9a99a"),
  MOSS = new THREE.Color("#68783f"),
  TURF = new THREE.Color("#7f9a55"),
  CAVE_MUD = new THREE.Color("#7f7464"),
  WET = new THREE.Color("#6d675d");
function Slab({
  upper,
  lower,
  cave = false,
}: {
  upper: (x: number, z: number) => number;
  lower: (x: number, z: number) => number;
  cave?: boolean;
}) {
  const g = useMemo(() => {
    const g = karstSlab(upper, lower),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      top = p.count / 2;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (cave) {
        // Cave floor: wet silt and gravel, darker where the stream runs.
        col.copy(CAVE_MUD).lerp(WET, Math.exp(-((z / 0.25) ** 2)));
      } else if (i < top) {
        // Pavement: pale clints with lichen; moss and turf in grykes and the doline.
        const gryke = THREE.MathUtils.smoothstep(karstTop(x, z) - y, 0.02, 0.12),
          doline = Math.exp(-((x + 1) ** 2 + z * z) / 0.3);
        col.copy(PAVEMENT).lerp(LICHEN, noise(x * 6, z * 6) * 0.6);
        col.lerp(MOSS, gryke * 0.8).lerp(TURF, THREE.MathUtils.smoothstep(doline, 0.25, 0.6));
      } else col.copy(PAVEMENT);
      col.multiplyScalar(0.94 + 0.12 * noise(x * 14, z * 14));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [upper, lower, cave]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g} castShadow receiveShadow>
      <Limestone vertexColors />
    </mesh>
  );
}
/** Flowstone: calcite deposited from dripping water, creamy and slightly translucent. */
function Flowstone() {
  return <meshPhysicalMaterial color="#e3d6b8" roughness={0.35} clearcoat={0.4} sheen={0.2} />;
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
        horizon
        slug="karst"
        camera={[4.5, 3.8, 7]}
        scale="60 × 30 m limestone block · relief ×1.3 · joints enlarged"
        trueScale="1 scene unit = 10 m · common geometric scale · joints, tracers and vegetation enlarged"
      >
        <group scale={[1, v, 1]}>
          <Slab upper={roof} lower={caveCeiling} />
          <Slab upper={caveFloor} lower={base} cave />
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
              {(
                [
                  [-1.7, -0.6],
                  [-0.9, -0.75],
                  [0.3, -0.42],
                  [0.75, -0.9],
                  [1.2, -0.42],
                  [1.65, -0.8],
                  [2.1, -0.42],
                  [2.55, -0.7],
                ] as [number, number][]
              ).map(([x, z], i) => {
                const length = 0.2 + 0.05 * (i % 4),
                  ceiling = caveCeiling(x, z),
                  floor = caveFloor(x, z),
                  profile = Array.from({ length: 33 }, (_, j) => {
                    const u = j / 32;
                    return new THREE.Vector2(
                      0.008 + 0.06 * (1 - u) ** 1.7 * (1 + 0.065 * Math.sin(j * 2.1)),
                      u * length,
                    );
                  });
                return (
                  <group key={i}>
                    <mesh position={[x, ceiling, z]} rotation={[0, 0, Math.PI]}>
                      <latheGeometry args={[profile, 32]} />
                      <Flowstone />
                    </mesh>
                    <mesh position={[x, floor, z]}>
                      <latheGeometry args={[profile, 32]} />
                      <Flowstone />
                    </mesh>
                    <mesh
                      position={[
                        x,
                        ceiling -
                          length -
                          ((t * 3 + i * 0.2) % 1) * Math.max(0, ceiling - floor - 2 * length),
                        z,
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
                note="One open passage in soluble limestone. Dissolution widens joints and bedding planes into passages. Most of the block is still solid rock, not a hollow underground lake; real cave networks are far more complex."
                occlude={false}
              />
            </>
          )}
          <GrassPatch
            positions={Array.from({ length: 90 }, (_, i) => {
              const x = -2.8 + rand(i + 97) * 5.6,
                z = -1.35 + rand(i + 181) * 2.7;
              return [x, roof(x, z) + 0.002, z] as [number, number, number];
            }).filter(([x, y]) => y < 1.72 && Math.abs(x + 1) > 0.5)}
            height={0.07}
          />
          <Tag
            pos={[-2.1, 2.25, -0.9]}
            text="Clints and grykes"
            note="Clints are limestone blocks; grykes are the widened joints between them. Joint opening exaggerates the gryke width so you can see it; it is not a calculated dissolution rate."
            occlude={false}
          />
          <Tag
            pos={[-0.6, 2.2, 0.8]}
            text="Doline"
            note="This surface hollow is a solution doline (sinkhole). Other sinkholes form by subsidence or collapse. Water drains into connected fractures; not every hollow opens straight into a large cave."
            occlude={false}
          />
          <Tag
            pos={[3.1, 0.25, 0.7]}
            text="Spring"
            note="Underground water returns to the surface here (a resurgence). The route is schematic; flow speed and travel time are not calculated."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">{"CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻."}</span>{" "}
        {"Water containing dissolved CO₂ can dissolve calcite and enlarge connected openings."}
        <br />
        {cut
          ? "Cutaway reveals the cave passage; flow tracers are enlarged."
          : "The front rock face hides the passage; switch on Cutaway to see it."}{" "}
        {"Calcite can precipitate from cave water where carbon dioxide escapes."}
      </ScienceReadout>
    </>
  );
}
