import { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { wellHead } from "@/lib/hydrology-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { terrainGeometry } from "../shared/science-geometry";
import { Tag, InspectHotspot } from "../shared/kit";
import { WaterRibbon } from "../shared/geomorphic-terrain";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
export default function Groundwater() {
  const { params, trueScale, t } = useLabControls();
  useLabTick(1 / 24);
  const confined = params.confined > 0.5,
    pump = (params.pump ?? 0) / 800,
    H = params.head ?? 31,
    f = trueScale ? 1 / 20 : 1;
  const head = (x: number, z: number) =>
    (wellHead(Math.hypot(x, z) * 200, pump, H, confined) / 10) * f;
  const surface = useMemo(
    () => terrainGeometry(head, 5, 4, 160),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- head is redefined each render from pump, H, confined and f, which are listed
    [pump, H, confined, f],
  );
  useEffect(() => () => surface.dispose(), [surface]);
  const atWell = wellHead(0.2, pump, H, confined),
    radii = [10, 30, 80, 200, 400];
  return (
    <>
      <ScienceStudio
        slug="groundwater"
        scale="Vertical ×20 · well, grains, pores, farm and river illustrative · steady radial flow"
        trueScale="Equal horizontal and vertical scale · 1 scene unit = 200 m"
        camera={[5, 3.5, 7]}
      >
        <group position={[0, -1.5 * f, 0]}>
          <LocalClipping />
          <AquiferBlock f={f} confined={confined} head={head} />
          {confined && (
            <InspectHotspot
              name="Aquitard"
              note="A low-permeability clay layer caps the 12 m thick aquifer. The gold surface above it shows the level water would rise to in a well, not another layer of water."
            >
              <mesh position={[2.52, 1.32 * f, 0]}>
                <boxGeometry args={[0.02, 0.24 * f, 4]} />
                <meshBasicMaterial transparent opacity={0} />
              </mesh>
            </InspectHotspot>
          )}
          <mesh geometry={surface}>
            <meshPhysicalMaterial
              color={confined ? "#dfc17d" : "#4eb2d0"}
              transparent
              opacity={confined ? 0.38 : 0.3}
              clippingPlanes={CUT}
              clipIntersection
              roughness={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {radii.map((r) => (
            <Line
              key={r}
              points={Array.from({ length: 97 }, (_, i): [number, number, number] => {
                const a = (i / 96) * Math.PI * 2;
                return [
                  (r / 200) * Math.cos(a),
                  (wellHead(r, pump, H, confined) / 10) * f + 0.005,
                  (r / 200) * Math.sin(a),
                ];
              })}
              color={confined ? "#dfc17d" : "#77d0dd"}
              lineWidth={1}
            />
          ))}
          {/* Head profile drawn on both cut faces so the cone of depression reads in section. */}
          {[0, 1].map((face) => (
            <Line
              key={`profile-${face}`}
              points={Array.from({ length: 120 }, (_, i): [number, number, number] => {
                const s = 0.001 + (face ? 2 : 2.5) * (i / 119) ** 2,
                  y = (wellHead(s * 200, pump, H, confined) / 10) * f;
                return face ? [0.006, y, s] : [s, y, 0.006];
              })}
              color={confined ? "#f0cf7a" : "#9be3f2"}
              lineWidth={2.5}
            />
          ))}
          {pump > 0 &&
            Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * 2 * Math.PI,
                r = 0.1 + 1.85 * (1 - ((t + i * 0.173) % 1)) ** 0.65;
              return (
                <mesh key={`flow-${i}`} position={[r * Math.cos(a), 0.56 * f, r * Math.sin(a)]}>
                  <sphereGeometry args={[0.02, 8, 6]} />
                  <meshBasicMaterial color="#d8eef0" />
                </mesh>
              );
            })}
          {[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0].map((y) => (
            <mesh key={y} position={[0, y * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.034, 0.005, 5, 20]} />
              <meshStandardMaterial color="#667c80" metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[0, 2 * f, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 4 * f, 24, 1, true]} />
            <meshStandardMaterial
              color="#c2c7c5"
              metalness={0.8}
              roughness={0.26}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, (atWell / 20) * f, 0]}>
            <cylinderGeometry args={[0.022, 0.022, (atWell / 10) * f, 16]} />
            <meshBasicMaterial color="#71c5e0" />
          </mesh>
          {pump > 0 && (
            <>
              {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
                <Arrow
                  key={a}
                  from={[0.85 * Math.cos(a), 0.55 * f, 0.85 * Math.sin(a)]}
                  to={[0.15 * Math.cos(a), 0.55 * f, 0.15 * Math.sin(a)]}
                  color="#85c5d7"
                  width={0.4}
                />
              ))}
              <mesh position={[0, 4.1 * f, 0]}>
                <sphereGeometry args={[0.025 + (0.5 + 0.5 * Math.sin(t * 50)) * 0.02, 12, 12]} />
                <meshBasicMaterial color="#9fdae8" />
              </mesh>
            </>
          )}
          <Tag
            pos={[-2.7, (H / 10) * f + 0.2, 1.9]}
            text={confined ? "Potentiometric surface" : "Water table"}
            note={
              confined
                ? "The potentiometric surface is the level water rises to in a well. The confined aquifer stays fully saturated beneath the clay layer."
                : "The water table separates saturated pores below from the unsaturated zone above. The colored surface is a level, not an underground lake."
            }
            occlude={false}
          />
          <Tag
            pos={[0.9, 4.3 * f, 0]}
            text="Pumping well"
            note="An idealized well pumping at the set rate through the full aquifer thickness. The fixed-head outer boundary resupplies the water, so the model does not show long-term depletion."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">
          {"Q = "}
          {(pump * 800).toFixed(0)} {"m³/day · boundary head "}
          {H.toFixed(1)} {"m · well head "}
          {atWell.toFixed(2)} {"m · drawdown "}
          {(H - atWell).toFixed(2)} {"m."}
        </span>
        <br />
        {confined
          ? "Confined: the 12 m aquifer stays saturated; gold is the potentiometric surface (level water would rise to in a well)."
          : "Unconfined: blue marks the top of saturated pores."}{" "}
        {
          "K = 10 m/day, fixed head at 500 m, well radius 0.2 m. Steady Thiem / Dupuit approximation. "
        }
        {pump > 0
          ? "Play shows water moving toward the well."
          : "Raise Pump above zero to see tracers flow toward the well."}{" "}
        {""}
      </ScienceReadout>
    </>
  );
}

