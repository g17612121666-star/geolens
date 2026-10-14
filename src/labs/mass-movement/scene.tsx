import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { TerrainMaterial } from "../shared/natural-world";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { SLUMP, slumpBase, slumpSurface, slumpStability, rotateSlump } from "@/lib/slump-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { SectionMaterial, useSectionUniforms } from "../shared/section-material";
import { NaturalTree } from "../shared/natural-world";
import { RootNetwork, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
/** Slope materials in section: topsoil, a weathered zone and laminated clay over mudstone.
 * Points are rotated back to their pre-failure position, so the slumped block's layers tilt. */
const SLOPE_GLSL = `uniform float uAngle;
vec3 sectionColour(vec3 p,vec3 w){
  float c=cos(uAngle),s=sin(uAngle),cy=${SLUMP.centreY.toFixed(3)};
  vec2 q=vec2(p.x*c+(p.y-cy)*s,cy-p.x*s+(p.y-cy)*c);
  float d=(1.-.25*q.x)-q.y,g=grain(vec2(q.x+p.z*.4,q.y));
  vec3 col;
  if(d<.04)col=mix(vec3(.30,.23,.17),vec3(.37,.28,.20),g);
  else if(d<.3+.06*sNoise(vec2(q.x*3.,0.))){
    col=mix(vec3(.58,.44,.30),vec3(.64,.50,.34),g);
    col=mix(col,vec3(.72,.52,.30),smoothstep(.68,.74,sNoise(vec2(q.x+p.z,q.y)*22.))*.6);
  }else{
    float lam=fract(q.y*13.+.12*sNoise(vec2(q.x*2.,0.)));
    col=mix(vec3(.56,.51,.44),vec3(.49,.45,.39),step(.55,lam))*mix(.93,1.06,g);
  }
  if(q.y<-.42+.05*sNoise(vec2(q.x*2.,1.))){
    float bed=fract(q.y*5.);
    col=mix(vec3(.43,.42,.41),vec3(.37,.36,.35),g)*mix(.75,1.,smoothstep(0.,.08,bed));
  }
  float r=length(vec2(p.x,p.y-cy));
  col*=mix(.5,1.,smoothstep(0.,.03,abs(r-${SLUMP.radius.toFixed(3)})));
  return col;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

/** A closed extruded slice of the slope with the layered section shader. */
function SlopeBody({
  points,
  depth,
  angle,
}: {
  points: [number, number][];
  depth: number;
  angle: number;
}) {
  const signature = JSON.stringify(points);
  const geometry = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(
      new THREE.Shape(points.map((p) => new THREE.Vector2(...p))),
      {
        depth,
        bevelEnabled: false,
      },
    );
    g.translate(0, 0, -depth / 2);
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useSectionUniforms({ uAngle: angle });
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <SectionMaterial glsl={SLOPE_GLSL} uniforms={uniforms} cacheKey="slump-section" />
    </mesh>
  );
}

const ARC = Array.from({ length: 121 }, (_, i): [number, number] => {
  const x = SLUMP.left + ((SLUMP.right - SLUMP.left) * i) / 120;
  return [x, slumpBase(x)];
});
export default function MassMovement() {
  const { params, t } = useLabControls();
  useLabTick(1 / 45);
  const rain = params.rain ?? 0.15,
    result = useMemo(() => slumpStability(rain), [rain]),
    angle = t * 0.3 * Math.min(1, Math.max(0, (1 - result.factor) / 0.2));
  const top: [[number, number], [number, number]] = [
      [SLUMP.left, slumpSurface(SLUMP.left)],
      [SLUMP.right, slumpSurface(SLUMP.right)],
    ],
    block = [...top, ...ARC.slice().reverse()].map(([x, y]) => rotateSlump(x, y, angle));
  const crown = rotateSlump(...top[0], angle),
    toe = rotateSlump(...top[1], angle);
  return (
    <>
      <ScienceStudio
        slug="mass-movement"
        camera={[1.2, 2.4, 7]}
        scale="Selected circular slip · 1 scene unit = 10 m · no vertical exaggeration"
        trueScale="Uniform 2-D slope at a common scale · illustrative post-failure rotation · vegetation and roots enlarged"
      >
        <SlopeBody
          points={[
            [-3.4, slumpSurface(-3.4)],
            ...ARC,
            [3.4, slumpSurface(3.4)],
            [3.4, -1],
            [-3.4, -1],
          ]}
          depth={2.2}
          angle={0}
        />
        <SlopeBody points={block} depth={2.19} angle={angle} />
        {/* Stable ground above the crown and below the toe keeps its trees. */}
        {Array.from({ length: 22 }, (_, i) => {
          const upper = i % 2 === 0,
            x = upper
              ? -3.3 + random(i + 11) * (SLUMP.left + 3.1)
              : SLUMP.right + 0.15 + random(i + 17) * (3.25 - SLUMP.right),
            y = slumpSurface(x);
          return (
            <group key={`s${i}`} position={[x, y, -0.95 + random(i + 23) * 1.7]}>
              <NaturalTree kind="broadleaf" scale={0.07 + 0.03 * random(i + 29)} seed={i + 41} />
            </group>
          );
        })}
        <Turf
          line={Array.from({ length: 41 }, (_, i): [number, number] => {
            const x = -3.4 + ((SLUMP.left - 3.4 * 0 + 3.4) * i) / 40;
            return [x, slumpSurface(x)];
          })}
        />
        <Turf
          line={Array.from({ length: 41 }, (_, i): [number, number] => {
            const x = SLUMP.right + ((3.4 - SLUMP.right) * i) / 40;
            return [x, slumpSurface(x)];
          })}
        />
        <Turf
          line={Array.from({ length: 41 }, (_, i): [number, number] => {
            const x = SLUMP.left + ((SLUMP.right - SLUMP.left) * i) / 40;
            const p = rotateSlump(x, slumpSurface(x), angle);
            return [p[0], p[1]];
          })}
        />
        {/* Water table from the model's pore-pressure heads; it rises with rainfall. */}
        <Line
          points={result.slices.map(
            (sl) => [sl.x, slumpBase(sl.x) + (rain * sl.h) / 10, 1.122] as [number, number, number],
          )}
          color="#3d8fd0"
          lineWidth={2.5}
          dashed
          dashSize={0.08}
          gapSize={0.04}
        />
        {Array.from(
          { length: 25 },
          (_, i) => SLUMP.left + 0.12 + random(i + 431) * (SLUMP.right - SLUMP.left - 0.24),
        ).map((x, i) => {
          const p = rotateSlump(x, slumpSurface(x), angle);
          return (
            <group
              key={i}
              position={[p[0], p[1], -0.93 + random(i + 673) * 1.64]}
              rotation={[0, 0, angle]}
            >
              <NaturalTree kind="broadleaf" scale={0.065 + 0.035 * random(i + 361)} seed={i + 3} />
            </group>
          );
        })}
        {[-1.4, -0.5, 0.4, 1.3]
          .filter((x) => x > SLUMP.left && x < SLUMP.right)
          .map((x, i) => {
            const p = rotateSlump(x, slumpSurface(x), angle);
            return (
              <group key={i} position={[p[0], p[1], 1.108]} rotation={[0, 0, angle]}>
                <RootNetwork depth={0.18} spread={0.14} seed={i} />
              </group>
            );
          })}
        {angle > 0.005 && (
          <DebrisField
            points={Array.from({ length: 16 }, (_, i) => [
              crown[0] - 0.06 + Math.sin(i * 7) * 0.06,
              crown[1] - 0.12 - (i % 4) * 0.025,
              -0.85 + Math.floor(i / 4) * 0.5,
            ])}
            size={0.035}
          />
        )}
        <Line points={ARC.map(([x, y]) => [x, y, 1.115])} color="#e0ad80" lineWidth={2} />
        <Line
          points={[
            ...top.map(([x, y]) => {
              const p = rotateSlump(x, y, angle);
              return [p[0], p[1], 1.12] as [number, number, number];
            }),
          ]}
          color="#8eae78"
          lineWidth={3}
        />
        {result.slices
          .filter((_, i) => i % 16 === 8)
          .map((s, i) => (
            <Line
              key={i}
              points={[
                [s.x, slumpBase(s.x), 1.12],
                [s.x, slumpBase(s.x) + (rain * s.h) / 10, 1.12],
              ]}
              color="#83b9d0"
              transparent
              opacity={0.65}
            />
          ))}
        <Tag
          pos={[crown[0] - 0.3, crown[1] + 0.55, 1.12]}
          text="Crown / head scarp"
          note="The curved base stays at a fixed radius. Rigid rotation moves the head down and the toe outward or upward; it does not stretch a generic block along a straight slope."
          occlude={false}
        />
        <Tag
          pos={[toe[0] + 0.3, toe[1] + 0.55, 1.12]}
          text="Toe"
          note="The toe may bulge during rotational movement. Real slumps deform, can develop multiple shear surfaces and may turn into flows; the rigid block here is an illustration."
          occlude={false}
        />
        <Tag
          pos={[0, -0.55, 1.12]}
          text="Curved shear surface"
          note="This is one prescribed slip circle, not a search for the critical failure surface. The strength calculation refers to the initial geometry. Blue lines show prescribed pressure heads, not an underground open lake."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <div className="mx-auto mb-2 max-w-md" aria-hidden="true">
          <div className="relative h-2.5 rounded-full bg-gradient-to-r from-[#d0402f] via-[#e3b04b] to-[#4c9a5b]">
            <span
              className="absolute top-[-4px] h-[18px] w-[3px] rounded bg-chalk"
              style={{
                left: `${Math.min(100, Math.max(0, ((result.factor - 0.5) / 1.5) * 100))}%`,
              }}
            />
            <span
              className="absolute top-[-6px] h-[22px] w-px bg-chalk/60"
              style={{ left: "33.3%" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-mist">
            <span>0.5 · fails</span>
            <span>1.0</span>
            <span>2.0 · stable</span>
          </div>
        </div>
        {"Initial-slope factor of safety "}
        {result.factor.toFixed(2)} {"· maximum pore pressure "}
        {result.maxPressure.toFixed(1)} {"kPa. "}
        {result.factor < 1
          ? "Resistance below driving demand: Play shows a prescribed rotation."
          : "Resistance exceeds driving demand here: increase pore pressure to compare."}
        <br />
        {
          "The Bishop calculation uses cohesion of 2 kPa, a friction angle of 15° and unit weight of 20 kN/m³ for the selected initial slope."
        }
      </ScienceReadout>
    </>
  );
}

/** A thin grassed skin along a 2-D surface line, extruded across the section. */
function Turf({ line }: { line: [number, number][] }) {
  const key = line.map((p) => p.join(",")).join(";");
  const geometry = useMemo(() => {
    const shape = new THREE.Shape([
      ...line.map(([x, y]) => new THREE.Vector2(x, y + 0.03)),
      ...[...line].reverse().map(([x, y]) => new THREE.Vector2(x, y - 0.01)),
    ]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: 2.22, bevelEnabled: false });
    g.translate(0, 0, -1.11);
    return g;
  }, [key]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} receiveShadow>
      <TerrainMaterial kind="grass" color="#7c9b55" />
    </mesh>
  );
}
