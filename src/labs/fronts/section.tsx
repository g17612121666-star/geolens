import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { frontSection } from "@/lib/front-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { Buildings } from "../shared/hazard-parts";
import { farmland, fbm, settlement } from "../shared/hazard-utils";

function airVolume(bottom: (x: number) => number, top: (x: number) => number, factor: number) {
  const shape = new THREE.Shape(),
    samples = Array.from({ length: 193 }, (_, i) => -300 + (i / 192) * 600);
  const occupied = samples
    .map((x, i) => (top(x) - bottom(x) > 1e-6 ? i : -1))
    .filter((i) => i >= 0);
  if (!occupied.length) return new THREE.BufferGeometry();
  const points = samples.slice(
    Math.max(0, occupied[0] - 1),
    Math.min(samples.length, occupied.at(-1)! + 2),
  );
  const height = (x: number, upper: boolean) => {
    const middle = ((top(x) + bottom(x)) / 2 / 100) * factor,
      half = Math.max(0, ((top(x) - bottom(x)) / 2 / 100) * factor - 0.001);
    return middle + (upper ? half : -half) + 0.003;
  };
  shape.moveTo(points[0] / 100, height(points[0], true));
  for (const x of points.slice(1)) shape.lineTo(x / 100, height(x, true));
  for (const x of points.reverse()) shape.lineTo(x / 100, height(x, false));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.8,
    bevelEnabled: false,
    curveSegments: 1,
    steps: 1,
  });
  geometry.translate(0, 0, -0.9);
  return geometry;
}
export default function Fronts() {
  const { t, trueScale } = useLabControls();
  useLabTick(1 / 45);
  const f = trueScale ? 1 : 20,
    s = useMemo(() => frontSection(t), [t]);
  const volumes = useMemo(
    () => [
      airVolume(() => 0, s.cold, f),
      airVolume(
        (x) => s.cold(x),
        (x) => Math.max(s.cold(x), s.cool(x)),
        f,
      ),
      airVolume(s.warmBase, () => s.ceiling, f),
    ],
    [s, f],
  );
  useEffect(() => () => volumes.forEach((g) => g.dispose()), [volumes]);
  const interfacePoints = (height: (x: number) => number) =>
    Array.from({ length: 193 }, (_, i): [number, number, number] => {
      const x = -300 + (i / 192) * 600;
      return [x / 100, (height(x) / 100) * f, 0.915];
    });
  return (
    <>
      <ScienceStudio
        slug="fronts"
        scale="Vertical dimensions ×20 · cold slope 1:50 · warm slope 1:150"
        trueScale="Same scale in every direction · 1 scene unit = 100 km"
        camera={[0.2, 1.8, 8]}
      >
        <FrontGround />
        <FrontSurface
          height={s.cold}
          from={-300}
          to={s.occluded ? s.meeting : s.coldFront}
          factor={f}
          colour="#4f8fd0"
        />
        {!s.occluded && (
          <FrontSurface height={s.cool} from={s.warmFront} to={300} factor={f} colour="#d0614f" />
        )}
        {/* Cirrus streaks far ahead of the warm front, then thickening altostratus. */}
        {!s.occluded &&
          Array.from({ length: 4 }, (_, i) => {
            const x = Math.min(290, s.warmFront + 150 + i * 32);
            return (
              <CloudVolume
                key={`ci-${i}`}
                position={[
                  x / 100,
                  (Math.min(6.2, s.cool(x) + 1.2) / 100) * f + 0.04,
                  i % 2 ? 0.35 : -0.3,
                ]}
                scale={[0.42, 0.035, 0.22]}
                seed={i + 60}
                density={24}
                opacity={0.45}
              />
            );
          })}
        {volumes.map((geometry, i) => (
          <mesh key={i} geometry={geometry}>
            <meshBasicMaterial
              color={["#6eaac9", "#8cc8b9", "#dbab79"][i]}
              transparent
              opacity={0.2}
              depthWrite={false}
            />
          </mesh>
        ))}
        <Line points={interfacePoints(s.cold)} color="#75b9d6" lineWidth={2} />
        <Line
          points={interfacePoints(s.cool).filter(
            (point) => point[0] * 100 >= Math.max(s.warmFront, s.meeting),
          )}
          color="#deac7e"
          lineWidth={2}
        />
        <Arrow from={[-2.7, 0.08, 0.98]} to={[-2.1, 0.08, 0.98]} color="#75b9d6" width={0.7} />
        <Arrow
          from={[s.meeting / 100 - 0.25, ((s.liftAtMeeting + 0.5) / 100) * f, 0.98]}
          to={[s.meeting / 100 - 0.65, ((s.liftAtMeeting + 2) / 100) * f, 0.98]}
          color="#deac7e"
          width={0.65}
        />
        {Array.from({ length: 10 }, (_, i) => {
          const begin = s.occluded ? s.meeting - 40 : s.warmFront + 20,
            end = Math.min(295, begin + 128),
            x = begin + ((end - begin) * i) / 9,
            h = Math.min(6, s.warmBase(x) + 0.9),
            ceiling = (h / 100) * f + 0.02;
          return (
            <group key={i}>
              <CloudVolume
                position={[x / 100, ceiling, 0]}
                scale={[0.36, 0.12 + (0.12 * f) / 20, 0.75]}
                seed={i + 20}
                density={30}
              />
              <RainStreaks
                t={t}
                position={[x / 100, ceiling, 0]}
                width={0.2}
                depth={1.3}
                height={Math.max(0.03, (1.3 / 100) * f)}
                count={20}
              />
            </group>
          );
        })}
        {/* Towering convective cloud and heavy showers along the steep cold front. */}
        {!s.occluded && (
          <group>
            <CloudVolume
              position={[s.coldFront / 100 + 0.12, (4 / 100) * f + 0.05, 0]}
              scale={[0.32, 0.18 + (0.55 * f) / 20, 0.7]}
              seed={5}
              density={40}
            />
            {/* Anvil: the storm top spreads out where rising air reaches the stable layer above. */}
            <CloudVolume
              position={[s.coldFront / 100 + 0.32, (6.3 / 100) * f + 0.02, 0]}
              scale={[0.6, 0.07, 0.8]}
              seed={9}
              density={36}
              opacity={0.7}
            />
            <RainStreaks
              t={t}
              position={[s.coldFront / 100 + 0.12, (2.5 / 100) * f + 0.02, 0]}
              width={0.22}
              depth={1.4}
              height={Math.max(0.04, (2.5 / 100) * f)}
              count={40}
            />
          </group>
        )}
        <ChartFront
          x={(s.occluded ? s.meeting : s.coldFront) / 100}
          kind={s.occluded ? "occluded" : "cold"}
        />
        {!s.occluded && <ChartFront x={s.warmFront / 100} kind="warm" />}
        <Tag
          pos={[-2.4, 0.15, 0.98]}
          text="Cold air"
          note="The advancing cold air pushes under the warmer air. The boundary rises 1 km for every 50 km across; the teaching view stretches heights ×20."
          occlude={false}
        />
        <Tag
          pos={[0, (s.ceiling / 100) * f + 0.4, 0]}
          text={s.occluded ? "Warm air lifted off surface" : "Warm sector"}
          note="When the cold front catches the warm front, the warm sector is lifted off the ground (occlusion). This example is a cold occlusion; real occlusions vary."
          occlude={false}
        />
        <Tag
          pos={[2.5, 0.15, 0.98]}
          text="Cool air ahead"
          note="The warm-front boundary slopes 1:150. Clouds show where rising air can condense; they are not a calculated cloud base or rainfall rate."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Section spans 600 km. "}
        {s.occluded
          ? `Cold occlusion: the warm layer is lifted at least ${s.liftAtMeeting.toFixed(2)} km above the meeting point.`
          : `Surface warm sector ${(s.warmFront - s.coldFront).toFixed(0)} km wide.`}
        <br />
        {
          "Play or drag Process to follow the faster cold front. Slopes and speeds are set by the model, and the clouds are for illustration. A front on a weather chart marks where a sloping boundary meets the ground."
        }
      </ScienceReadout>
    </>
  );
}

