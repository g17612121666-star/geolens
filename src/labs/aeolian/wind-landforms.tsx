import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import RealGreatSandDunes from "./real-great-sand-dunes";
import { Line } from "@react-three/drei";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { useLabFrame, useLabTick } from "@/labs/tick";
import {
  MAIN_BARCHAN as DUNE,
  YARDANGS,
  brinkLine,
  duneField,
  yardangHeight,
} from "@/lib/aeolian-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";

/** The ground the dunes and yardangs stand on (true-scale units: 1 = 10 m). */
const FLOOR = 0.04;
const TAU = Math.PI * 2;

/**
 * Wind ripples on the windward slopes, about ten times their real 10 cm spacing so they show at
 * this scale: sinuous crests across the wind, each with a long gentle back and a short steep lee.
 * They fade out at the dune's toe and just below the brink, where real ripples die out too.
 */
function ripple(x: number, z: number, u: number) {
  // Two trains of slightly different spacing, blended patchily, so crests fork and end.
  const wave = (k: number, bend: number) => {
      const phase = (x * k + bend) / TAU,
        f = phase - Math.floor(phase);
      return f < 0.72 ? f / 0.72 : (1 - f) / 0.28;
    },
    a = wave(45, 7 * noise(x * 1.1 + 7, z * 1.7) + 0.6 * Math.sin(z * 4.3 + x * 0.6)),
    b = wave(52, 6 * noise(x * 1.3 + 2, z * 2.2 + 5)),
    blend = THREE.MathUtils.smoothstep(noise(x * 1.7 + 4, z * 2.3), 0.35, 0.65),
    fade = THREE.MathUtils.smoothstep(u, 0, 0.18) * (1 - THREE.MathUtils.smoothstep(u, 0.8, 0.97));
  return 0.005 * (a + (b - a) * blend - 0.5) * fade * (0.5 + 0.5 * noise(x * 3.1 + 2, z * 3.7));
}

const mixed = new THREE.Color(),
  other = new THREE.Color();
/** `a` blended toward `b` by k, then brightened or darkened by `tone`. */
function mix(a: string, b: string, k: number, tone = 1) {
  return "#" + mixed.set(a).lerp(other.set(b), k).multiplyScalar(tone).getHexString();
}

export default function Aeolian() {
  const real = useLabControls((s) => Math.round(s.params.feature ?? 0) === 2);
  return real ? <RealGreatSandDunes /> : <ModelAeolian />;
}

