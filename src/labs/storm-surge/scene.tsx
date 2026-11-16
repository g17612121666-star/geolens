import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabState } from "@/lib/store/lab-controls";
import { shelfSetup } from "@/lib/ocean-wave-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import {
  COAST,
  FLOOD_ROWS,
  FLOOD_STEPS,
  HALF,
  LAND,
  NX,
  NZ,
  X0,
  floodLimit,
  floorMetres,
} from "./coast";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";

export default function StormSurge() {
  const { params, trueScale } = useLabState("params", "trueScale"),
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
  /** A strip down the front face between two heights at each x, updated in place. */
  const strip = () => {
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
  };
  // Water on the front face: the still sea below mean sea level, then the water raised by the
  // low pressure, then the water piled up by the wind on top of it.
  const layers = useMemo(() => ({ still: strip(), pressure: strip(), wind: strip() }), []);
  useEffect(() => () => Object.values(layers).forEach((g) => g.dispose()), [layers]);
  /** The pressure part of the rise at x: the pressure drop grows steadily toward the coast. */
  const pressurePart = (x: number) =>
    result.inverseBarometer * THREE.MathUtils.clamp((x - X0) / (COAST - X0), 0, 1);
  useLayoutEffect(() => {
    const p = surface.attributes.position as THREE.BufferAttribute,
      chop = trueScale ? 0 : 0.004 + (wind / 45) * 0.012;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      // Wind waves are an optical cue only; the modeled setup is the smooth slope beneath them.
      const waves = chop * Math.sin(x * 26 + Math.sin(z * 5) * 2) * Math.sin(z * 19 + x * 4);
      p.setY(i, eta(x) * s + waves);
    }
    const set = (
      g: THREE.BufferGeometry,
      low: (x: number) => number,
      high: (x: number) => number,
    ) => {
      const q = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i <= NX; i++) {
        const x = X0 + (i / NX) * (COAST + 0.02 - X0),
          floorY = ground(x, HALF),
          top = Math.max(floorY, high(x)),
          bottom = Math.min(top, Math.max(floorY, low(x)));
        q.setXYZ(i * 2, x, bottom, HALF + 0.001);
        q.setXYZ(i * 2 + 1, x, top, HALF + 0.001);
      }
      q.needsUpdate = true;
      g.computeBoundingSphere();
    };
    set(
      layers.still,
      (x) => ground(x, HALF),
      () => 0,
    );
    set(
      layers.pressure,
      () => 0,
      (x) => pressurePart(x) * s,
    );
    set(
      layers.wind,
      (x) => pressurePart(x) * s,
      (x) => eta(x) * s,
    );
    p.needsUpdate = true;
    surface.computeVertexNormals();
    surface.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- eta and pressurePart are redefined each render and read only result, which is listed
  }, [result, s, wind, trueScale, surface, layers, ground]);

  // Low land the water at the coast can reach: a sheet at the coastal water level from the shore
  // to each row's flood limit, with its waterline, and the flood water on the front face.
  const level = result.coastalSetup;
  const flood = useMemo(() => {
    const limits = Array.from({ length: FLOOD_ROWS + 1 }, (_, j) => {
        const z = -HALF + (j / FLOOD_ROWS) * HALF * 2;
        return { z, x: floodLimit(level, z, depth) };
      }),
      y = level * s,
      positions: number[] = [],
      index: number[] = [];
    limits.forEach(({ z, x }, j) => {
      for (let i = 0; i <= FLOOD_STEPS; i++)
        positions.push(COAST - 0.02 + ((x - COAST + 0.02) * i) / FLOOD_STEPS, y + 0.002, z);
      if (j > 0)
        for (let i = 0; i < FLOOD_STEPS; i++) {
          const a = (j - 1) * (FLOOD_STEPS + 1) + i,
            b = a + FLOOD_STEPS + 1;
          index.push(a, b, a + 1, a + 1, b, b + 1);
        }
    });
    const sheet = new THREE.BufferGeometry();
    sheet.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    sheet.setIndex(index);
    sheet.computeVertexNormals();
    const front = limits[FLOOD_ROWS].x,
      face: number[] = [],
      faceIndex: number[] = [];
    for (let i = 0; i <= 40; i++) {
      const x = COAST + 0.02 + ((front - COAST - 0.02) * i) / 40;
      face.push(x, Math.min(y, ground(x, HALF)), HALF + 0.001, x, y, HALF + 0.001);
      if (i > 0) faceIndex.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
    }
    const column = new THREE.BufferGeometry();
    column.setAttribute("position", new THREE.Float32BufferAttribute(face, 3));
    column.setIndex(faceIndex);
    // Land beyond the dunes counts as flooded once the water has topped them.
    const overtopped = limits.some(({ z, x }) => x > COAST + 0.3 && Math.abs(z) < HALF - 0.1);
    return {
      sheet,
      column,
      overtopped,
      line: limits.map(({ z, x }) => [x, y + 0.004, z] as [number, number, number]),
    };
  }, [level, depth, s, ground]);
  useEffect(
    () => () => {
      flood.sheet.dispose();
      flood.column.dispose();
    },
    [flood],
  );

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
        scale="1 scene unit = 20 km · heights ×1000 · 100 km flat shelf · steady setup · flooding inland is a bathtub estimate · wind waves and town illustrative"
        trueScale="1 scene unit = 20 km · real sea-level rise is small beside shelf width"
      >
        <mesh geometry={floor} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="sand" color="#d4d4d4" vertexColors />
          <RockMaterial attach="material-1" color="#a99474" strata />
        </mesh>
        <mesh geometry={surface} receiveShadow>
          <FlowWaterMaterial color="#1f6580" opacity={0.88} flow={[1, 0.1]} speed={0.6} />
        </mesh>
        <mesh geometry={layers.still}>
          <meshPhysicalMaterial
            color="#2f7896"
            transparent
            opacity={0.3}
            roughness={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={layers.pressure}>
          <meshBasicMaterial
            color="#5fa6cf"
            transparent
            opacity={0.85}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={layers.wind}>
          <meshBasicMaterial
            color="#bfe9f2"
            transparent
            opacity={0.92}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh geometry={flood.sheet} receiveShadow>
          <FlowWaterMaterial color="#3f7d8f" opacity={0.86} flow={[1, 0.15]} speed={0.4} />
        </mesh>
        <mesh geometry={flood.column}>
          <meshBasicMaterial
            color="#bfe9f2"
            transparent
            opacity={0.9}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Surf at the waterline, wherever the water stops on the beach, dunes or plain. */}
        <Line points={flood.line} color="#f4f8f7" lineWidth={2.4} transparent opacity={0.9} />
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
          short={`Wind ${wind} m/s`}
          priority={1}
          note="Wind stress = air density × drag coefficient × wind speed², using 1.225 kg/m³ and a fixed drag coefficient of 0.0015. Whitecaps and clouds grow with the wind but are only illustrative."
          occlude={false}
        />
        <Tag
          pos={[gauge[0] - 0.45, Math.max(setupY, gaugeTop) + 0.2, gauge[1]]}
          text={`Setup ${result.coastalSetup.toFixed(2)} m`}
          priority={2}
          tone="sandstone"
          note={`${trueScale ? "At Physical scale the tide-gauge post is enlarged so it stays visible, and its bands are not to scale." : "Read the tide-gauge post: each red or white band is 1 m."} The gold ring marks the modeled water level at the coast. The offshore end is held at mean sea level (dashed line), the coast is closed, and the pressure drop is assumed to grow steadily from zero offshore to its full value at the coast.`}
          occlude={false}
        />
        <Tag
          pos={[0, -depth * s - 0.3, HALF]}
          text={`Shelf depth ${depth} m`}
          short={`Shelf ${depth} m`}
          priority={1}
          note="The shelf is flat. A shallow shelf lets the wind pile water up more. Real coastal bathymetry, storm track, duration, tide, Coriolis and wave breaking are excluded."
          occlude={false}
        />
        <Tag
          pos={[3.3, 0.85, -0.7]}
          text={flood.overtopped ? "Coast flooded · dunes overtopped" : "Low-lying coast"}
          short={flood.overtopped ? "Flooded" : "Coast"}
          tone={flood.overtopped ? "glacier" : undefined}
          note={`The town and dunes show what is exposed. ${flood.overtopped ? "The water at the coast is higher than the dune crest in places, so it pours over and floods the lower land behind. " : ""}Land lower than the water at the coast and open to the sea is shown flooded: a 'bathtub' estimate that assumes the surge lasts long enough to fill it. Real flooding also depends on how long the surge lasts, drainage and defenses; the model itself calculates the water level only up to the coastline.`}
          occlude={false}
        />
        {level > 0.6 && (
          <Tag
            pos={[COAST - 1.2, eta(COAST - 1.2) * s + 0.22, HALF + 0.02]}
            text="Water piled up by the storm"
            short="Piled-up water"
            priority={2}
            note="On the cut face, the pale band is water piled up by the wind and the blue band beneath it is the rise caused by the low air pressure. Both grow toward the coast; the dashed line is mean sea level."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {"Combined steady setup at the coast "}
        {result.coastalSetup.toFixed(2)} {"m · wind stress "}
        {result.stress.toFixed(2)} {"Pa · pressure drop "}
        {pressure} {"Pa ("}
        {(pressure / 100).toFixed(0)} {"hPa), pressure-only rise "}
        {result.inverseBarometer.toFixed(2)} {"m."} <br />
        <span style={{ color: "#5fa6cf" }} aria-hidden="true">
          {"■"}
        </span>
        {" Raised by low pressure · "}
        <span style={{ color: "#9fd8e6" }} aria-hidden="true">
          {"■"}
        </span>
        {
          " piled up by the wind. Read the combined setup on the striped tide-gauge post at the coast. Flooding shown inland is a bathtub estimate; tides, waves and flood duration are left out, so this is not a flood forecast."
        }
      </ScienceReadout>
    </>
  );
}
