import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { pressureCentreFlow } from "@/lib/circulation-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import { FlowWaterMaterial } from "../shared/flow-water";

/** Clouds along the example cold front (towering) and warm front (layered): [x, z, height 0–1]. */
const FRONT_CLOUDS: [number, number, number][] = [
  [0.5, 0.7, 0.9],
  [0.85, 1.3, 0.8],
  [0.85, 2.0, 0.7],
  [0.7, 2.6, 0.6],
  [0.7, 0.25, 0.3],
  [1.3, 0.1, 0.25],
  [1.9, -0.1, 0.2],
  [2.5, -0.5, 0.15],
];

/** An illustrative coastline and hills under the pressure pattern; relief is exaggerated. */
function regionHeight(x: number, z: number) {
  const land = fbm(x * 0.32 + 4, z * 0.32 - 1),
    coast = THREE.MathUtils.smoothstep(land, 0.42, 0.5);
  return (
    -0.05 * (1 - coast) +
    coast * (0.02 + 0.12 * Math.max(0, land - 0.55) + 0.012 * (fbm(x * 3, z * 3) - 0.5))
  );
}
function RegionMap() {
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(regionHeight, 6.8, 6.8, 220, -0.32),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (y < 0)
        col.set("#5f6e6c").lerp(tone.set("#cdb88c"), THREE.MathUtils.smoothstep(y, -0.05, -0.005));
      else col.copy(farmland(x * 1.3, z * 1.3, 0.36));
      if (y > 0.03 && fbm(x * 1.5 + 9, z * 1.5) > 0.6) col.lerp(tone.set("#4b673a"), 0.8);
      if (y > 0.05) col.lerp(tone.set("#7d7461"), THREE.MathUtils.smoothstep(y, 0.05, 0.08));
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 120 && i < 2500; i++) {
      const x = -3.3 + 6.6 * ((i * 0.618034) % 1),
        z = -3.3 + 6.6 * ((i * 0.7548777) % 1),
        y = regionHeight(x, z);
      if (y > 0.03 && fbm(x * 1.5 + 9, z * 1.5) > 0.62) out.push([x, y - 0.003, z]);
    }
    return out;
  }, []);
  const towns = useMemo(() => {
    const out = [];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.399,
        r = 0.8 + 2.3 * ((i * 0.618) % 1),
        x = r * Math.cos(a),
        z = r * Math.sin(a);
      if (regionHeight(x, z) > 0.015)
        out.push(...settlement(x, z, 7, 0.18, 0.05, i, (u, v) => regionHeight(u, v) > 0.01));
    }
    return out;
  }, []);
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <TerrainMaterial attach="material-1" kind="soil" color="#7a6450" />
      </mesh>
      <mesh position={[0, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.798, 6.798]} />
        <FlowWaterMaterial color="#1f5f7a" opacity={0.88} speed={0.2} />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.06} seed={13} />
      <Buildings items={towns} ground={regionHeight} />
    </group>
  );
}
export default function PressureCentres() {
  const { params, t } = useLabControls();
  useLabTick(1 / 30);
  const high = params.anti > 0.5,
    south = params.sh > 0.5,
    spin = (high ? -1 : 1) * (south ? -1 : 1);
  return (
    <>
      <ScienceStudio
        slug="cyclone-anticyclone"
        camera={[1.4, 6.7, 6]}
        scale="Idealised pressure centre · surface flow and vertical motion enlarged"
        trueScale="Arrows show the flow pattern, not measured wind speeds"
      >
        <RegionMap />
        <PressureDisc high={high} />
        {[0.65, 1.25, 1.85, 2.45, 3.05].map((r, k) =>
          k % 2 ? null : (
            <Tag
              key={`p-${r}`}
              pos={[r * Math.cos(0.6 + k * 0.5), 0.05, -r * Math.sin(0.6 + k * 0.5)]}
              text={`${high ? 1036 - k * 6 : 976 + k * 8} hPa`}
              note={`Isobar: a line joining places with the same surface pressure (${high ? 1036 - k * 6 : 976 + k * 8} hPa in this example pattern). ${high ? "Pressure is highest at the centre of the anticyclone." : "Pressure is lowest at the centre of the depression."}`}
              occlude={false}
            />
          ),
        )}
        {[0.65, 1.25, 1.85, 2.45, 3.05].map((r) => (
          <Line
            key={r}
            points={Array.from(
              { length: 129 },
              (_, i) =>
                [
                  r * Math.cos((i / 128) * Math.PI * 2),
                  Math.max(
                    0,
                    regionHeight(
                      r * Math.cos((i / 128) * Math.PI * 2),
                      -r * Math.sin((i / 128) * Math.PI * 2),
                    ),
                  ) + 0.015,
                  -r * Math.sin((i / 128) * Math.PI * 2),
                ] as [number, number, number],
            )}
            color={high ? "#c1b492" : "#829ea7"}
            lineWidth={1.3}
          />
        ))}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2,
            r = 1.5 + (i % 2) * 1,
            e = r * Math.cos(a),
            n = r * Math.sin(a),
            v = pressureCentreFlow(e, n, high, south);
          return (
            <Arrow
              key={i}
              from={[e, 0.12, -n]}
              to={[e + v.east * 0.25, 0.12, -n - v.north * 0.25]}
              color={high ? "#dfbf85" : "#8ed0df"}
              width={1}
            />
          );
        })}
        {Array.from({ length: 30 }, (_, i) => {
          const u = (t + i / 30) % 1,
            r = high ? 0.4 + u * 2.6 : 3 - u * 2.6,
            a = spin * (u * 5 + i * 2.4);
          return (
            <mesh key={i} position={[r * Math.cos(a), 0.14, -r * Math.sin(a)]}>
              <sphereGeometry args={[0.035, 12, 8]} />
              <meshBasicMaterial color={high ? "#dfbf85" : "#8ed0df"} />
            </mesh>
          );
        })}
        {!high &&
          Array.from({ length: 14 }, (_, i) => {
            const u = (t + i / 14) % 1,
              r = 2.85 - u * 1.8,
              a = spin * (u * 5 + i * 2.4);
            return (
              <CloudVolume
                key={i}
                position={[r * Math.cos(a), 0.46 + 0.7 * u, -r * Math.sin(a)]}
                scale={[0.5, 0.25 + 0.35 * u, 0.48]}
                density={24}
                seed={i + 7}
                opacity={0.43}
              />
            );
          })}
        {!high &&
          FRONT_CLOUDS.map(([x, z, tall], i) => (
            <group key={`f-${i}`}>
              <CloudVolume
                position={[x, 0.42 + tall * 0.35, z]}
                scale={[0.32, 0.18 + tall * 0.32, 0.32]}
                density={32}
                seed={i + 40}
                opacity={0.6}
              />
              <RainStreaks
                t={t}
                position={[x, 0.3, z]}
                width={0.22}
                depth={0.22}
                height={0.28}
                count={tall > 0.5 ? 22 : 12}
              />
            </group>
          ))}
        {high &&
          Array.from({ length: 12 }, (_, i) => {
            const a = i * 2.399,
              r = 1.6 + 1.2 * ((i * 0.618) % 1);
            return (
              <CloudVolume
                key={`cu-${i}`}
                position={[r * Math.cos(a), 0.55, -r * Math.sin(a)]}
                scale={[0.16, 0.1, 0.16]}
                density={24}
                seed={i + 80}
                opacity={0.7}
              />
            );
          })}
        <Arrow
          from={[0, high ? 1.8 : 0.2, 0]}
          to={[0, high ? 0.2 : 1.8, 0]}
          color={high ? "#dfbf85" : "#8ed0df"}
          width={2}
        />
        {!high && (
          <>
            <Line
              points={[
                [0.2, 0.04, 0.3],
                [0.8, 0.04, 1.1],
                [0.9, 0.04, 2],
                [0.6, 0.04, 2.9],
              ]}
              color="#76bacd"
              lineWidth={3}
            />
            <Line
              points={[
                [0.2, 0.04, 0.3],
                [1, 0.04, 0.2],
                [1.9, 0.04, -0.05],
                [2.8, 0.04, -0.65],
              ]}
              color="#d59486"
              lineWidth={3}
            />
          </>
        )}
        <Tag
          pos={[0, 2.1, 0]}
          text={high ? "H · sinking" : "L · rising"}
          note="Air converging at the surface under a low rises and flows out aloft; air diverging under a high is replaced by air sinking from above. The vertical arrow is exaggerated."
          occlude={false}
        />
        <Tag
          pos={[-2.5, 0.1, 2.6]}
          text={`${south ? "SH" : "NH"} · ${spin > 0 ? "anticlockwise" : "clockwise"}`}
          note="Viewed from above. Switching hemisphere reverses the spin, but a low still converges and a high still diverges near the surface."
          occlude={false}
        />
        {!high && (
          <Tag
            pos={[2.6, 0.1, 1.8]}
            text="Fronts · cold blue / warm coral"
            note="Example cold and warm fronts of a developing midlatitude depression, not a hurricane eyewall. Real fronts do not rotate rigidly like spokes. Open the Fronts lab to see their slopes."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {south ? "Southern" : "Northern"} {"hemisphere · "}
        {high
          ? "high pressure, surface divergence and sinking air"
          : "low pressure, surface convergence and rising air"}
        {". Spin is read from above."}
        <br />
        {high
          ? "Sinking air usually stops deep cloud forming, but fog or low cloud may persist. Follow the parcels spiralling out from the centre."
          : "Blue and coral lines mark example cold and warm fronts; this is a midlatitude depression, not a tropical cyclone. Follow the parcels spiralling in towards the rising centre."}
      </ScienceReadout>
    </>
  );
}

/** Radial pressure shading: blue (low) or warm (high) at the centre, fading outwards. */
function PressureDisc({ high }: { high: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.CircleGeometry(3.38, 96, 0, Math.PI * 2),
      p = g.attributes.position,
      colours = new Float32Array(p.count * 3),
      centre = new THREE.Color(high ? "#e5994f" : "#3f7fd0"),
      edge = new THREE.Color(high ? "#e8d3a6" : "#a9c8e2"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.copy(centre).lerp(edge, Math.min(1, Math.hypot(p.getX(i), p.getY(i)) / 3.38));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return g;
  }, [high]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
      <meshBasicMaterial vertexColors transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}