function ModelAeolian() {
  const { params, trueScale } = useLabState("params", "trueScale");
  useLabTick(1 / 40);
  const mode = Math.round(params.feature ?? 0),
    v = trueScale ? 1 : 2,
    shift = mode === 0 ? (params.migration ?? 0.4) - 0.4 : 0,
    // Above the dune and yardang crests so the landforms do not hide the arrow.
    windY = mode === 0 ? 0.62 : 0.9;
  const height = useMemo(
    () => (x: number, z: number) => {
      if (mode === 1) {
        // Wind-parallel grooves scour the ridges; the corridor floors are almost flat.
        const rock = yardangHeight(x, z);
        return (
          FLOOR +
          rock +
          (rock > 0 ? 0.014 * (noise(x * 1.2 + 3, z * 16) - 0.5) * Math.min(1, rock * 8) : 0) +
          0.006 * (noise(x * 5, z * 5) - 0.5)
        );
      }
      const dune = duneField(x, z, shift);
      return (
        FLOOR +
        dune.h +
        (dune.part === "stoss" ? ripple(x - shift, z, dune.u) : 0) +
        0.006 * (noise(x * 1.5, z * 1.5) - 0.5)
      );
    },
    [mode, shift],
  );
  const color = useMemo(
    () => (x: number, y: number, z: number) => {
      const n = noise(x * 2 + 4, z * 2);
      if (mode === 1) {
        // Bedded lake sediments: steep sides show the beds, and the tops cut across them.
        if (yardangHeight(x, z) > 0.015) {
          const bed = 0.5 + 0.5 * Math.sin(y * 92 + 2.4 * noise(x * 0.7, z * 0.7));
          return mix("#ccb18a", "#9c7e5b", bed * 0.7, 0.96 + 0.08 * n);
        }
        // Sand drifts along the corridors between the ridges.
        return mix(
          "#c8a477",
          "#dcbf8f",
          THREE.MathUtils.smoothstep(noise(x * 0.9, z * 4), 0.45, 0.7),
        );
      }
      const dune = duneField(x, z, shift),
        // Barchans form where sand is scarce: between them lies a gravel floor with thin sand
        // streaks drawn out along the wind. The dune's own sand thins out over it at the toe.
        streak = THREE.MathUtils.smoothstep(noise(x * 0.75 + 9, z * 9), 0.55, 0.78),
        grit = noise(x * 23 + 1, z * 23),
        floor = mix("#9a8268", "#c8a67a", streak * 0.75, 0.9 + 0.1 * n + 0.1 * grit),
        sand =
          dune.part === "slip"
            ? // Grain flows streak the slip face downslope.
              mix("#d9a865", "#e7bd80", 0.3 + 0.5 * noise((z - x * 0.3) * 11, x * 0.6))
            : mix("#d8a35f", "#ecc68b", 0.25 + 0.65 * dune.u + 0.15 * (n - 0.5));
      return mix(floor, sand, THREE.MathUtils.smoothstep(dune.h, 0, 0.025));
    },
    [mode, shift],
  );
  const crest = useMemo(
    () =>
      brinkLine(DUNE, 81)
        .slice(8, -8)
        .map(([x, h, z]) => [x + shift, FLOOR + h + 0.004, z] as [number, number, number]),
    [shift],
  );
  const sandPoint = (x: number, z: number, lift: number): [number, number, number] => [
    x + shift,
    FLOOR + duneField(x + shift, z, shift).h + lift,
    z,
  ];
  const main = YARDANGS[0];
  return (
    <>
      <ScienceStudio
        horizon
        slug="aeolian"
        camera={mode === 0 ? [0.9, 5.6, 5.4] : [-1.6, 4, 7]}
        scale="60 × 40 m example · relief ×2 · ripples and grains enlarged · wind follows the arrow"
        trueScale="1 scene unit = 10 m · equal distances · ripples and sand grains enlarged"
      >
        <group scale={[1, v, 1]}>
          <GeomorphicTerrain
            height={height}
            color={color}
            resolution={mode === 0 ? 320 : 240}
            base={-0.15}
            cliff={mode === 0 ? 0.2 : 0.5}
            mottle={0.04}
            section={
              mode === 0
                ? { rock: "sand", soil: 0, regolith: 0, beds: 6 }
                : { rock: "sandstone", soil: 0, regolith: 0.015, beds: 9, soilTone: "sandy" }
            }
          />
          {mode === 0 && (
            <DebrisField
              points={Array.from({ length: 220 }, (_, i) => {
                const x = -2.95 + random(i + 5) * 5.9,
                  z = -1.95 + random(i + 77) * 3.9;
                return [x, height(x, z) + 0.003, z] as [number, number, number];
              }).filter(([x, , z]) => duneField(x, z, shift).h < 0.002)}
              size={0.011}
              color="#7d6149"
            />
          )}
          {mode === 1 && (
            <DebrisField
              points={Array.from({ length: 160 }, (_, i) => {
                const x = -2.9 + random(i + 31) * 5.8,
                  z = -1.9 + random(i + 63) * 3.8;
                return [x, height(x, z) + 0.006, z] as [number, number, number];
              }).filter(([x, , z]) => yardangHeight(x, z) < 0.01)}
              size={0.02}
              color="#8a7660"
            />
          )}
          {/* The brink: where the windward slope ends and the slip face begins. */}
          {mode === 0 && <Line points={crest} color="#f4dfb6" lineWidth={1.4} />}
          <Saltation height={height} />
          {/* Low over the upwind edge so it reads as the wind over the sand, not a floating mark. */}
          <Arrow
            from={[-2.9, windY, -1.55]}
            to={[-1.3, windY, -1.55]}
            width={2.2}
            color="#bad4d1"
          />
          <Tag
            pos={[-2.1, windY + 0.15, -1.55]}
            text="Wind"
            priority={2}
            note="The prevailing wind blows along this arrow. Sand moves downwind, the steep slip face forms on the downwind side and the barchan's horns trail downwind."
            occlude={false}
          />
          <Tag
            pos={
              mode === 0
                ? sandPoint(DUNE.x - 0.6 * DUNE.stoss, 0.4, 0.12)
                : [main.x + 0.25 * main.length, FLOOR + main.height + 0.12, main.z]
            }
            text={mode === 0 ? "Gentler stoss slope" : "Wind-eroded ridges"}
            short={mode === 0 ? "Windward" : "Eroded ridges"}
            priority={1}
            note={
              mode === 0
                ? "Wind carries sand up the gentle windward (stoss) slope by saltation and surface creep; the finest grains travel in suspension. The ripples and grains shown are enlarged so they show."
                : "Yardangs are streamlined ridges carved by the wind, usually aligned with the strongest winds. Sand-laden wind abrades the blunt upwind heads and cuts grooves along the ridges; deflation removes the loosened grains. They are eroded rock, not piles of dune sand."
            }
            occlude={false}
          />
          {mode === 0 && (
            // Partway down the lee face of the main barchan, beyond its center line.
            <Tag
              pos={sandPoint(DUNE.x + 0.4, -0.42, 0.06)}
              text="Steep slip face"
              short="Slip face"
              note="Sand blown over the brink piles up on the lee side until it slides down in small avalanches, so this face stays near the angle of repose, about 32° for dry sand. The relief here is doubled, so it looks steeper."
              occlude={false}
              priority={1}
            />
          )}
          <Tag
            pos={
              mode === 0
                ? sandPoint(DUNE.x + 0.85 * DUNE.horn, 0.9 * DUNE.halfWidth, 0.14)
                : [main.x + 0.88 * main.length, FLOOR + 0.2, main.z]
            }
            text={mode === 0 ? "Horns point downwind" : "Tapered downwind ends"}
            short={mode === 0 ? "Horns" : "Tapered ends"}
            priority={1}
            note={
              mode === 0
                ? "The crescent tips lie downwind of the central crest. The slip face is 32° at true scale; doubled relief makes it look steeper. Real angles of repose vary."
                : "Each ridge has a blunt, steep head facing the wind and a long tail tapering downwind, like an upturned boat hull. These illustrative ridges do not give a wind speed or erosion rate."
            }
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {mode === 0
          ? "Barchan: deposited sand, a gentler windward slope and a steeper lee slip face below a sharp brink. Dune position moves the dune downwind without a set speed. Between the dunes lies a gravel floor: barchans form where sand is scarce."
          : "Yardang: soft, bedded rock carved into streamlined ridges, aligned broadly with the erosive wind, with sand drifting along the corridors between them."}{" "}
        <br />
        {
          "Play shows enlarged grains hopping downwind; the dune shape is not simulated from sand transport. Many deserts have rock or gravel surfaces; a dune needs a supply of sand."
        }
      </ScienceReadout>
    </>
  );
}

const GRAINS = 72;
/**
 * Saltating grains, hugely enlarged: each hops downwind in a steep rise and a long, low descent,
 * following the ground. Moved every frame without re-rendering the landscape.
 */
function Saltation({ height }: { height: (x: number, z: number) => number }) {
  const mesh = useRef<THREE.InstancedMesh>(null),
    geometry = useMemo(() => new THREE.SphereGeometry(0.016, 8, 6), []),
    dummy = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useLabFrame((t) => {
    const m = mesh.current;
    if (!m) return;
    for (let i = 0; i < GRAINS; i++) {
      const u = (t + i / GRAINS) % 1,
        x = -2.85 + 5.7 * u,
        z = -1.75 + ((i * 7) % 12) * 0.3 + 0.08 * Math.sin(i * 2.3),
        f = (u * 19 + random(i + 11)) % 1,
        g = f ** 0.6,
        hop = 0.045 * (1 + random(i + 3)) * 4 * g * (1 - g);
      dummy.position.set(x, height(x, z) + 0.014 + hop, z);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, GRAINS]} frustumCulled={false}>
      <meshBasicMaterial color="#ead0a0" />
    </instancedMesh>
  );
}
