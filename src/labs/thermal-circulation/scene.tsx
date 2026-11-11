import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { coastalContrast } from "@/lib/circulation-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { AirSection, FlowStreaks, WindFlag } from "./air";
import type { Cell } from "./cell";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { StarMesh } from "@/components/globe/star";

const W = 6,
  D = 2.8,
  BASE = -0.42;
const ss = (x: number, a: number, b: number) => THREE.MathUtils.smoothstep(x, a, b);

/** Coastal (sea left, land right) or all-land heights; hills rise inland. */
function heightFn(coast: boolean) {
  return (x: number, z: number) => {
    const hills = 0.16 * ss(x, 1.3, 2.9) * fbm(x * 1.2 + 2, z * 1.2);
    const land = 0.03 + 0.012 * (fbm(x * 3, z * 3) - 0.5) + hills;
    if (!coast) return land;
    const shore = 0.05 * Math.sin(z * 1.7);
    const u = ss(x, -0.65 + shore, 0.12 + shore);
    return -0.16 * (1 - u) + land * u - 0.03 * (1 - ss(x, -2.8, -0.6));
  };
}

/** City blocks: flat-roofed towers in a grid, instanced. */
function City({ ground }: { ground: (x: number, z: number) => number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const items = useMemo(() => {
    const out: { x: number; z: number; w: number; d: number; h: number; c: string }[] = [];
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 7; j++) {
        const x = -0.95 + i * 0.27,
          z = -1.05 + j * 0.32,
          k = Math.abs(Math.sin(i * 12.9 + j * 78.2) * 43758.5) % 1,
          center = Math.exp(-((x / 0.8) ** 2) - (z / 0.9) ** 2);
        out.push({
          x,
          z,
          w: 0.15 + 0.06 * k,
          d: 0.16 + 0.05 * ((k * 7) % 1),
          h: 0.08 + 0.5 * center * (0.5 + k),
          c: ["#9aa3a6", "#b4b0a6", "#7f8a90", "#c2c4c0", "#8e8475"][Math.floor(k * 5)],
        });
      }
    return out;
  }, []);
  useLayoutEffect(() => {
    const m = new THREE.Object3D(),
      col = new THREE.Color();
    items.forEach((b, i) => {
      m.position.set(b.x, ground(b.x, b.z) + b.h / 2, b.z);
      m.scale.set(b.w, b.h, b.d);
      m.updateMatrix();
      ref.current?.setMatrixAt(i, m.matrix);
      ref.current?.setColorAt(i, col.set(b.c));
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [items, ground]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.7} metalness={0.15} />
    </instancedMesh>
  );
}

export default function ThermalCirculation() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 50);
  const urban = params.urban > 0.5,
    coast = (params.landsea ?? 1) > 0.5 && !urban,
    c = coastalContrast(t * 24, urban, coast),
    // A contrast below 0.05 °C reads as 0.0 °C, so treat it as no circulation.
    direction = Math.abs(c.contrast) < 0.05 ? 0 : Math.sign(c.contrast),
    // Drawn strength of the loop, relative to the largest coastal contrast (4.3 °C).
    strength = Math.min(1, Math.abs(c.contrast) / 4.3),
    weak = Math.abs(c.contrast) < 1.5,
    f = trueScale ? 0.25 : 1,
    hour = t * 24;
  const height = useMemo(() => heightFn(coast), [coast]);
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(height, W, D, 200, BASE),
      p = g.attributes.position,
      col = new Float32Array(p.count * 3),
      cc = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i);
      if (y < -0.005) cc.set("#6d7a74").lerp(tone.set("#c9b58c"), ss(y, -0.14, -0.01));
      else if (coast && y < 0.035 && x < 0.4) cc.set("#e0cfa4");
      else if (urban && Math.abs(x) < 1.15) cc.set("#6c7072").lerp(tone.set("#6f8a4c"), 0.25);
      else cc.copy(farmland(x, z, 0.38));
      if (y > 0.12) cc.lerp(tone.set("#55703f"), 0.6);
      col.set([cc.r, cc.g, cc.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [height, coast, urban]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  // Circulation cells sized to the block: one for a coast, two for a city.
  const top = 1.25 * f,
    bottom = 0.14 * f + 0.04,
    cells: Cell[] = urban
      ? [
          { rise: 0, sink: -2.25, bottom, top },
          { rise: 0, sink: 2.25, bottom, top },
        ]
      : direction > 0
        ? [{ rise: 1.25, sink: -1.95, bottom, top }]
        : direction < 0
          ? // A land breeze is shallower and weaker than a sea breeze.
            [{ rise: -1.4, sink: 1.6, bottom, top: top * 0.7 }]
          : [];
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 60 && i < 900; i++) {
      const x = -2.9 + 5.8 * ((i * 0.618034) % 1),
        z = -1.3 + 2.6 * ((i * 0.7548777) % 1),
        y = height(x, z);
      if (y > 0.04 && !(urban && Math.abs(x) < 1.3) && fbm(x * 2.5, z * 2.5) > 0.55)
        out.push([x, y - 0.004, z]);
    }
    return out;
  }, [height, urban]);
  const village = useMemo(
    () => (urban ? [] : settlement(0.9, 0.35, 14, 0.4, 0.07, 4, (x) => x > 0.4)),
    [urban],
  );
  // The Sun crosses the sky between 06:00 and 18:00 local time.
  const day = (hour - 6) / 12,
    sunUp = day > 0 && day < 1,
    sunPos: [number, number, number] = [
      -3.4 * Math.cos(Math.PI * day),
      0.4 + 2.6 * Math.sin(Math.PI * day),
      -1.6,
    ];
  const cumulus = Math.abs(c.contrast) > 1.2;
  return (
    <>
      <ScienceStudio
        slug="thermal-circulation"
        camera={[1.6, 3.3, 7.5]}
        scale="Height ×4 · temperatures set by the model · trees, buildings and clouds not to scale"
        trueScale="Model area 20 km wide and 2 km deep · trees and buildings enlarged"
      >
        <mesh geometry={geometry} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
          <TerrainMaterial attach="material-1" kind="soil" color="#7a6450" />
        </mesh>
        {coast && (
          <mesh position={[-1.4, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[3.2, D]} />
            <FlowWaterMaterial
              color="#1f5f7a"
              opacity={0.86}
              flow={[direction * 0.4, 0.1]}
              speed={0.3}
            />
          </mesh>
        )}
        {urban && <City ground={height} />}
        <Buildings items={village} ground={height} />
        <PlantStand kind="broadleaf" positions={trees} scale={0.1} seed={3} />
        {sunUp && (
          <group position={sunPos}>
            <StarMesh radius={0.16} />
          </group>
        )}
        <AirSection
          contrast={c.contrast}
          strength={direction === 0 ? 0 : strength}
          urban={urban}
          city={0}
          factor={f}
          width={W}
          depth={D}
          top={1.7 * f}
        />
        {cells.length > 0 && <FlowStreaks cells={cells} strength={strength} />}
        {coast && (
          <WindFlag position={[0.05, height(0.05, 1.05), 1.05]} wind={direction * strength} />
        )}
        {urban && <WindFlag position={[-1.9, height(-1.9, 1.05), 1.05]} wind={strength} />}
        {cumulus &&
          cells.map((cell, ci) =>
            [0, 1].map((i) => (
              <CloudVolume
                key={`${ci}-${i}`}
                position={[cell.rise + (i - 0.5) * 0.4, cell.top + 0.2 * f + 0.06, (i - 0.5) * 0.9]}
                scale={[0.36, 0.24 + 0.05 * i, 0.32]}
                seed={ci * 5 + i * 7 + 2}
                opacity={0.75}
              />
            )),
          )}
        <Line
          points={[
            [-W / 2, 0.003, D / 2 + 0.01],
            [W / 2, 0.003, D / 2 + 0.01],
          ]}
          color="#f3efe2"
          lineWidth={0.8}
          dashed
          dashSize={0.06}
          gapSize={0.05}
        />
        <Tag
          pos={[urban ? -2.1 : -1.7, 0.12, 1.6]}
          text={`${urban ? "Rural" : coast ? "Sea" : "Left"} ${c.left.toFixed(1)} °C`}
          note="These temperatures follow a set daily cycle; they are not calculated from an energy budget. Water warms and cools more slowly than land."
          occlude={false}
        />
        <Tag
          pos={[urban ? 0 : 1.7, urban ? 0.75 : 0.2, 1.6]}
          text={`${urban ? "City" : coast ? "Land" : "Right"} ${c.right.toFixed(1)} °C`}
          note="Warmer air expands and rises; the pressure differences this creates drive the loop. Cumulus clouds often build where air rises over the warmer side. Real breezes also depend on background wind, moisture and terrain."
          occlude={false}
        />
        <Tag
          pos={[0, 1.7 * f + 0.25, -D / 2]}
          text={
            direction === 0
              ? "Equal heating · no loop"
              : urban
                ? "Surface flow → toward the warmer city"
                : direction > 0
                  ? "Sea breeze · surface flow → onshore"
                  : "Land breeze · surface flow ← offshore"
          }
          note="Heated air expands, so above the warm side the pressure surfaces (white lines at the back) bulge upward: aloft the pressure is higher over the warm side, near the ground lower. Air flows from higher to lower pressure, so it moves toward the warm side along the ground, rises there, returns aloft and sinks over the cool side. Loop height and speed are illustrative."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Local hour "}
        {hour.toFixed(1)} {"· right minus left "}
        {c.contrast.toFixed(1)} {"°C. "}
        {urban
          ? "Urban heat island: surface air flows from the cooler countryside toward the warmer city, where it rises. (Urban heat replaces the coast while it is on.)"
          : !coast
            ? "Both settings are off: equal temperature gives no thermal circulation."
            : direction === 0
              ? "Sea and land are equally warm: no thermal circulation while the breeze changes direction."
              : direction > 0
                ? `${weak ? "Weak sea breeze" : "Sea breeze"}: land warmer than sea, surface flow onshore.`
                : `${weak ? "Weak land breeze" : "Land breeze"}: land cooler than sea, surface flow offshore.`}{" "}
        <br />
        {
          "Play runs through a daily heating cycle; the Sun marks the hour. In real weather the night-time reversal does not always happen."
        }
      </ScienceReadout>
    </>
  );
}
