import { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { longWaveTransect, longWaveElevation } from "@/lib/ocean-wave-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { RockMaterial } from "../shared/rock-material";
import { TerrainMaterial, PlantStand } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";

const TRANSECT = longWaveTransect();
/** 1 scene unit = 100 km horizontally. The ocean runs from x = -2.5 (source) to 2.5 (shelf). */
const X0 = -2.5,
  X1 = 2.5,
  COAST = 2.62,
  LAND = 3.45,
  HALF = 1.15,
  BASE_M = 6200,
  LAND_RELIEF = 4;

/** Water depth in metres along the 1-D transect, with a beach and coastal plain beyond it. */
function transectDepth(x: number) {
  if (x >= X1) return 100 - (x - X1) * 1100;
  const i = THREE.MathUtils.clamp(((x - X0) * 100000) / 2000, 0, TRANSECT.points.length - 1.0001),
    k = Math.floor(i),
    f = i - k;
  return TRANSECT.points[k].depth * (1 - f) + TRANSECT.points[k + 1].depth * f;
}

/** Seafloor or land height in metres; seamounts and canyons fade to the exact transect at the front. */
function floorMetres(x: number, z: number) {
  const front = 1 - THREE.MathUtils.smoothstep(z, HALF - 0.45, HALF - 0.05);
  let y = -transectDepth(x);
  if (x > COAST) {
    const inland = x - COAST;
    y = 4 + 60 * Math.min(1, inland / 0.5) ** 1.5 + 50 * (fbm(x * 2.5, z * 2.5) - 0.5) * inland;
  }
  const deep = 1 - THREE.MathUtils.smoothstep(x, -0.3, 0.6);
  const seamounts =
    1500 * Math.exp(-(((x + 1.4) / 0.22) ** 2) - ((z + 0.5) / 0.22) ** 2) +
    900 * Math.exp(-(((x + 0.6) / 0.16) ** 2) - ((z - 0.15) / 0.18) ** 2);
  const trench = -1600 * Math.exp(-(((x - X0 + 0.02) / 0.09) ** 2));
  const canyon = x > 0.7 && x < X1 ? -260 * Math.exp(-(((z + 0.35 + 0.1 * x) / 0.07) ** 2)) : 0;
  const roughness = 120 * (fbm(x * 3 + 2, z * 3) - 0.5);
  return y + front * (deep * (seamounts + roughness) + trench + canyon);
}

export default function Tsunami() {
  const { t, trueScale } = useLabControls();
  useLabTick(1 / 55);
  const source = t < 0.15,
    uplift = Math.min(1, t / 0.15),
    seconds = Math.max(0, (t - 0.15) / 0.85) * (TRANSECT.totalTravel + 1200),
    f = trueScale ? 1 : 20,
    lift = trueScale ? 1 : 600,
    toY = (m: number) => (m / 100000) * f,
    floorY = (m: number) => toY(m > 0 ? m * LAND_RELIEF : m),
    waveY = (m: number) => (m / 100000) * f * lift;
  // Drawn rise of the uplifted seafloor block: enlarged, but always well below the sea surface.
  const rise = uplift * 0.15 * Math.abs(toY(-4000)),
    sunk = 0.04 * Math.abs(toY(-4000));
  const sourceShape = (x: number) => Math.exp((-x * x) / (2 * 50000 ** 2));
  const elevation = (p: (typeof TRANSECT.points)[number]) =>
    source ? uplift * sourceShape(p.x) : longWaveElevation(p, seconds);

  const floor = useMemo(() => {
    const g = terrainBlockGeometry(
      (x, z) => floorY(floorMetres(x + (X0 + LAND) / 2, z)),
      LAND - X0,
      HALF * 2,
      200,
      toY(-BASE_M),
    );
    g.translate((X0 + LAND) / 2, 0, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        m = floorMetres(x, z),
        n = fbm(x * 4, z * 4);
      if (m > 0) {
        col.copy(farmland(x * 1.6, z * 1.6, 0.5));
        if (m < 12) col.lerp(tone.set("#d9c79f"), 0.9);
      } else {
        const depth = -m;
        col
          .set("#4f4a45")
          .lerp(tone.set("#7c6d58"), 1 - THREE.MathUtils.smoothstep(depth, 200, 3000))
          .lerp(tone.set("#b9a27a"), 1 - THREE.MathUtils.smoothstep(depth, 60, 260));
        col.multiplyScalar(0.88 + 0.24 * n);
      }
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- floorY and toY are redefined each render and read only f, which is listed
  }, [f]);
  useEffect(() => () => floor.dispose(), [floor]);

  // Free surface: one row per transect point, plus a short stretch over the beach.
  const xs = useMemo(
    () => [
      ...TRANSECT.points.map((p) => p.x / 100000 + X0),
      ...Array.from({ length: 8 }, (_, i) => X1 + ((i + 1) / 8) * (COAST + 0.04 - X1)),
    ],
    [],
  );
  const NZ = 24;
  const water = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      pos = new Float32Array(xs.length * NZ * 3),
      uv = new Float32Array(xs.length * NZ * 2),
      col = new Float32Array(xs.length * NZ * 3),
      idx: number[] = [],
      deep = new THREE.Color("#0f3d5c"),
      shallow = new THREE.Color("#3f9fb0"),
      c = new THREE.Color();
    xs.forEach((x, i) => {
      for (let j = 0; j < NZ; j++) {
        const z = -HALF + (j / (NZ - 1)) * HALF * 2,
          k = i * NZ + j;
        pos.set([x, 0, z], k * 3);
        uv.set([(x - X0) / 2, z / 2], k * 2);
        c.copy(deep).lerp(shallow, 1 - THREE.MathUtils.smoothstep(transectDepth(x), 60, 2500));
        col.set([c.r, c.g, c.b], k * 3);
        if (i < xs.length - 1 && j < NZ - 1) idx.push(k, k + 1, k + NZ, k + 1, k + NZ + 1, k + NZ);
      }
    });
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }, [xs]);
  useEffect(() => () => water.dispose(), [water]);
  // Front face of the water column, from the bed to the free surface at z = HALF.
  const column = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(xs.length * 2 * 3), 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    const idx: number[] = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    g.setIndex(idx);
    return g;
  }, [xs]);
  useEffect(() => () => column.dispose(), [column]);
  const heights = useMemo(
    () =>
      xs.map((x, i) => {
        const p = TRANSECT.points[Math.min(i, TRANSECT.points.length - 1)],
          // Over the beach the drawn surface eases back to sea level: run-up is not modelled.
          ease = 1 - THREE.MathUtils.smoothstep(x, X1, COAST + 0.04);
        return waveY(elevation(p)) * ease;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- waveY and elevation are redefined each render and read only source, uplift, seconds, f and lift, which are listed
    [xs, source, uplift, seconds, f, lift],
  );
  useLayoutEffect(() => {
    const p = water.attributes.position as THREE.BufferAttribute,
      q = column.attributes.position as THREE.BufferAttribute;
    xs.forEach((x, i) => {
      for (let j = 0; j < NZ; j++) p.setY(i * NZ + j, heights[i]);
      q.setXYZ(i * 2, x, floorY(floorMetres(x, HALF)), HALF);
      q.setXYZ(i * 2 + 1, x, Math.max(heights[i], floorY(floorMetres(x, HALF))), HALF);
    });
    p.needsUpdate = true;
    q.needsUpdate = true;
    water.computeVertexNormals();
    water.computeBoundingSphere();
    column.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- floorY is redefined each render from f; heights (listed) is recomputed whenever f changes
  }, [heights, water, column, xs]);

  const crest = TRANSECT.points.reduce(
    (best, p) => (Math.abs(p.travel - seconds) < Math.abs(best.travel - seconds) ? p : best),
    TRANSECT.points[0],
  );
  const crestX = crest.x / 100000 + X0;
  const ground = useMemo(
    () => (x: number, z: number) => floorY(floorMetres(x, z)),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- floorY is redefined each render and reads only f, which is listed
    [f],
  );
  const town = useMemo(
    () =>
      settlement(
        3.0,
        0.05,
        30,
        0.6,
        0.05,
        2,
        (x, z) => x > COAST + 0.12 && x < LAND - 0.05 && Math.abs(z) < HALF - 0.05,
      ),
    [],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 50 && i < 600; i++) {
      const x = COAST + 0.25 + (LAND - COAST - 0.3) * ((i * 0.618034) % 1),
        z = -HALF + 0.05 + (HALF * 2 - 0.1) * ((i * 0.7548777) % 1);
      if (fbm(x * 3, z * 3) > 0.58 && Math.hypot(x - 3.0, z - 0.05) > 0.35)
        out.push([x, ground(x, z) - 0.003, z]);
    }
    return out;
  }, [ground]);

  const profile = TRANSECT.points.map((p) => ({
      x: 30 + (p.x / TRANSECT.length) * 540,
      y: 55 - elevation(p) * 25,
    })),
    trace = profile.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`).join(" ");
  return (
    <>
      <ScienceStudio
        slug="tsunami"
        camera={[1.6, 3.2, 6.4]}
        scale="1 scene unit = 100 km · depth ×20 · wave height a further ×600 · land relief ×80 · seamounts, canyon and town illustrative"
        trueScale="Depth and wave at one common scale · a metres-high wave is invisible over 4 km of water"
      >
        <mesh geometry={floor} castShadow receiveShadow>
          <TerrainMaterial attach="material-0" kind="sand" color="#d2d2d2" vertexColors />
          <RockMaterial attach="material-1" color="#a28d73" strata />
        </mesh>
        <mesh geometry={water} receiveShadow>
          <FlowWaterMaterial
            color="#ffffff"
            vertexColors
            opacity={0.82}
            flow={[1, 0.15]}
            speed={0.35}
          />
        </mesh>
        <mesh geometry={column}>
          <meshPhysicalMaterial
            color="#2f7896"
            transparent
            opacity={0.32}
            roughness={0.4}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
        <Line
          points={xs.map(
            (x, i) => [x, heights[i] + 0.002, HALF + 0.002] as [number, number, number],
          )}
          color="#a8e2ee"
          lineWidth={2}
        />
        <PlantStand kind="palm" positions={trees} scale={0.06} seed={3} />
        <Buildings items={town} ground={ground} />
        {source ? (
          <>
            {/* Uplifted block of seafloor under the source; its rise is enlarged to be visible. */}
            <mesh position={[X0 + 0.32, toY(-4000) - sunk + (sunk + rise) / 2, 0]}>
              <boxGeometry args={[0.6, sunk + rise, HALF * 2 - 0.01]} />
              <meshStandardMaterial color="#ddbb7f" roughness={0.8} />
            </mesh>
            <Arrow
              from={[X0 + 0.32, toY(-4000) + 0.02, HALF + 0.06]}
              to={[X0 + 0.32, toY(-4000) + 0.2 + uplift * 0.45, HALF + 0.06]}
              color="#ddbb7f"
              width={2}
            />
            <Tag
              pos={[X0 + 0.32, 0.05, HALF]}
              text="Seafloor uplift (enlarged)"
              tone="sandstone"
              note="Sudden slip on the fault pushes the seafloor up by about 1 m in a few minutes. The whole water column above is lifted, making a broad hump on the sea surface. The gold block and arrow show this uplift, greatly enlarged."
              occlude={false}
            />
          </>
        ) : (
          <>
            <Line
              points={Array.from(
                { length: 13 },
                (_, j) =>
                  [crestX, waveY(elevation(crest)) + 0.012, -HALF + (j / 12) * HALF * 2] as [
                    number,
                    number,
                    number,
                  ],
              )}
              color="#f0c46e"
              lineWidth={3}
            />
            <Line
              points={[
                [crestX, waveY(elevation(crest)), HALF + 0.004],
                [crestX, toY(-crest.depth), HALF + 0.004],
              ]}
              color="#f0c46e"
              lineWidth={1.5}
              dashed
              dashSize={0.025}
              gapSize={0.018}
            />
          </>
        )}
        <Tag
          pos={[-1.7, 0.45, -0.4]}
          text="Deep ocean · 4000 m"
          note="An idealised offshore disturbance sends out a 20-minute wave packet with a 0.5 m amplitude. In deep water the wave is fast (about 200 m/s) but low. Seamounts and the trench are illustrative; the front face follows the modelled depth profile exactly."
          occlude={false}
        />
        <Tag
          pos={[1.8, 0.45, -0.4]}
          text="Shelf · 100–200 m"
          note="Wave speed is √(g h), so it falls as the water shallows. Green’s law makes the amplitude grow as depth to the power −1/4, which keeps the wave’s energy flux constant while depth changes slowly."
          occlude={false}
        />
        <Tag
          pos={[3.15, -0.2, HALF]}
          text="Coast · run-up not modelled"
          note="The coastal town shows what is at risk. This model stops at 100 m depth; breaking, run-up and inundation are not calculated."
          occlude={false}
        />
        {!source && (
          <Tag
            pos={[crestX, waveY(elevation(crest)) + 0.3, HALF]}
            text={`${crest.speed.toFixed(0)} m/s`}
            tone="sandstone"
            note="Speed of the wave crest at this depth: c = √(g h). It slows as the water shallows, so the wave bunches up and grows taller."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 600 125"
          className="mx-auto h-24 w-full"
          role="img"
          aria-label={
            "Sea-surface displacement in metres across a 500 kilometre transect; vertical axis minus two to plus two metres"
          }
        >
          {[-2, 0, 2].map((y) => (
            <g key={y}>
              <line
                x1="30"
                x2="570"
                y1={55 - y * 25}
                y2={55 - y * 25}
                stroke="#526662"
                strokeDasharray={y === 0 ? undefined : "3 5"}
              />
              <text x="2" y={59 - y * 25} fill="var(--color-mist)" fontSize="11">
                {y} {"m"}
              </text>
            </g>
          ))}
          <polyline points={trace} fill="none" stroke="var(--color-ice)" strokeWidth="2" />
          <text x="32" y="122" fill="var(--color-mist)" fontSize="11">
            {"0 km"}
          </text>
          <text x="525" y="122" fill="var(--color-mist)" fontSize="11">
            {"500 km"}
          </text>
        </svg>
        {source
          ? `Source stage: the seafloor rises ${uplift.toFixed(2)} m and lifts the water above it by the same amount. The gold block and arrow show the uplift (enlarged). The hump then splits into two waves of about half its height; this transect follows the one heading for the coast.`
          : `Propagation stage: ${(seconds / 60).toFixed(1)} min · crest ${crest.speed.toFixed(1)} m/s at ${crest.depth.toFixed(0)} m depth. The central crest reaches 100 m depth at ${(TRANSECT.totalTravel / 60).toFixed(1)} min.`}
        <br />
        {
          "Two stages: a set seafloor uplift, then a simple long-wave model. The gold line follows the crest; the chart shows the true sea-surface height in metres. Fault rupture, breaking, run-up and inundation are not modelled."
        }
      </ScienceReadout>
    </>
  );
}