/** Removes the front-right quarter (x > 0 and z > 0) to open the block at the well. */
const CUT = [
  new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0),
  new THREE.Plane(new THREE.Vector3(0, 0, -1), 0),
];
function LocalClipping() {
  const gl = useThree((st) => st.gl);
  useEffect(() => {
    const previous = gl.localClippingEnabled;
    gl.localClippingEnabled = true;
    return () => {
      gl.localClippingEnabled = previous;
    };
  }, [gl]);
  return null;
}

/** Layers in section (heights in meters ÷ 10, times the vertical factor f): bedrock below 0,
 * sand and gravel aquifer, a clay aquitard (confined case), dry sand above the water table and
 * a soil cap. The water table comes from the lab's head model through a radial profile. */
const AQUIFER_GLSL = `uniform sampler2D uProfile; uniform float uF,uConfined,uTop,uLift;
vec3 sectionColour(vec3 p0,vec3 w){
  vec3 p=vec3(w.x,w.y-uLift,w.z);
  float y=p.y,r=length(p.xz),g=grain(p.xy*1.5+p.zy*1.5),f=uF;
  float wt=texture2D(uProfile,vec2(clamp(r/3.4,0.,1.),.5)).r;
  vec2 q=(p.xy+p.zy)*vec2(18.,18./max(f,.05));
  float pore=smoothstep(.35,.15,length(fract(q)-.5));
  vec3 dry=mix(vec3(.86,.76,.56),vec3(.74,.63,.44),g);
  vec3 wet=mix(vec3(.46,.58,.62),vec3(.36,.47,.52),g);
  vec3 c;
  if(y<0.){c=mix(vec3(.42,.40,.40),vec3(.32,.31,.32),g);c*=mix(.7,1.,smoothstep(0.,.01,abs(fract(p.x*1.7+y*3.)-.5)*2.));}
  else if(y>uTop-.08*f-.02)c=mix(vec3(.40,.30,.21),vec3(.32,.24,.17),g);
  else if(uConfined>.5){
    if(y<1.2*f)c=mix(wet,vec3(.52,.72,.80),pore*.3);
    else if(y<1.44*f)c=mix(vec3(.50,.45,.42),vec3(.42,.38,.36),step(.5,fract(y/f*40.)));
    else c=mix(vec3(.78,.70,.55),vec3(.66,.58,.45),g);
  }else{
    float fringe=smoothstep(wt+.06*f+.02,wt,y);
    c=y<wt?mix(wet,vec3(.52,.72,.80),pore*.3):mix(dry,wet*1.15,fringe*.6);
    float gravel=smoothstep(.6,.8,sFbm(vec2(p.x*2.,y/f*1.2)))*step(y,.5*f);
    c=mix(c,mix(vec3(.58,.56,.52),vec3(.42,.40,.38),step(.5,sHash(floor(q*.4)))),gravel*.7);
  }
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

function AquiferBlock({
  f,
  confined,
  head,
}: {
  f: number;
  confined: boolean;
  head: (x: number, z: number) => number;
}) {
  const top = 4 * f;
  const ground = useMemo(
    () => (x: number, z: number) =>
      top + 0.03 * (fbm(x * 1.2 + 2, z * 1.2) - 0.5) - 0.05 * Math.exp(-(((x + 2.25) / 0.12) ** 2)),
    [top],
  );
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(ground, 5, 4, 160, -0.24 * f),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      col.copy(farmland(x * 1.3, z * 1.3, 0.4));
      if (Math.abs(x + 2.25) < 0.14) col.lerp(tone.set("#5f8a4a"), 0.7);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [ground, f]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const profile = useMemo(() => {
    const t = new THREE.DataTexture(
      new Float32Array(256),
      256,
      1,
      THREE.RedFormat,
      THREE.FloatType,
    );
    t.magFilter = t.minFilter = THREE.NearestFilter;
    return t;
  }, []);
  useEffect(() => () => profile.dispose(), [profile]);
  const data = profile.image.data as Float32Array;
  for (let i = 0; i < 256; i++) data[i] = head((i / 255) * 3.4, 0);
  profile.needsUpdate = true;
  const uniforms = useSectionUniforms({
    uProfile: profile,
    uF: f,
    uConfined: confined ? 1 : 0,
    uTop: top,
    uLift: -1.5 * f,
  });
  const farm = useMemo(
    () => settlement(0.55, -0.55, 4, 0.25, 0.08, 3, (x, z) => Math.hypot(x, z) > 0.25),
    [],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 40 && i < 800; i++) {
      const x = -2.4 + 4.8 * ((i * 0.618034) % 1),
        z = -1.9 + 3.8 * ((i * 0.7548777) % 1);
      if (x > 0 && z > 0) continue;
      if ((Math.abs(x + 2.25) < 0.45 && Math.abs(x + 2.25) > 0.15) || fbm(x * 2, z * 2) > 0.68)
        out.push([x, ground(x, z) - 0.004, z]);
    }
    return out;
  }, [ground]);
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <TerrainMaterial
          attach="material-0"
          kind="grass"
          color="#d4d4d4"
          vertexColors
          clippingPlanes={CUT}
          clipIntersection
        />
        <SectionMaterial
          attach="material-1"
          glsl={AQUIFER_GLSL}
          uniforms={uniforms}
          cacheKey="groundwater-aquifer-v1"
          clippingPlanes={CUT}
          clipIntersection
        />
      </mesh>
      {/* Cut faces of the removed front-right quarter, through the well. */}
      {[
        {
          position: [0, (top - 0.24 * f) / 2, 1] as [number, number, number],
          rotation: Math.PI / 2,
        },
        { position: [1.25, (top - 0.24 * f) / 2, 0] as [number, number, number], rotation: 0 },
      ].map((face, i) => (
        <mesh key={i} position={face.position} rotation={[0, face.rotation, 0]}>
          <planeGeometry args={[i === 0 ? 2 : 2.5, top + 0.24 * f]} />
          <SectionMaterial
            glsl={AQUIFER_GLSL}
            uniforms={uniforms}
            cacheKey="groundwater-aquifer-v1"
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <WaterRibbon
        path={Array.from(
          { length: 30 },
          (_, i) => [-2.25, top - 0.04, -2 + (i / 29) * 4] as [number, number, number],
        )}
        width={0.12}
        color="#3f86a2"
      />
      <Buildings items={farm} ground={ground} />
      <PlantStand kind="broadleaf" positions={trees} scale={0.1} seed={23} />
      <group position={[0, top, 0]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[0.16, 0.12, 0.16]} />
          <meshStandardMaterial color="#c9c2b2" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.15, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[0.14, 0.07, 4]} />
          <meshStandardMaterial color="#6f4d3c" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}
