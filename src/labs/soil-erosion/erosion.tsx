import { Fragment, useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { soilExport } from "@/lib/soil-erosion-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import {
  GeomorphicTerrain,
  WaterRibbon,
  GrassPatch,
  RootNetwork,
  DebrisField,
} from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
/** Topsoil, subsoil and parent material at fixed depths, so a lowered surface eats into the topsoil. */
const PLOT_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float top=.5-.12*p.x,d=top-p.y+.01*(sNoise(vec2(p.x*6.+p.z*4.,1.))-.5);
  float g=grain(vec2(p.x+p.z,p.y));
  vec3 c;
  if(d<.13)c=mix(vec3(.33,.25,.17),vec3(.27,.21,.15),sNoise(vec2(p.x+p.z,p.y)*50.));
  else if(d<.3){
    c=mix(vec3(.58,.44,.30),vec3(.53,.40,.27),g);
    c*=mix(.75,1.,smoothstep(0.,.06,abs(fract((p.x+p.z)*5.+sNoise(vec2(p.y*9.,0.)))-.5)*2.));
  }else{
    float st=smoothstep(.62,.7,sNoise(vec2(p.x+p.z,p.y)*vec2(14.,18.)));
    c=mix(vec3(.70,.62,.49),vec3(.80,.74,.62),st)*mix(.92,1.06,g);
  }
  return c*mix(.82,1.,smoothstep(0.,.006,min(abs(d-.13),abs(d-.3))));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
const RILLS = [-0.62, -0.18, 0.31, 0.7];

