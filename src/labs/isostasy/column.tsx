import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { isostaticColumn, AIRY } from "@/lib/isostasy-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { fbm } from "../shared/hazard-utils";
import { FlowWaterMaterial } from "../shared/flow-water";

const W = 6,
  D = 3.4,
  SCALE = 1 / 10000,
  RX = 1.75,
  RZ = 2.7;

/** Ice thickness in metres: a dome whose cross-section follows a parabolic ice-sheet profile. */
const iceAt = (x: number, z: number, peak: number) =>
  peak * Math.sqrt(Math.max(0, 1 - (x / RX) ** 2 - (z / RZ) ** 2));

/** Crust and mantle in section; the Moho lies one crustal thickness below the local surface. */
const ROCK_GLSL = `uniform float uCrust,uTopBare,uDepress,uPeak;
float surfaceAt(vec3 w){
  float ice=uPeak*sqrt(max(0.,1.-sq(w.x/${RX.toFixed(2)})-sq(w.z/${RZ.toFixed(2)})));
  return uTopBare-ice*uDepress;
}
vec3 sectionColour(vec3 p,vec3 w){
  float below=surfaceAt(w)-w.y,g=grain(w.xy+w.zy);
  vec3 c;
  if(below<.06)c=mix(vec3(.55,.45,.34),vec3(.46,.37,.28),g);
  else if(below<uCrust*.46)c=mix(vec3(.74,.60,.55),vec3(.60,.50,.48),g);
  else if(below<uCrust)c=mix(vec3(.50,.51,.55),vec3(.40,.42,.46),g);
  else{
    float flow=sFbm(vec2(w.x*1.2,w.y*3.));
    c=mix(vec3(.50,.57,.38),vec3(.38,.45,.28),flow*.7+g*.3);
  }
  float b=min(abs(below-uCrust*.46),abs(below-uCrust));
  return c*mix(.6,1.,smoothstep(0.,.015,b));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/** Ice in section: annual layers parallel to the bed, bluer with depth. */
const ICE_GLSL = `uniform float uTopBare,uDepress,uPeak,uLift;
vec3 sectionColour(vec3 p,vec3 w){
  float thick=uPeak*sqrt(max(0.,1.-sq(w.x/${RX.toFixed(2)})-sq(w.z/${RZ.toFixed(2)})));
  float bed=uTopBare-thick*uDepress, h=w.y-bed;
  if(thick<=0.||h<.02)return vec3(-1.);
  float layer=step(.5,fract(h*55.+.3*sin(w.x*4.)));
  vec3 deep=vec3(.55,.74,.84),fresh=vec3(.93,.96,.98);
  return mix(deep,fresh,smoothstep(0.,thick*uLift,h))*mix(.93,1.,layer);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

export default function Isostasy() {
  const { params, trueScale } = useLabControls(),
    ice = params.ice ?? 1650,
    result = isostaticColumn(ice),
    bare = isostaticColumn(0),
    exaggeration = trueScale ? 1 : 5;
  const topBare = bare.landElevation * SCALE,
    crust = AIRY.crustThickness * SCALE,
    base = topBare - crust - 1.4,
    depressPerMetre = (AIRY.iceDensity / AIRY.mantleDensity) * exaggeration * SCALE;
  const ground = useMemo(
    () => (x: number, z: number) =>
      topBare -
      iceAt(x, z, ice) * depressPerMetre +
      0.035 * (fbm(x * 1.3 + 2, z * 1.3) - 0.5) +
      // Terminal moraine just beyond the ice margin.
      0.03 * Math.exp(-(((Math.hypot(x / RX, z / RZ) - 1.06) / 0.035) ** 2)),
    [ice, topBare, depressPerMetre],
  );
  const rock = useMemo(() => {
    const g = terrainBlockGeometry(ground, W, D, 180, base),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        e = Math.hypot(x / RX, z / RZ),
        n = fbm(x * 3 + 1, z * 3);
      col.set("#58704a").lerp(tone.set("#7c8a58"), n);
      col.lerp(tone.set("#9b927d"), 1 - THREE.MathUtils.smoothstep(e, 1.0, 1.35));
      if (e < 1) col.set("#7a7468");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [ground, base]);
  useEffect(() => () => rock.dispose(), [rock]);
  // Ice: a surface over the dome plus vertical faces where the block cuts it.
  const iceBody = useMemo(() => {
    if (ice <= 0) return null;
    const g = terrainBlockGeometry(
      (x, z) => {
        const h = iceAt(x, z, ice);
        return h > 0 ? ground(x, z) + h * exaggeration * SCALE : ground(x, z) - 0.002;
      },
      W,
      D,
      180,
      base + 0.01,
    );
    return g;
  }, [ice, ground, exaggeration, base]);
  useEffect(() => () => iceBody?.dispose(), [iceBody]);
  const rockUniforms = useSectionUniforms({
    uCrust: crust,
    uTopBare: topBare,
    uDepress: depressPerMetre,
    uPeak: ice,
  });
  const iceUniforms = useSectionUniforms({
    uTopBare: topBare,
    uDepress: depressPerMetre,
    uPeak: ice,
    uLift: exaggeration * SCALE,
  });
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 120 && i < 1500; i++) {
      const x = -W / 2 + 0.08 + (W - 0.16) * ((i * 0.618034) % 1),
        z = -D / 2 + 0.08 + (D - 0.16) * ((i * 0.7548777) % 1);
      if (Math.hypot(x / RX, z / RZ) > 1.3 && fbm(x * 2.5, z * 2.5) > 0.45)
        out.push([x, ground(x, z) - 0.004, z]);
    }
    return out;
  }, [ground]);
  const lakes = useMemo(
    () =>
      ice > 200
        ? ([
            [-RX * 1.17, 0.35],
            [RX * 1.15, -0.5],
          ] as [number, number][])
        : [],
    [ice],
  );
  const centre = ground(0, D / 2),
    iceTop = centre + ice * exaggeration * SCALE;
  return (
    <>
      <ScienceStudio
        slug="isostasy"
        scale="Ice load and vertical displacement ×5 · local Airy equilibrium · width and margin shape schematic"
        trueScale="All heights share a scale · 1 scene unit = 10 km vertically"
        camera={[2.4, 5.2, 6.4]}
      >
        <mesh geometry={rock} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
          <SectionMaterial
            attach="material-1"
            glsl={ROCK_GLSL}
            uniforms={rockUniforms}
            cacheKey="isostasy-rock-v1"
          />
        </mesh>
        {iceBody && (
          <mesh geometry={iceBody} castShadow receiveShadow>
            <meshPhysicalMaterial
              attach="material-0"
              color="#eef5f8"
              roughness={0.35}
              clearcoat={0.4}
              transparent
              opacity={0.97}
            />
            <SectionMaterial
              attach="material-1"
              glsl={ICE_GLSL}
              uniforms={iceUniforms}
              cacheKey="isostasy-ice-v1"
              roughness={0.3}
            />
          </mesh>
        )}
        {lakes.map(([x, z], i) => (
          <mesh key={i} position={[x, ground(x, z) + 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 32]} />
            <FlowWaterMaterial color="#2f6f86" opacity={0.9} flow={[0.2, 0.1]} speed={0.3} />
          </mesh>
        ))}
        <PlantStand kind="conifer" positions={trees} scale={0.1} seed={21} />
        <Line
          points={[
            [-W / 2, topBare, D / 2 + 0.01],
            [W / 2, topBare, D / 2 + 0.01],
          ]}
          color="#f3efe2"
          lineWidth={1.4}
          dashed
          dashSize={0.08}
          gapSize={0.05}
        />
        <Line
          points={[
            [-W / 2, topBare - crust, D / 2 + 0.01],
            [W / 2, topBare - crust, D / 2 + 0.01],
          ]}
          color="#f3efe2"
          lineWidth={1}
          dashed
          dashSize={0.08}
          gapSize={0.05}
        />
        {ice > 0 && (
          <>
            <Arrow
              from={[0.35, topBare + 0.02, D / 2 + 0.06]}
              to={[0.35, centre, D / 2 + 0.06]}
              color="#e4b77c"
              width={0.6}
            />
            {[-1, 1].map((side) => (
              <Arrow
                key={side}
                from={[side * 0.4, topBare - crust - 0.35, D / 2 + 0.06]}
                to={[side * 1.5, topBare - crust - 0.35, D / 2 + 0.06]}
                color="#c9d6a2"
                width={0.7}
              />
            ))}
          </>
        )}
        <Tag
          pos={[-2.2, topBare - crust - 0.55, D / 2 + 0.05]}
          text="Mantle · solid, creeping"
          note="Under the extra weight the mantle slowly flows aside while remaining solid. The arrows show the direction of that creep, not its speed."
          occlude={false}
        />
        <Tag
          pos={[2.2, topBare - crust + 0.12, D / 2 + 0.05]}
          text="Moho bends down"
          note="The crust keeps its thickness, so its base (the Moho) is pushed down by the same amount as the surface. Dashed lines show both levels without ice."
          occlude={false}
        />
        <Tag
          pos={[0, iceTop + 0.35, 0]}
          text={`${Math.round(ice)} m of ice`}
          note="Each column sinks by the ice thickness × 917/3300 (ice density ÷ mantle density). Real adjustment takes thousands of years and spreads sideways as the lithosphere bends."
          occlude={false}
        />
        {lakes.length > 0 && (
          <Tag
            pos={[lakes[0][0], ground(lakes[0][0], lakes[0][1]) + 0.3, lakes[0][1]]}
            text="Meltwater lake"
            tone="glacier"
            note="Meltwater collects in the depressed ground near the ice margin, behind moraines. When the ice melts the land slowly rebounds."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {"Ice "}
        {Math.round(ice)} {"m → equilibrium depression "}
        {result.depression.toFixed(0)}{" "}
        {"m at the centre. Mantle / crust / ice densities: 3300 / 2800 / 917 kg/m³."}
        <br />
        {
          "Each column keeps its rock thickness and mass, so thicker ice pushes it further down. Unloading raises the equilibrium position; this static experiment does not predict rebound timing or global sea level."
        }
      </ScienceReadout>
    </>
  );
}
