import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, WaterRibbon, DebrisField } from "../shared/geomorphic-terrain";
import { PlantStand } from "../shared/natural-world";
import { Tag } from "../shared/kit";
import { fbm } from "../shared/hazard-parts";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";

/** Floor of the neighbouring (donor) valley, which flows east along z ≈ -0.9. */
const donor = (x: number) => 0.8 - 0.08 * x;
const donorZ = (x: number) => -0.9 + 0.07 * Math.sin(x * 2.1);
/** Floor of the lower captor valley, which flows south (towards +z). */
const captor = (z: number) => 0.775 - (0.64 * (z + 0.9)) / 2.9;
const captorX = (z: number) => 0.1 * Math.sin(z * 2.4 + 0.6) - 0.1 * Math.sin(0.6 - 0.9 * 2.4);

const upland = (x: number, z: number) => 1.26 + 0.12 * (fbm(x * 0.7 + 4, z * 0.7) - 0.5) - 0.06 * z;
/** A valley cross-profile: a flat floor that rises into concave sides with small side gullies. */
function valley(floor: number, top: number, d: number, along: number, width: number) {
  const rise = THREE.MathUtils.smoothstep(d, 0.07, width) ** 0.85,
    gully =
      0.05 * Math.max(0, Math.sin(along * 7.5)) * Math.exp(-(((d - width * 0.55) / 0.25) ** 2));
  return floor + (top - floor) * rise - gully;
}