/** The front's ground trace drawn as on a weather chart; symbols point the way it moves. */
function ChartFront({ x, kind }: { x: number; kind: "cold" | "warm" | "occluded" }) {
  const colour = kind === "cold" ? "#2f6fd0" : kind === "warm" ? "#d0402f" : "#8a46b8";
  return (
    <group position={[x, 0.006, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.03, 1.8]} />
        <meshBasicMaterial color={colour} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const z = -0.72 + i * 0.36,
          triangle = kind === "cold" || (kind === "occluded" && i % 2 === 0);
        return (
          <mesh key={i} position={[0.05, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
            {triangle ? (
              <circleGeometry args={[0.075, 3]} />
            ) : (
              <circleGeometry args={[0.065, 24, -Math.PI / 2, Math.PI]} />
            )}
            <meshBasicMaterial color={colour} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

/** The sloping frontal boundary as a translucent sheet across the section. */
function FrontSurface({
  height,
  from,
  to,
  factor,
  colour,
}: {
  height: (x: number) => number;
  from: number;
  to: number;
  factor: number;
  colour: string;
}) {
  const geometry = useMemo(() => {
    const n = 96,
      pos: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const x = from + ((to - from) * i) / n,
        y = (height(x) / 100) * factor + 0.004;
      pos.push(x / 100, y, -0.9, x / 100, y, 0.9);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [height, from, to, factor]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={colour}
        transparent
        opacity={0.32}
        side={THREE.DoubleSide}
        depthWrite={false}
        roughness={0.4}
      />
    </mesh>
  );
}

/** Farmland, woods, a river and villages beneath the section (600 km × 180 km, illustrative). */
function FrontGround() {
  const height = useMemo(
    () => (x: number, z: number) =>
      0.012 * (fbm(x * 2, z * 3) - 0.5) -
      0.01 * Math.exp(-(((z - 0.25 * Math.sin(x * 1.3)) / 0.05) ** 2)),
    [],
  );
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(height, 6, 1.85, 220, -0.16),
      p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      col = new THREE.Color(),
      tone = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i);
      col.copy(farmland(x * 1.5, z * 1.5, 0.34));
      if (fbm(x * 1.8 + 3, z * 2) > 0.63) col.lerp(tone.set("#4b673a"), 0.8);
      if (Math.abs(z - 0.25 * Math.sin(x * 1.3)) < 0.04) col.set("#3f7d96");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [height]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const towns = useMemo(
    () => [
      ...settlement(-1.6, -0.45, 8, 0.2, 0.045, 3),
      ...settlement(0.7, 0.55, 9, 0.22, 0.045, 7),
      ...settlement(2.2, -0.5, 7, 0.2, 0.045, 5),
    ],
    [],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; out.length < 90 && i < 1600; i++) {
      const x = -2.9 + 5.8 * ((i * 0.618034) % 1),
        z = -0.85 + 1.7 * ((i * 0.7548777) % 1);
      if (fbm(x * 1.8 + 3, z * 2) > 0.65) out.push([x, height(x, z) - 0.002, z]);
    }
    return out;
  }, [height]);
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <TerrainMaterial attach="material-0" kind="grass" color="#d4d4d4" vertexColors />
        <TerrainMaterial attach="material-1" kind="soil" color="#7a6450" />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.05} seed={21} />
      <Buildings items={towns} ground={height} />
    </group>
  );
}
