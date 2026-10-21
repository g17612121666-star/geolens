import { useEffect, useMemo } from "react";
import { useIsCompact } from "@/hooks/use-media";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { carbonBudget, CARBON_STORES } from "@/lib/carbon-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { SectionMaterial } from "../shared/section-material";
import { farmland, fbm } from "../shared/hazard-utils";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
/** Anchor points for each store in the diorama: atmosphere, biosphere, ocean, sediment, fossil. */
const POS: [number, number, number][] = [
  [0, 2.3, 0],
  [-2.4, 0.75, 0],
  [2.6, 0.35, 0],
  [2.6, -1.05, 1.25],
  [-1.1, -0.95, 1.25],
];
const W = 8,
  D = 2.5,
  BASE = -1.6,
  COAST = 0.9;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);
/** Land on the left rising to a volcano at the back; a shelf and ocean floor on the right. */
function ground(x: number, z: number) {
  const land =
      0.14 +
      0.08 * fbm(x * 0.8 + 3, z * 0.8) +
      0.7 * Math.exp(-((x + 3.3) ** 2 + (z + 0.7) ** 2) / 0.35),
    crater = -0.12 * Math.exp(-((x + 3.3) ** 2 + (z + 0.7) ** 2) / 0.02),
    sea = -0.55 + 0.05 * fbm(x * 2, z * 2);
  const u = ss(x, COAST - 0.4, COAST + 0.6);
  return land * (1 - u) + sea * u + crater;
}
/** Cut faces: soil and sandstone with coal seams under the land; pale carbonate beds and
 * limestone under the sea. Thicknesses and depths are schematic. */
