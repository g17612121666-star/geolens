import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { freezingJoint, calciteDissolution } from "@/lib/weathering-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { SectionMaterial } from "../shared/section-material";
import { cliffFaceGlsl } from "../shared/land-section";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { landscapeNoise } from "../shared/landscape-noise";

/** Bedded sandstone; upward-facing surfaces carry a grey-green lichen crust. */
const SANDSTONE = cliffFaceGlsl({ rock: "sandstone", beds: 5.5, bedOffset: 0.2 });
/** Fine-grained pale limestone with faint bedding and shell fragments, but no joints. */
const LIMESTONE = cliffFaceGlsl({
  custom: `
  float b=fract(p.y*5.+.1*sNoise(vec2(p.x*2.,p.z*2.)));
  vec3 c=mix(vec3(.86,.83,.75),vec3(.78,.75,.67),sNoise(vec2(p.x+p.z,p.y)*6.));
  c*=mix(.88,1.,smoothstep(0.,.08,b))*mix(.94,1.05,g);
  return mix(c,vec3(.95,.93,.88),smoothstep(.8,.86,sNoise(vec2(p.x*40.+p.z*30.,p.y*40.)))*.6);`,
});
function BlockMaterial() {
  return (
    <SectionMaterial
      glsl={SANDSTONE}
      cliff={0.7}
      cacheKey="weathering-sandstone"
      color="#9fa38a"
      roughness={0.95}
    />
  );
}
import { NaturalTree } from "../shared/natural-world";
import { RootNetwork } from "../shared/geomorphic-terrain";
import { FlowWaterMaterial } from "../shared/flow-water";
import { Tag } from "../shared/kit";
const MODES = ["Freezing in a joint", "Carbonate dissolution", "Root growth"];
function JointRock({ side, gap }: { side: number; gap: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(0.8, 1.4, 1, 20, 28, 20),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        inner = Math.abs(x + side * 0.4) < 1e-5;
      if (!inner) {
        const r = 0.012 * Math.sin(y * 31 + z * 19) * Math.sin(x * 23 - z * 17);
        if (Math.abs(x) > 0.39) p.setX(i, x + r);
        if (Math.abs(z) > 0.49) p.setZ(i, z + r);
        if (Math.abs(y) > 0.69) p.setY(i, y + r);
      }
    }
    g.computeVertexNormals();
    return g;
  }, [side]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[side * (0.4 + gap / 2), 0.7, 0]} castShadow receiveShadow>
      <BlockMaterial />
    </mesh>
  );
}
/** A limestone boulder whose surface is etched into solution pits as dissolution proceeds. */
function PittedLimestone({ radius, pitting }: { radius: number; pitting: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(1, 5),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        pits = Math.max(0, landscapeNoise(x * 6 + y * 4, z * 6 - y * 3) - 0.55) * 2.2,
        lumps = 0.05 * (landscapeNoise(x * 2 + 5, z * 2 + y) - 0.5),
        r = 1 + lumps - 0.12 * pitting * pits;
      p.setXYZ(i, x * r, y * r * 0.9, z * r);
    }
    g.computeVertexNormals();
    return g;
  }, [pitting]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} position={[0, 0.7, 0]} scale={radius} castShadow receiveShadow>
      <SectionMaterial glsl={LIMESTONE} cacheKey="weathering-limestone" roughness={0.9} />
    </mesh>
  );
}