function Plot({
  covered,
  wind,
  t,
  x,
  real,
}: {
  covered: boolean;
  wind: boolean;
  t: number;
  x: number;
  real: boolean;
}) {
  const result = soilExport(60 * t, covered, wind),
    loss = (result.meanLossMm / 1000 / 5) * (real ? 1 : 30),
    base = (x: number) => 0.5 - 0.12 * x;
  // Rills cut into the bare plot as runoff concentrates; they deepen with the soil exported.
  const rill = covered || wind ? 0 : Math.round(Math.min(0.07, loss * 4 + 0.004) * 200) / 200,
    q = Math.round(loss * 400) / 400;
  const height = useMemo(
    () => (x: number, z: number) => {
      let cut = 0;
      for (const r of RILLS) {
        const c = r + 0.04 * Math.sin(x * 3 + r * 9);
        cut = Math.max(
          cut,
          Math.exp(-(((z - c) / 0.05) ** 2)) * THREE.MathUtils.smoothstep(x, -1.9, 0.5),
        );
      }
      const tilth = covered ? 0 : 0.006 * Math.sin(z * 60);
      return base(x) - q - rill * cut + tilth + 0.004 * (noise(x * 5, z * 5) - 0.5);
    },
    [q, rill, covered],
  );
  const color = useMemo(
    () => (x: number, y: number, z: number) =>
      covered
        ? noise(x * 4, z * 4) > 0.5
          ? "#4f6a37"
          : "#5b7640"
        : y < base(x) - q - 0.01
          ? "#6a4f36"
          : "#7a5c3e",
    [covered, q],
  );
  const fill = wind ? 0 : Math.min(1, (result.exported / 6000) * 4);
  return (
    <group position={[x, 0, 0]}>
      <GeomorphicTerrain
        height={height}
        color={color}
        width={4}
        depth={2}
        base={-0.12}
        resolution={160}
        cliff={0.25}
        mottle={0.05}
        sideGlsl={PLOT_GLSL}
      />
      {/* Plot boundary boards and the collecting trough at the downslope end. */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[0, 0.53, side * 1.01]}
          rotation={[0, 0, -Math.atan(0.12)]}
          castShadow
        >
          <boxGeometry args={[4.05, 0.12, 0.025]} />
          <meshStandardMaterial color="#b9a17c" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[-2.01, 0.8, 0]} castShadow>
        <boxGeometry args={[0.025, 0.12, 2.05]} />
        <meshStandardMaterial color="#b9a17c" roughness={0.85} />
      </mesh>
      {/* Open trough: floor, two long walls and two end walls, so the sediment inside shows. */}
      <group position={[2.12, 0.22, 0]}>
        {(
          [
            [0, -0.06, 0, 0.22, 0.02, 2.05],
            [-0.1, 0, 0, 0.02, 0.14, 2.05],
            [0.1, 0, 0, 0.02, 0.14, 2.05],
            [0, 0, -1.015, 0.22, 0.14, 0.02],
            [0, 0, 1.015, 0.22, 0.14, 0.02],
          ] as const
        ).map(([px, py, pz, sx, sy, sz], i) => (
          <mesh key={i} position={[px, py, pz]} castShadow receiveShadow>
            <boxGeometry args={[sx, sy, sz]} />
            <meshStandardMaterial color="#8d9499" metalness={0.3} roughness={0.5} />
          </mesh>
        ))}
        {/* Water-borne sediment collected in the trough, filling as more soil is exported.
            Wind-blown soil leaves through the air instead, so the trough stays empty then. */}
        <mesh position={[0, -0.05 + 0.06 * fill, 0]}>
          <boxGeometry args={[0.18, 0.12 * fill + 0.002, 1.98]} />
          <meshStandardMaterial color="#6f5236" roughness={0.95} />
        </mesh>
      </group>
      {covered && (
        <>
          <GrassPatch
            positions={Array.from({ length: 360 }, (_, i) => {
              const a = -1.92 + random(i + 72) * 3.84,
                z = -0.95 + random(i + 429) * 1.9;
              return [a, height(a, z), z];
            })}
            height={0.13}
            color="#5f7a42"
          />
          {[-1.5, -0.7, 0.1, 0.9, 1.7].map((a, i) => (
            <RootNetwork
              key={i}
              x={a}
              y={height(a, 1)}
              z={1.012}
              depth={0.22}
              spread={0.13}
              seed={i}
            />
          ))}
        </>
      )}
      <DebrisField
        points={Array.from({ length: 60 }, (_, i) => {
          const a = -1.85 + random(i + 931) * 3.7,
            z = -0.91 + random(i + 818) * 1.82;
          return [a, height(a, z) + 0.01, z];
        })}
        size={0.016}
        color="#9c8768"
      />
      {wind
        ? Array.from({ length: 40 }, (_, i) => {
            const a = -1.9 + ((t * 2 + i / 40) % 1) * 4.2,
              z = -0.85 + random(i + 3) * 1.7,
              phase = (t * 12 + i * 0.31) % 1,
              rise = 0.04 + 0.5 * random(i + 9) * ((a + 2) / 4);
            return (
              <mesh
                key={i}
                position={[
                  a,
                  height(Math.min(1.95, a), z) + rise + 0.1 * Math.sin(phase * Math.PI),
                  z,
                ]}
              >
                <sphereGeometry args={[0.03 + 0.05 * random(i + 11), 8, 6]} />
                <meshBasicMaterial
                  color="#c7a46e"
                  transparent
                  opacity={(covered ? 0.2 : 0.6) * (1 - rise)}
                  depthWrite={false}
                />
              </mesh>
            );
          })
        : Array.from({ length: 36 }, (_, i) => {
            const a = -1.9 + random(i + 31) * 3.8,
              z = -0.9 + random(i + 47) * 1.8,
              phase = (t * 14 + random(i + 5)) % 1;
            return (
              <mesh
                key={i}
                position={[a, height(a, z) + 0.02 + (1 - phase) * 0.9, z]}
                scale={[1, 4, 1]}
              >
                <sphereGeometry args={[0.008, 6, 4]} />
                <meshBasicMaterial color="#a9cfd8" transparent opacity={0.7} />
              </mesh>
            );
          })}
      {!wind &&
        RILLS.map((r) => (
          <WaterRibbon
            key={r}
            path={Array.from({ length: 61 }, (_, i) => {
              const a = -1.9 + (i / 60) * 3.9,
                z = r + 0.04 * Math.sin(a * 3 + r * 9);
              return [a, height(a, z) + 0.006, z] as [number, number, number];
            })}
            width={covered ? 0.006 : 0.02}
            opacity={0.55}
            color={covered ? "#8eaaa4" : "#9a8466"}
          />
        ))}
      <Arrow from={[-1.4, 0.9, 1.2]} to={[1.2, 0.65, 1.2]} color="#c6cdb7" width={0.8} />
      <Tag
        pos={[0, 0.9, -1.35]}
        text={covered ? "Covered plot" : "Bare plot"}
        note={`Model soil budget: ${result.remaining.toFixed(1)} kg in place, ${result.moving.toFixed(1)} kg in transport and ${result.exported.toFixed(1)} kg exported, always totaling 6000 kg. Cover multiplies detachment by 0.15, a chosen value, not a measured reduction. ${wind ? "Wind carries exported soil off through the air, so the trough stays empty" : "Exported soil collects in the trough"}; the dark topsoil in the cut face thins as the surface lowers.`}
        occlude={false}
      />
    </group>
  );
}
export default function SoilErosion() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 55);
  const covered = params.veg > 0.5,
    wind = params.wind > 0.5,
    a = soilExport(t * 60, false, wind),
    b = soilExport(t * 60, covered, wind);
  return (
    <>
      <ScienceStudio
        horizon
        slug="soil-erosion"
        camera={[4.6, 4.5, 8]}
        scale="Two 20 × 10 m plots · surface lowering exaggerated ×30 · raindrops and grains enlarged"
        trueScale="1 scene unit = 5 m · true mean surface lowering · raindrops and grains still enlarged"
      >
        <Plot covered={false} wind={wind} t={t} x={-2.5} real={trueScale} />
        <Plot covered={covered} wind={wind} t={t} x={2.5} real={trueScale} />
      </ScienceStudio>
      <ScienceReadout>
        <p>
          {"Model minute "}
          {(t * 60).toFixed(1)}
        </p>
        <dl className="mt-1 grid w-fit grid-cols-[auto_auto_auto_auto_auto] gap-x-5 gap-y-0.5 text-left tabular-nums">
          <dt />
          <dd className="text-mist">{"Still in place"}</dd>
          <dd className="text-mist">{"In transport"}</dd>
          <dd className="text-mist">{"Carried off (exported)"}</dd>
          <dd className="text-mist">{"Ground lowered (average)"}</dd>
          {[
            { name: "Bare plot (left)", r: a },
            { name: covered ? "Covered plot (right)" : "Bare plot (right)", r: b },
          ].map(({ name, r }) => (
            <Fragment key={name}>
              <dt className="text-mist">{name}</dt>
              <dd>{r.remaining.toFixed(0)} kg</dd>
              <dd>{r.moving.toFixed(0)} kg</dd>
              <dd>{r.exported.toFixed(0)} kg</dd>
              <dd>{r.meanLossMm.toFixed(2)} mm</dd>
            </Fragment>
          ))}
        </dl>
        <p className="mt-2">
          {
            "Each plot starts with 6000 kg of loose surface soil; the three stores always add up to 6000 kg. Ground lowering counts all soil loosened so far, including soil still in transport. "
          }
          {wind
            ? "Dry wind-transport example."
            : "Rain splash and runoff example; the lines down each plot show where runoff concentrates (muddy on bare soil), and the rill depths are schematic, not calculated."}{" "}
          {"Model values for comparison only, not predictions for a real field."}
        </p>
      </ScienceReadout>
    </>
  );
}