const STRATA_GLSL = `
vec3 sectionColour(vec3 p,vec3 w){
  float g=grain(w.xy+w.zy), sea=smoothstep(.5,1.5,w.x), y=w.y;
  vec3 sand=mix(vec3(.78,.66,.48),vec3(.66,.54,.38),step(.5,fract(y*12.)));
  vec3 shale=mix(vec3(.46,.46,.44),vec3(.38,.38,.37),g);
  vec3 lime=mix(vec3(.86,.84,.76),vec3(.76,.74,.66),step(.5,fract(y*9.)));
  vec3 c=y>-.25?mix(vec3(.45,.33,.22),sand,smoothstep(.0,-.2,y)):(y>-.55?shale:sand*.92);
  float coal=(1.-smoothstep(.02,.035,abs(y+.95)))+(1.-smoothstep(.015,.025,abs(y+1.25)));
  c=mix(c,vec3(.08,.08,.09),clamp(coal,0.,1.)*(1.-sea));
  vec3 marine=y>-.75?mix(vec3(.80,.76,.62),vec3(.70,.66,.54),step(.5,fract(y*30.))):lime;
  c=mix(c,marine,sea);
  return c*(.9+.2*g);
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

function Diorama({
  biosphere,
  atmosphere,
  tap,
  t,
}: {
  biosphere: number;
  atmosphere: number;
  tap: number;
  t: number;
}) {
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(ground, W, D, 220, BASE),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (y < -0.02) col.set("#b9aa86").lerp(tone.set("#6e7c78"), ss(-y, 0.2, 0.5));
      else if (y < 0.08 && x > 0) col.set("#ddcda3");
      else
        col.copy(farmland(x * 1.3, z * 1.3, 0.4)).lerp(tone.set("#4e6b3b"), ss(-x, 0.8, 1.6) * 0.8);
      if (y > 0.4) col.lerp(tone.set("#4c4440"), ss(y, 0.4, 0.6));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const forest = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 160 && i < 3000; i++) {
      const x = -3.8 + 4.2 * ((i * 0.618034) % 1),
        z = -1.15 + 2.3 * ((i * 0.7548777) % 1),
        y = ground(x, z);
      if (y > 0.1 && y < 0.38 && Math.hypot(x + 0.2, z + 0.3) > 0.45) out.push([x, y - 0.004, z]);
    }
    return out;
  }, []);
  const trees = forest.slice(0, Math.round(forest.length * Math.min(1, biosphere / 1300)));
  const co2 = Math.round(18 * Math.min(2, atmosphere / 600));
  return (
    <group>
      <mesh geometry={geometry} castShadow receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <SectionMaterial attach="material-1" glsl={STRATA_GLSL} cacheKey="carbon-strata-v1" />
      </mesh>
      <mesh position={[(COAST - 0.1 + W / 2) / 2, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W / 2 - COAST + 0.1, D - 0.002]} />
        <FlowWaterMaterial color="#1f5f7a" opacity={0.85} speed={0.2} />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.12} seed={7} />
      {/* Power station burning fossil carbon; smoke grows with the tap. */}
      <group position={[-0.2, ground(-0.2, -0.3), -0.3]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.5, 0.16, 0.3]} />
          <meshStandardMaterial color="#8b8f92" roughness={0.7} />
        </mesh>
        <mesh position={[0.15, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.05, 0.56, 16]} />
          <meshStandardMaterial color="#b9b3a8" roughness={0.7} />
        </mesh>
        {tap > 0.01 &&
          Array.from({ length: 5 }, (_, i) => {
            const u = (t * 8 + i / 5) % 1;
            return (
              <CloudVolume
                key={i}
                position={[0.15 + u * 0.5, 0.7 + u * 0.7, -u * 0.2]}
                scale={[0.08 + u * 0.18 * tap + 0.04, 0.06 + u * 0.1, 0.08 + u * 0.12]}
                seed={i + 3}
                opacity={(0.4 + 0.4 * tap) * (1 - u * 0.7)}
              />
            );
          })}
      </group>
      {/* Volcano: a slow geological source of carbon dioxide. */}
      <CloudVolume
        position={[-3.3, ground(-3.3, -0.7) + 0.35, -0.7]}
        scale={[0.14, 0.22, 0.14]}
        seed={21}
        opacity={0.5}
      />
      {/* CO2 molecules in the air: their number follows the atmospheric store. */}
      {Array.from({ length: co2 }, (_, i) => {
        const x = -3.6 + 7.2 * ((i * 0.618034) % 1),
          y = 1.5 + 1.3 * ((i * 0.381966) % 1) + 0.05 * Math.sin(t * 40 + i),
          z = -0.9 + 1.8 * ((i * 0.7548777) % 1);
        return (
          <group key={i} position={[x, y, z]} rotation={[0, i * 1.3 + t * 3, i * 0.4]}>
            {[-1, 0, 1].map((j) => (
              <mesh key={j} position={[j * 0.075, 0, 0]}>
                <sphereGeometry args={[j ? 0.042 : 0.036, 12, 8]} />
                <meshStandardMaterial color={j ? "#d4473b" : "#3a3a3a"} roughness={0.4} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/** Translucent store gauge: volume ∝ the store's carbon in this invented budget. */
function StoreGauge({ radius, colour }: { radius: number; colour: string }) {
  return (
    <mesh>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshPhysicalMaterial
        color={colour}
        transparent
        opacity={0.28}
        roughness={0.3}
        depthWrite={false}
      />
    </mesh>
  );
}
const COLOURS = ["#a6cccf", "#829b69", "#568798", "#bda88b", "#45403a"];

export default function CarbonCycle() {
  const { params, t, setParam } = useLabControls();
  useLabTick(1 / 65);
  const compact = useIsCompact(),
    positions = POS;
  const tap = params.fossil ?? 0.2,
    selected = Math.round(params.flux ?? 7),
    budget = useMemo(() => carbonBudget(t * 100, tap), [t, tap]),
    radii = budget.stores.map((m) => 0.32 * Math.cbrt(m / 600));
  const flux = budget.fluxes[selected],
    a = new THREE.Vector3(...positions[flux.from]),
    b = new THREE.Vector3(...positions[flux.to]),
    d = b.clone().sub(a).normalize(),
    start = a.clone().addScaledVector(d, radii[flux.from] + 0.06),
    end = b.clone().addScaledVector(d, -radii[flux.to] - 0.06),
    middle = start
      .clone()
      .lerp(end, 0.5)
      .add(new THREE.Vector3(compact && selected === 7 ? -2 : 0, 0, compact ? 0.5 : 0.7));
  const curve = new THREE.QuadraticBezierCurve3(start, middle, end),
    points = curve.getPoints(48),
    active = flux.rate > 1e-8;
  return (
    <>
      <ScienceStudio
        slug="carbon-cycle"
        camera={[0.6, 2.2, 9]}
        scale="Invented closed budget · gauge volume ∝ stored carbon · landscape, molecules and smoke illustrative"
        trueScale="Volumes encode this invented budget, not observed global reservoir sizes"
      >
        <Diorama biosphere={budget.stores[1]} atmosphere={budget.stores[0]} tap={tap} t={t} />
        {positions.map((pos, i) => (
          <group key={i} position={pos}>
            <StoreGauge radius={radii[i] * 0.6} colour={COLOURS[i]} />
            <Tag
              pos={[0, radii[i] * 0.6 + 0.3, 0]}
              text={
                compact
                  ? CARBON_STORES[i]
                  : `${CARBON_STORES[i]} · ${budget.stores[i].toFixed(0)} Pg C`
              }
              note={`${budget.stores[i].toFixed(1)} Pg C in this invented teaching budget, not a measured estimate of Earth’s carbon. Sphere volume, not radius, shows the amount; the trees and molecules inside are symbols.`}
              occlude={false}
            />
          </group>
        ))}
        {/* The whole network: every transfer as a faint arc with a clickable midpoint. */}
        {budget.fluxes.map((f, k) => {
          if (k === selected) return null;
          const fa = new THREE.Vector3(...positions[f.from]),
            fb = new THREE.Vector3(...positions[f.to]),
            fd = fb.clone().sub(fa).normalize(),
            s0 = fa.clone().addScaledVector(fd, radii[f.from] + 0.06),
            s1 = fb.clone().addScaledVector(fd, -radii[f.to] - 0.06),
            mid = s0
              .clone()
              .lerp(s1, 0.5)
              .add(new THREE.Vector3(0, 0, 0.45 + 0.12 * (k % 3))),
            c = new THREE.QuadraticBezierCurve3(s0, mid, s1);
          return (
            <group key={k}>
              <Line
                points={c.getPoints(32)}
                color="#9aa9a4"
                transparent
                opacity={0.35}
                lineWidth={1}
              />
              <mesh
                position={c.getPoint(0.5)}
                onClick={(e) => {
                  e.stopPropagation();
                  setParam("flux", k);
                }}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "auto")}
              >
                <sphereGeometry args={[0.07, 16, 12]} />
                <meshStandardMaterial color={k === 7 ? "#e6a077" : "#9ed0ca"} roughness={0.5} />
              </mesh>
            </group>
          );
        })}
        <Line
          points={points}
          color={selected === 7 ? "#e6a077" : "#9ed0ca"}
          lineWidth={active ? 2.5 : 1}
          dashed={!active}
        />
        {active && (
          <>
            <Arrow
              from={curve.getPoint(0.86).toArray() as [number, number, number]}
              to={end.toArray() as [number, number, number]}
              color={selected === 7 ? "#e6a077" : "#9ed0ca"}
              width={1}
            />
            {Array.from({ length: 9 }, (_, i) => (
              <mesh key={i} position={curve.getPoint((t * 6 + i / 9) % 1)}>
                <sphereGeometry args={[0.04, 16, 12]} />
                <meshBasicMaterial color="#e8cf9e" />
              </mesh>
            ))}
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {"Model year "}
        {(t * 100).toFixed(1)} · {flux.name}: {flux.rate.toFixed(2)} {"Pg C/year. Burned "}
        {budget.emitted.toFixed(1)} {"Pg C; total "}
        {budget.total.toFixed(1)} {"Pg C stays fixed."}
        <br />
        {
          "Click a bead on a faint arc to follow another transfer. 1 Pg C = 10¹² kg of carbon; every transfer removes from one store exactly what it adds to another."
        }
      </ScienceReadout>
    </>
  );
}
