import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { shelfSetup } from "@/lib/ocean-wave-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";

/** 1 scene unit = 20 km across the shelf; heights in meters are multiplied by `f / 20000`. */
const X0 = -2.5,
  COAST = 2.5,
  LAND = 3.5,
  HALF = 1.1,
  NX = 120,
  NZ = 22;

/** Sea floor and land in meters: a flat shelf, a short beach, dunes, then a low coastal plain. */
function floorMetres(x: number, z: number, depth: number) {
  if (x < COAST - 0.14)
    return -depth + 0.35 * Math.sin(x * 40 + 3 * Math.sin(z * 4)) * (fbm(x * 2, z * 2) + 0.3);
  if (x < COAST + 0.06) {
    const u = (x - (COAST - 0.14)) / 0.2;
    return -depth + (depth + 1.2) * u * u * (3 - 2 * u);
  }
  const inland = x - COAST - 0.06,
    dune = 3.2 * Math.exp(-(((inland - 0.07) / 0.05) ** 2)) * (0.8 + 0.4 * fbm(z * 6, 1));
  return (
    1.2 +
    dune +
    Math.min(1, inland / 0.25) * 2 +
    4 * Math.max(0, inland - 0.55) +
    1.2 * (fbm(x * 3, z * 3) - 0.5)
  );
}