export default function RiverCapture() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const stage = Math.round(params.stage ?? 0),
    head = [0.9, -0.2, -0.9][stage],
    v = trueScale ? 1 : 2;
  const height = useMemo(
    () => (x: number, z: number) => {
      const top = upland(x, z),
        a = valley(donor(x), top, Math.abs(z - donorZ(x)), x, 0.95);
      // The captor valley ends at its head; headward erosion moves the head north (towards -z).
      const reach = THREE.MathUtils.smoothstep(z, head - 0.05, head + 0.55),
        b = valley(captor(z), top, Math.abs(x - captorX(z)), z, 0.85),
        c = THREE.MathUtils.lerp(top, b, reach);
      return Math.min(top, a, c) + 0.012 * (noise(x * 6, z * 6) - 0.5);
    },
    [head],
  );
  const colour = useMemo(
    () => (x: number, y: number, z: number) => {
      const c = new THREE.Color("#7c9a52"),
        n = noise(x * 2.4 + 3, z * 2.4),
        floorA = Math.abs(z - donorZ(x)) < 0.12,
        floorB = z > head && Math.abs(x - captorX(z)) < 0.1;
      // Moorland on the uplands, pasture on the valley sides, meadow along the floors.
      c.lerp(
        new THREE.Color("#8b8158"),
        THREE.MathUtils.smoothstep(y, 1.1, 1.24) * (0.6 + 0.4 * n),
      );
      if (n > 0.62 && y < 1.15) c.lerp(new THREE.Color("#58723f"), 0.8);
      if (floorA || floorB) c.set("#93ad62");
      return c.getStyle();
    },
    [head],
  );
  const incoming = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const x = -3 + (3 * i) / 80;
        return [x, donor(x) + 0.03, donorZ(x)] as [number, number, number];
      }),
    [],
  );
  const old = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const x = (3 * i) / 80;
        return [x, donor(x) + 0.03, donorZ(x)] as [number, number, number];
      }),
    [],
  );
  const captured = useMemo(
    () =>
      Array.from({ length: 81 }, (_, i) => {
        const z = head + 0.15 + ((1.85 - head) * i) / 80;
        return [captorX(z), captor(z) + 0.03, z] as [number, number, number];
      }),
    [head],
  );
  // At capture the donor water turns south along the captor valley: the elbow of capture.
  const route = useMemo(
    () =>
      stage === 2
        ? [
            ...incoming,
            ...Array.from({ length: 81 }, (_, i) => {
              const z = -0.9 + (2.75 * i) / 80;
              return [captorX(z), captor(z) + 0.03, z] as [number, number, number];
            }),
          ]
        : [...incoming, ...old],
    [stage, incoming, old],
  );
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 900 && out.length < 90; i++) {
      const x = -2.85 + random(i + 174) * 5.7,
        z = -1.85 + random(i + 936) * 3.7,
        h = height(x, z);
      if (
        h < 1.15 &&
        noise(x * 2.4 + 3, z * 2.4) > 0.58 &&
        Math.abs(z - donorZ(x)) > 0.18 &&
        Math.abs(x - captorX(z)) > 0.16
      )
        out.push([x, h * v - 0.01, z]);
    }
    return out;
  }, [height, v]);
  return (
    <>
      <ScienceStudio
        slug="river-capture"
        camera={[2.7, 6.4, 5.8]}
        scale="Invented 6 × 4 km catchments · relief ×2 · three selected stages"
        trueScale="1 scene unit = 1 km · common distances · water and vegetation symbols enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain
            height={height}
            colour={colour}
            resolution={200}
            base={-0.12}
            cliff={0.55}
            section={{ rock: "sandstone", soil: 0.05, regolith: 0.1, beds: 5 }}
          />
          <WaterRibbon path={incoming} width={0.075} color="#4a8daa" />
          <WaterRibbon path={old} width={stage === 2 ? 0.02 : 0.07} color="#4a8daa" />
          <WaterRibbon path={captured} width={stage === 2 ? 0.075 : 0.04} color="#4a8daa" />
          {stage === 2 && (
            <WaterRibbon
              path={Array.from({ length: 30 }, (_, i) => {
                const z = -0.9 + ((head + 0.15 + 0.9) * i) / 29;
                return [captorX(z), captor(z) + 0.03, z] as [number, number, number];
              })}
              width={0.075}
              color="#4a8daa"
            />
          )}
          {stage === 2 && (
            <DebrisField
              points={Array.from({ length: 50 }, (_, i) => {
                const x = 0.35 + ((i % 10) / 9) * 2.5,
                  z = donorZ(x) + (Math.floor(i / 10) - 2) * 0.03;
                return [x, height(x, z) + 0.008, z];
              })}
              size={0.014}
              color="#c3b99a"
            />
          )}
          {stage === 2 && (
            <Line
              points={old.map((p) => [p[0], p[1] + 0.03, p[2]] as [number, number, number])}
              color="#d5b17b"
              dashed
              dashSize={0.1}
              gapSize={0.1}
            />
          )}
          {Array.from({ length: 22 }, (_, i) => {
            const p = route[Math.floor(((t + i / 22) % 1) * (route.length - 1))];
            return (
              <mesh key={i} position={[p[0], p[1] + 0.02, p[2]]} scale={[1, 1 / v, 1]}>
                <sphereGeometry args={[0.024, 8, 6]} />
                <meshBasicMaterial color="#e4ece5" />
              </mesh>
            );
          })}
          <Arrow
            from={[0.35, 1.5, Math.max(head + 0.5, 0.1)]}
            to={[0.35, 1.5, head - 0.1]}
            color="#dfb880"
            width={0.9}
          />
          <Tag
            pos={[-2, 1.25, -1.7]}
            text={stage === 2 ? "Captured headwaters" : "Neighbouring river"}
            note="The upstream water formerly continued east across the scene. After interception it turns into the lower captor valley. Channel widths and tracer speed do not measure discharge."
            occlude={false}
          />
          <Tag
            pos={[-0.9, 0.75, 1.75]}
            text="Captor stream"
            note="Headward erosion extends this lower valley towards the divide. When the divide is breached, the lower route can divert the neighbouring river. Relative base level, rock type and structure all affect the process."
            occlude={false}
          />
          {stage === 2 && (
            <>
              <Tag
                pos={[2, 1.3, 0.15]}
                text="Beheaded reach"
                note="A reduced local stream may occupy the former valley, which now looks too large for it (a misfit stream). An elbow of capture and an underfit valley are clues; neither proves capture without other geomorphic and geological evidence."
                occlude={false}
              />
              <Tag
                pos={[0, 1.05, -0.9]}
                text="Elbow of capture"
                note="The sharp bend where the captured river now turns into the captor valley."
                occlude={false}
              />
            </>
          )}
        </group>
        <PlantStand kind="broadleaf" scale={0.09} seed={9} positions={trees} />
      </ScienceStudio>
      <ScienceReadout>
        {
          [
            "Before capture: two separate drainage routes.",
            "Headward erosion: the captor approaches the divide.",
            "After capture: headwater flow turns into the lower outlet; the former downstream reach loses that supply.",
          ][stage]
        }
        <br />
        {
          "The gold arrow shows headward extension, opposite the captor’s downstream flow. Stages are selected geometry, not a dated erosion simulation. Play follows the current water route."
        }
      </ScienceReadout>
    </>
  );
}
