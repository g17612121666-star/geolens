import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { WaterRibbon, GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";
import { landscapeNoise as noise } from "../shared/landscape-noise";
import {
  BLOCK,
  CUT,
  DOLINE,
  caveCeiling,
  caveFloor,
  karstRoof,
  karstSlab,
  karstTop,
  passageHalfWidth,
  passageZ,
} from "./geometry";

/**
 * Massive, thick-bedded limestone on every cut, wall and roof: beds of uneven thickness parted by
 * thin dark shale, joints that run straight through several beds, and rain-water stains.
 */
const LIMESTONE = cliffFaceGlsl({
  beds: 3.4,
  bedOffset: 0.15,
  custom: `
  float y=p.y*BEDS+BEDOFF+.07*sNoise(vec2(p.x+p.z,1.)*1.6);
  y+=.3*sin(y*1.3+1.)+.14*sin(y*3.1+2.);
  float i=floor(y),fy=fract(y),h=sHash(vec2(i,5.));
  vec3 c=mix(vec3(.83,.81,.75),vec3(.68,.67,.62),h);
  c*=mix(.9,1.05,g)*mix(.94,1.05,sNoise(vec2(p.x+p.z,p.y)*vec2(2.5,7.)));
  c*=mix(.9,1.05,sNoise(vec2(p.x+p.z,p.y*1.4)*.9))*mix(vec3(1.),vec3(1.02,.99,.93),sNoise(vec2(p.x+p.z,p.y)*1.7+5.));
  float wavy=fy+.12*(sNoise(vec2((p.x+p.z)*3.,i))-.5);
  c=mix(c,vec3(.46,.44,.41),(1.-smoothstep(0.,.035,min(wavy,1.-wavy)))*.7);
  float s=(p.x+p.z)*1.2+.45*sNoise(vec2((p.x+p.z)*.8,7.))+.12*sNoise(vec2(p.y*1.2,4.));
  float cell=floor(s),j=fract(s),grp=floor(y/2.+sHash(vec2(cell,2.))*2.);
  float jw=.012+.014*sHash(vec2(cell,7.));
  c*=1.-.36*step(.45,sHash(vec2(cell,grp)))*(1.-smoothstep(0.,jw,min(j,1.-j)));
  c*=mix(1.,.9,smoothstep(.66,.88,sNoise(vec2((p.x+p.z)*9.,p.y*.7+3.))));
  return c;`,
});
function Limestone({ ground = "#c8c4b8", vertexColors = false }) {
  return (
    <SectionMaterial
      glsl={LIMESTONE}
      cliff={0.55}
      cacheKey="karst-limestone-v2"
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
/** How far into the doline a point lies: 1 at its floor, 0 outside it. */
const inDoline = (x: number, z: number) =>
  Math.exp(-((x - DOLINE.x) ** 2 + (z - DOLINE.z) ** 2) / (DOLINE.radius * 1.15) ** 2);
function Slab({
  upper,
  lower,
  front,
  cave = false,
}: {
  upper: (x: number, z: number) => number;
  lower: (x: number, z: number) => number;
  front: number;
  cave?: boolean;
}) {
  const g = useMemo(() => {
    const g = karstSlab(upper, lower, front),
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
        col
          .copy(CAVE_MUD)
          .lerp(WET, Math.exp(-(((z - passageZ(x)) / (0.35 * passageHalfWidth(x))) ** 2)));
      } else if (i < top) {
        // Pavement: pale clints with lichen; moss and turf in grykes and the doline.
        const gryke = THREE.MathUtils.smoothstep(karstTop(x, z) - y, 0.02, 0.12);
        col.copy(PAVEMENT).lerp(LICHEN, noise(x * 6, z * 6) * 0.6);
        col
          .lerp(MOSS, gryke * 0.8)
          .lerp(TURF, THREE.MathUtils.smoothstep(inDoline(x, z), 0.3, 0.6));
      } else col.copy(PAVEMENT);
      col.multiplyScalar(0.94 + 0.12 * noise(x * 14, z * 14));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [upper, lower, front, cave]);
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
/** A point on the passage floor's center line, lifted by `lift`. */
const alongPassage = (x: number, lift: number) => {
  const z = passageZ(x);
  return [x, caveFloor(x, z) + lift, z] as [number, number, number];
};
/** Stalactites and stalagmites in the chamber, behind the passage's center line. */
const SPELEOTHEMS = Array.from({ length: 11 }, (_, i) => {
  const x = -0.25 + 1.9 * rand(i + 3),
    z = passageZ(x) - (0.15 + 0.55 * rand(i + 41)) * passageHalfWidth(x),
    ceiling = caveCeiling(x, z),
    floor = caveFloor(x, z),
    length = Math.min(0.3, 0.38 * (ceiling - floor)) * (0.6 + 0.4 * rand(i + 77));
  return { x, z, ceiling, floor, length };
}).filter((s) => s.length > 0.06);

export default function Karst() {
  const { params, t, trueScale } = useLabState("params", "t", "trueScale");
  useLabTick(1 / 45);
  const cut = params.cutaway > 0.5,
    opening = params.joint ?? 0.06,
    v = trueScale ? 1 : 1.3,
    front = cut ? CUT : BLOCK.z;
  const roof = useMemo(() => (x: number, z: number) => karstRoof(x, z, opening), [opening]);
  const sink: [number, number, number] = [
    DOLINE.x,
    karstRoof(DOLINE.x, DOLINE.z, opening),
    DOLINE.z,
  ];
  // Water drains from the doline's swallow hole down a shaft to the passage, then follows the
  // passage to the spring.
  const flow = useMemo(() => {
    const shaft = [
      new THREE.Vector3(sink[0], sink[1] + 0.06, sink[2]),
      new THREE.Vector3(sink[0] + 0.05, sink[1] - 0.35, sink[2] + 0.12),
      new THREE.Vector3(...alongPassage(-0.95, 0.25)),
    ];
    const passage = Array.from({ length: 16 }, (_, i) => {
      const x = -0.7 + (i / 15) * 3.85;
      return new THREE.Vector3(...alongPassage(x, 0.1));
    });
    return new THREE.CatmullRomCurve3([...shaft, ...passage])
      .getPoints(160)
      .map((a) => a.toArray() as [number, number, number]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the sink follows the joint opening
  }, [sink[1]]);
  // The route through solid rock from the doline to the passage roof is drawn through the rock
  // (an X-ray line) so students can follow it; inside the open passage it is depth-tested.
  const enter = flow.findIndex(([x, y, z]) => y < caveCeiling(x, z) - 0.02);
  const inRock = flow.slice(0, enter + 1),
    inCave = flow.slice(enter);
  const river = useMemo(
    () => Array.from({ length: 101 }, (_, i) => alongPassage(-2.45 + (i / 100) * 5.45, 0.016)),
    [],
  );
  return (
    <>
      <ScienceStudio
        horizon
        slug="karst"
        camera={[4.6, 3.0, 7.4]}
        scale="60 × 30 m limestone block · relief ×1.3 · joints enlarged"
        trueScale="1 scene unit = 10 m · common geometric scale · joints, tracers and vegetation enlarged"
      >
        <group scale={[1, v, 1]}>
          <Slab upper={roof} lower={caveCeiling} front={front} />
          <Slab upper={caveFloor} lower={base} front={front} cave />
          {/* The swallow hole in the doline floor, where surface water sinks into the rock. */}
          <mesh position={[sink[0], sink[1] + 0.006, sink[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.07, 32]} />
            <meshStandardMaterial
              color="#1d1b19"
              roughness={1}
              polygonOffset
              polygonOffsetFactor={-2}
            />
          </mesh>
          <WaterRibbon path={river} width={0.14} />
          {cut && (
            <>
              <Line
                points={inRock}
                color="#85bdc5"
                lineWidth={2}
                dashed
                dashSize={0.08}
                gapSize={0.07}
                depthTest={false}
                depthWrite={false}
                renderOrder={5}
              />
              <Line
                points={inCave}
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
              {SPELEOTHEMS.map(({ x, z, ceiling, floor, length }, i) => {
                const profile = Array.from({ length: 33 }, (_, j) => {
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
                points={Array.from({ length: 40 }, (_, i) => {
                  const x = -2.3 + rand(i) * 5.2,
                    z = passageZ(x) - (0.3 + 0.6 * rand(i + 61)) * passageHalfWidth(x);
                  return [x, caveFloor(x, z) + 0.02, z];
                })}
                size={0.034}
                color="#969a8a"
              />
              <Tag
                pos={[-1.6, 0.75, CUT + 0.2]}
                text="Cave passage"
                note="One passage, dissolved along a bedding plane in soluble limestone. It narrows to a low crawl, opens into a chamber and leaves the rock at the spring. Most of the block is still solid rock, not a hollow underground lake; real cave networks are far more complex."
                occlude={false}
              />
              <Tag
                pos={[0.7, -0.15, CUT + 0.2]}
                text="Stalactites and stalagmites"
                note="Stalactites hang from the roof and stalagmites grow up from the floor. Dripping water loses carbon dioxide into the cave air, so calcite precipitates. Real ones typically grow only about a centimeter per century; the falling drops are enlarged."
                occlude={false}
              />
            </>
          )}
          <GrassPatch
            positions={Array.from({ length: 90 }, (_, i) => {
              const x = -2.8 + rand(i + 97) * 5.6,
                z = -1.35 + rand(i + 181) * (front + 1.35 - 0.05);
              return [x, roof(x, z) + 0.002, z] as [number, number, number];
            }).filter(([x, y, z]) => y < 1.72 && inDoline(x, z) < 0.5)}
            height={0.07}
          />
          <GrassPatch
            positions={Array.from({ length: 70 }, (_, i) => {
              const a = i * 2.399,
                r = DOLINE.radius * 0.95 * Math.sqrt((i + 0.5) / 70),
                x = DOLINE.x + r * Math.cos(a),
                z = DOLINE.z + r * Math.sin(a);
              return [x, roof(x, z) + 0.002, z] as [number, number, number];
            }).filter(([x, , z]) => Math.hypot(x - sink[0], z - sink[2]) > 0.1)}
            height={0.06}
            color="#7f9a55"
          />
          <Tag
            pos={[1.5, 2.2, -0.5]}
            text="Clints and grykes"
            note="Clints are limestone blocks; grykes are the widened joints between them. Joint opening exaggerates the gryke width so you can see it; it is not a calculated dissolution rate."
            occlude={false}
          />
          <Tag
            pos={[DOLINE.x, 2.25, DOLINE.z]}
            text="Doline"
            note="This surface hollow is a solution doline (sinkhole). Water drains through a swallow hole in its floor into connected fractures. Other sinkholes form by subsidence or collapse, and not every hollow opens straight into a large cave."
            occlude={false}
          />
          <Tag
            pos={[3.1, 0.1, passageZ(3)]}
            text="Spring"
            note="Underground water returns to the surface here (a resurgence). The route is schematic; flow speed and travel time are not calculated."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">{"CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻."}</span>{" "}
        {"Water containing dissolved CO₂ can dissolve calcite and enlarge connected openings."}{" "}
        <br />
        {cut
          ? "Cutaway slices the block open along the cave passage; the dashed water route is schematic and tracers are enlarged."
          : "The rock hides the passage except where it reaches the spring; switch on Cutaway to see it."}{" "}
        {"Calcite can precipitate from cave water where carbon dioxide escapes."}
      </ScienceReadout>
    </>
  );
}