export default function StormSurge() {
  const { params, trueScale } = useLabControls(),
    wind = params.wind ?? 30,
    depth = params.depth ?? 20,
    pressure = params.pressure ?? 3000,
    f = trueScale ? 1 : 1000,
    s = f / 20000;
  const result = useMemo(() => shelfSetup(wind, depth, pressure), [wind, depth, pressure]);
  const eta = (x: number) => {
    const i = THREE.MathUtils.clamp(
      ((x - X0) / (COAST - X0)) * (result.points.length - 1),
      0,
      result.points.length - 1,
    );
    return result.points[Math.round(i)].eta;
  };
  const ground = useMemo(() => (x: number, z: number) => floorMetres(x, z, depth) * s, [depth, s]);
  const base = -depth * s - 0.12;
  const floor = useMemo(() => {
    const g = terrainBlockGeometry(
      (x, z) => ground(x + (X0 + LAND) / 2, z),
      LAND - X0,
      HALF * 2,
      200,
      base,
    );
    g.translate((X0 + LAND) / 2, 0, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        m = floorMetres(x, z, depth),
        n = fbm(x * 5, z * 5);
      if (m < 0.5)
        col
          .set("#b59f78")
          .lerp(tone.set("#d8c49b"), THREE.MathUtils.smoothstep(m, -depth * 0.6, 0.5));
      else if (m < 2.2) col.set("#e2d3ab");
      else if (x < COAST + 0.2) col.set("#9aa565").lerp(tone.set("#cdbf8e"), n * 0.6);
      else col.copy(farmland(x * 1.5, z * 1.5, 0.45));
      col.multiplyScalar(0.9 + 0.2 * n);
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [ground, base, depth]);
  useEffect(() => () => floor.dispose(), [floor]);

  const surface = useMemo(() => {
    const g = new THREE.PlaneGeometry(COAST + 0.02 - X0, HALF * 2, NX, NZ);
    g.rotateX(-Math.PI / 2);
    g.translate((X0 + COAST + 0.02) / 2, 0, 0);
    (g.attributes.position as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
    return g;
  }, []);
  useEffect(() => () => surface.dispose(), [surface]);
  const column = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array((NX + 1) * 2 * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const idx: number[] = [];
    for (let i = 0; i < NX; i++)
      idx.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    g.setIndex(idx);
    return g;
  }, []);
  useEffect(() => () => column.dispose(), [column]);
  useLayoutEffect(() => {
    const p = surface.attributes.position as THREE.BufferAttribute,
      q = column.attributes.position as THREE.BufferAttribute,
      chop = trueScale ? 0 : 0.004 + (wind / 45) * 0.012;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      // Wind waves are an optical cue only; the modeled setup is the smooth slope beneath them.
      const waves = chop * Math.sin(x * 26 + Math.sin(z * 5) * 2) * Math.sin(z * 19 + x * 4);
      p.setY(i, eta(x) * s + waves);
    }
    for (let i = 0; i <= NX; i++) {
      const x = X0 + (i / NX) * (COAST + 0.02 - X0);
      q.setXYZ(i * 2, x, Math.min(ground(x, HALF), eta(x) * s), HALF);
      q.setXYZ(i * 2 + 1, x, eta(x) * s, HALF);
    }
    p.needsUpdate = true;
    q.needsUpdate = true;
    surface.computeVertexNormals();
    column.computeBoundingSphere();
    surface.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eta is redefined each render and reads only result, which is listed
  }, [result, s, wind, trueScale, surface, column, ground]);

  const town = useMemo(
    () =>
      settlement(
        3.08,
        0,
        34,
        0.75,
        0.07,
        4,
        (x, z) => x > COAST + 0.3 && x < LAND - 0.06 && Math.abs(z) < HALF - 0.06,
      ),
    [],
  );
  const palms = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 16; i++) {
      const z = -HALF + 0.08 + (i / 15) * (HALF * 2 - 0.16),
        x = COAST + 0.2 + 0.05 * Math.sin(i * 2.7);
      out.push([x, ground(x, z) - 0.005, z]);
    }
    return out;
  }, [ground]);
  const gauge: [number, number] = [COAST - 0.06, 0.62];
  const gaugeBase = ground(gauge[0], gauge[1]),
    gaugeTop = Math.max(8 * s, 0.25),
    bands = Math.ceil((gaugeTop - gaugeBase) / Math.max(s, 0.01));
  const setupY = result.coastalSetup * s;
  return (
    <>
      <ScienceStudio
        slug="storm-surge"
        camera={[1.2, 2.8, 6.4]}
        scale="1 scene unit = 20 km · heights ×1000 · 100 km flat shelf · steady setup · wind waves and town illustrative"
        trueScale="1 scene unit = 20 km · real sea-level rise is small beside shelf width"
      >
        <mesh geometry={floor} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="sand" color="#d4d4d4" vertexColors />
          <RockMaterial attach="material-1" color="#a99474" strata />
        </mesh>
        <mesh geometry={surface} receiveShadow>
          <FlowWaterMaterial color="#1f6580" opacity={0.88} flow={[1, 0.1]} speed={0.6} />
        </mesh>
        <mesh geometry={column}>
          <meshPhysicalMaterial
            color="#2f7896"
            transparent
            opacity={0.3}
            roughness={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Line
          points={Array.from({ length: NX + 1 }, (_, i) => {
            const x = X0 + (i / NX) * (COAST - X0);
            return [x, eta(x) * s + 0.003, HALF + 0.003] as [number, number, number];
          })}
          color="#a8e2ee"
          lineWidth={2}
        />
        <Line
          points={[
            [X0, 0.002, HALF + 0.004],
            [COAST, 0.002, HALF + 0.004],
          ]}
          color="#f3efe2"
          lineWidth={1.2}
          dashed
          dashSize={0.07}
          gapSize={0.04}
        />
        <group position={[gauge[0], 0, gauge[1]]}>
          {Array.from({ length: Math.max(1, bands) }, (_, k) => {
            const y0 = gaugeBase + k * Math.max(s, 0.01),
              h = Math.min(Math.max(s, 0.01), gaugeTop - y0);
            return h > 0 ? (
              <mesh key={k} position={[0, y0 + h / 2, 0]}>
                <cylinderGeometry args={[0.014, 0.014, h, 10]} />
                <meshStandardMaterial color={k % 2 ? "#f2efe6" : "#c8412f"} roughness={0.6} />
              </mesh>
            ) : null;
          })}
          <mesh position={[0, setupY, 0]}>
            <torusGeometry args={[0.03, 0.006, 8, 24]} />
            <meshBasicMaterial color="#ffd36b" />
          </mesh>
        </group>
        <PlantStand kind="palm" positions={palms} scale={0.09} seed={2} />
        <Buildings items={town} ground={ground} />
        {wind > 0 &&
          [-0.55, 0, 0.55].flatMap((z) =>
            [0.55, 0.8].map((h) => (
              <Line
                key={`${z}-${h}`}
                points={Array.from(
                  { length: 65 },
                  (_, i) =>
                    [-2.35 + (i / 64) * 4.65, h + 0.012 * Math.sin(i * 0.6 + z), z] as [
                      number,
                      number,
                      number,
                    ],
                )}
                color="#d8d7c0"
                transparent
                opacity={0.12 + (wind / 45) * 0.28}
                lineWidth={0.6 + wind / 45}
              />
            )),
          )}
        {wind > 0 &&
          [-1.5, 0, 1.5].map((x) => (
            <Arrow
              key={x}
              from={[x - 0.35, 0.7, 0]}
              to={[x + 0.35, 0.7, 0]}
              color="#d9b57e"
              width={1.2}
            />
          ))}
        {wind >= 15 &&
          [
            [-2, 1.15, -0.5],
            [-1.1, 1.3, 0.3],
            [-0.2, 1.2, -0.6],
            [0.8, 1.35, 0.2],
          ].map((p, i) => (
            <CloudVolume
              key={i}
              position={p as [number, number, number]}
              scale={[0.7, 0.22, 0.45]}
              seed={i * 5 + 2}
              opacity={0.35 + (wind / 45) * 0.35}
            />
          ))}
        <Tag
          pos={[-1.8, 1.0, 0]}
          text={`Onshore wind ${wind} m/s`}
          note="Wind stress = air density × drag coefficient × wind speed², using 1.225 kg/m³ and a fixed drag coefficient of 0.0015. Whitecaps and clouds grow with the wind but are only illustrative."
          occlude={false}
        />
        <Tag
          pos={[gauge[0] - 0.45, Math.max(setupY, gaugeTop) + 0.2, gauge[1]]}
          text={`Setup ${result.coastalSetup.toFixed(2)} m`}
          tone="sandstone"
          note={`${trueScale ? "At Physical scale the tide-gauge post is enlarged so it stays visible, and its bands are not to scale." : "Read the tide-gauge post: each red or white band is 1 m."} The gold ring marks the modeled water level at the coast. The offshore end is held at mean sea level (dashed line), the coast is closed, and the pressure drop is assumed to grow steadily from zero offshore to its full value at the coast.`}
          occlude={false}
        />
        <Tag
          pos={[0, -depth * s - 0.3, HALF]}
          text={`Shelf depth ${depth} m`}
          note="The shelf is flat. A shallow shelf lets the wind pile water up more. Real coastal bathymetry, storm track, duration, tide, Coriolis and wave breaking are excluded."
          occlude={false}
        />
        <Tag
          pos={[3.3, 0.85, -0.7]}
          text="Low-lying coast"
          note="The town and dunes show what is exposed. The model holds the water at the coastline; it does not calculate flooding inland."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Combined steady setup at the coast "}
        {result.coastalSetup.toFixed(2)} {"m · wind stress "}
        {result.stress.toFixed(2)} {"Pa · pressure drop "}
        {pressure} {"Pa ("}
        {(pressure / 100).toFixed(0)} {"hPa), pressure-only rise "}
        {result.inverseBarometer.toFixed(2)} {"m."}
        <br />
        {
          "Read the combined setup on the striped tide-gauge post at the coast. Tides, waves and inland flooding are left out, so this is not a flood forecast."
        }
      </ScienceReadout>
    </>
  );
}