export default function Weathering() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const mode = Math.round(params.method ?? 0),
    ice = freezingJoint(t),
    dissolve = calciteDissolution(t),
    enlarge = trueScale ? 1 : 10,
    gap = mode === 0 ? (0.02 + (ice.jointWidth - 0.02) * enlarge) * 2 : 0.06 + 0.16 * t;
  const frozenHeight = (1.4 * ice.iceVolume) / (ice.iceVolume + ice.liquidVolume),
    liquidHeight = 1.4 - frozenHeight;
  const root = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          [0.02, 2.1, 0],
          [0, 1.6, 0],
          [-0.02, 1, 0],
          [0.03, 0.3, 0],
        ].map((p) => new THREE.Vector3(...p)),
      ),
    [],
  );
  return (
    <>
      <ScienceStudio
        horizon
        slug="weathering"
        camera={[2.6, 1.9, 6]}
        scale={
          mode === 0
            ? "Joint opening change ×10 · initial joint 20 mm wide · water mass fixed"
            : mode === 1
              ? "0.3 m initial calcite sphere · prescribed dissolution, not a rate law"
              : "Prescribed root thickening in an existing joint · 1 unit = 0.5 m"
        }
        trueScale="Common geometric scale · 1 scene unit = 0.5 m · particles enlarged"
      >
        {mode === 1 ? (
          <>
            <PittedLimestone radius={dissolve.radius * 2} pitting={Math.round(t * 20) / 20} />
            <mesh position={[0, 0.6, 0]}>
              <boxGeometry args={[2.3, 1.6, 1.8]} />
              <meshPhysicalMaterial
                color="#578e9b"
                transparent
                opacity={0.14}
                roughness={0.2}
                depthWrite={false}
              />
            </mesh>
            <lineSegments position={[0, 0.6, 0]}>
              <edgesGeometry args={[new THREE.BoxGeometry(2.3, 1.6, 1.8)]} />
              <lineBasicMaterial color="#cfe3e6" transparent opacity={0.6} />
            </lineSegments>
            {Array.from({ length: 20 }, (_, i) => {
              const a = i * 2.399,
                r = 0.65 + t * 0.45,
                y = 0.2 + ((i * 0.17 + t * 0.5) % 1) * 1.1;
              return (
                <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]}>
                  <sphereGeometry args={[0.025, 12, 10]} />
                  <meshBasicMaterial color={i % 3 ? "#a5c8b6" : "#d9c6a4"} />
                </mesh>
              );
            })}
            <Tag
              pos={[0, 1.95, 0]}
              text="Dissolved ions leave the solid"
              note="Calcite reacts with carbon dioxide and water to give dissolved calcium and bicarbonate. Symbol particles do not show actual ion size, concentration or stoichiometric counts."
              occlude={false}
            />
          </>
        ) : (
          <>
            {[-1, 1].map((side) => (
              <JointRock key={side} side={side} gap={gap} />
            ))}
            {mode === 0 ? (
              <>
                {t < 1 && (
                  <mesh position={[0, liquidHeight / 2, 0]}>
                    <boxGeometry args={[gap * 0.97, liquidHeight, 0.98]} />
                    <FlowWaterMaterial color="#4c8ba1" opacity={0.6} speed={0.08} />
                  </mesh>
                )}
                {t > 0 && (
                  <mesh position={[0, liquidHeight + frozenHeight / 2, 0]}>
                    <boxGeometry args={[gap * 0.97, frozenHeight, 0.98]} />
                    <meshPhysicalMaterial
                      color="#cfe6ee"
                      roughness={0.12}
                      clearcoat={1}
                      clearcoatRoughness={0.1}
                      transparent
                      opacity={0.9}
                    />
                  </mesh>
                )}
                <Tag
                  pos={[0, 1.95, 0]}
                  text={`${(t * 100).toFixed(0)}% of water mass frozen`}
                  note="A fixed water mass occupies about 9% more volume as ice. The joint walls are allowed to move in this geometric experiment; real cracking depends on confinement, water supply, stresses and rock strength. Ice segregation is another important frost-weathering mechanism."
                  occlude={false}
                />
              </>
            ) : (
              <>
                <mesh>
                  <tubeGeometry args={[root, 48, 0.024 + 0.08 * t, 16, false]} />
                  <meshStandardMaterial color="#997950" roughness={1} />
                </mesh>
                <NaturalTree position={[0.015, 1.7, 0]} kind="broadleaf" scale={0.32} seed={8} />
                <RootNetwork x={0} y={1.25} z={0.03} depth={1.15} spread={gap * 0.36} seed={7} />
                <Tag
                  pos={[1.1, 2.05, 0]}
                  text="Root growth can widen an existing joint"
                  note="The root and moving walls are a prescribed mechanism, not a growth-rate or force calculation. Roots, microbes and lichens also contribute chemical weathering."
                  occlude={false}
                />
              </>
            )}
            {t > 0 &&
              [-1, 1].map((side) => (
                <Arrow
                  key={side}
                  from={[side * 0.1, 0.7, 0.7]}
                  to={[side * (0.28 + 0.18 * t), 0.7, 0.7]}
                  color="#bed5d5"
                  width={1}
                />
              ))}
          </>
        )}
        <group position={[0, -0.02, 0]}>
          <GeomorphicTerrain
            height={(x, z) => 0.012 * (landscapeNoise(x * 4 + 3, z * 4) - 0.5)}
            colour={(x, y, z) => (landscapeNoise(x * 3, z * 3) > 0.55 ? "#6f8a49" : "#7f9752")}
            width={2.6}
            depth={2}
            base={-0.5}
            resolution={64}
            section={{ rock: "sandstone", soil: 0.08, regolith: 0.12, beds: 5.5, bedOffset: 0.2 }}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {MODES[mode]}.{" "}
        {mode === 0
          ? `Actual joint ${(ice.jointWidth * 1000).toFixed(2)} mm · liquid ${(ice.liquidVolume * 1000).toFixed(2)} L + ice ${(ice.iceVolume * 1000).toFixed(2)} L, from 7.00 kg water.`
          : mode === 1
            ? `Solid calcite ${dissolve.remainingMass.toFixed(1)} kg · dissolved calcite equivalent ${dissolve.dissolvedMass.toFixed(1)} kg.`
            : "Process widens an existing joint as a root thickens. The two rock pieces remain in place."}
        {mode === 1 && (
          <>
            {" "}
            <span className="formula">{"CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻."}</span>
          </>
        )}
        <br />
        {
          "Play illustrates progressive change, not elapsed years. Weathering changes rock in place; erosion transports the resulting material. No automatic fracture threshold is calculated."
        }
      </ScienceReadout>
    </>
  );
}
