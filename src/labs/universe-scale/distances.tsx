import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { StarMesh } from "@/components/globe/star";
import { EarthMesh } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { distanceModel } from "@/lib/distance-science";
import { LunarSurface } from "../shared/lunar-model";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
// Earth faces the Sun (to its left) in the Sun–Earth view; elsewhere it shares the key light.
const SUN_LEFT = new THREE.Vector3(-1, 0.15, 0.45);
const KEY_LIGHT = new THREE.Vector3(-0.45, 0.3, 1);
function Body({ name, radius, stop }: { name: string; radius: number; stop: number }) {
  if (name === "Earth")
    return <EarthMesh radius={radius} sunDirection={stop === 1 ? SUN_LEFT : KEY_LIGHT} />;
  if (name === "Sun" || name === "Proxima Centauri")
    return <StarMesh radius={radius} colour={name === "Sun" ? "#fff0d7" : "#efbd9c"} />;
  return <LunarSurface radius={radius} />;
}
export default function UniverseScale() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 24);
  const stop = Math.round(params.zoom ?? 0),
    s = distanceModel(stop, t),
    r1 = trueScale ? s.originRadius : stop === 0 ? 0.48 : 0.55,
    // Teaching scale keeps the true radius ratio except Sun–Earth (109:1 would hide Earth).
    r2 = trueScale
      ? s.targetRadius
      : stop === 1
        ? 0.18
        : (r1 * s.targetRadiusKm) / s.originRadiusKm,
    lightTime =
      stop === 2
        ? `${(s.lightSeconds / (365.25 * 86400)).toFixed(2)} years`
        : stop === 1
          ? `${s.lightSeconds.toFixed(0)} seconds (about ${(s.lightSeconds / 60).toFixed(1)} minutes)`
          : `${s.lightSeconds.toFixed(2)} seconds`,
    enlarge = (x: number) =>
      x.toLocaleString("en-GB", { maximumSignificantDigits: x < 100 ? 3 : 2 });
  return (
    <>
      <ScienceStudio
        slug="universe-scale"
        camera={[0, 1.4, 8]}
        lights={false}
        space
        scale={`${s.name} · centre separation ${s.value.toLocaleString("en-GB")} ${s.unit} · bodies enlarged${stop === 1 ? " · Sun and Earth not in proportion: the Sun's radius is about 109 times Earth's" : " · both bodies enlarged by the same factor"}`}
        trueScale={`${s.name} · body radii and centre distance use one scale · locator rings enlarged`}
      >
        <ambientLight intensity={0.06} />
        <directionalLight position={[-5, 3, 4]} intensity={2.8} />
        <group position={[-3, 0, 0]}>
          <Body name={s.origin} radius={r1} stop={stop} />
        </group>
        <group position={[3, 0, 0]}>
          <Body name={s.target} radius={r2} stop={stop} />
        </group>
        {[-3, 3].map((x, i) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh>
              <sphereGeometry args={[0.065, 24, 16]} />
              <meshBasicMaterial wireframe color="#d3c4a1" transparent opacity={0.55} />
            </mesh>
            <Tag
              pos={[0, 0.9, 0]}
              text={i ? s.target : s.origin}
              note={`Physical radius ${Math.round(i ? s.targetRadiusKm : s.originRadiusKm).toLocaleString("en-GB")} km${stop === 2 && i ? " (approximate)" : ""}. The small wire locator is a visibility symbol; press T for physical radii at the distance scale.`}
              occlude={false}
            />
          </group>
        ))}
        <Line
          points={[
            [-3, -0.5, 0],
            [3, -0.5, 0],
          ]}
          color="#718787"
        />
        {Array.from({ length: 7 }, (_, i) => (
          <Line
            key={i}
            points={[
              [-3 + i, -0.56, 0],
              [-3 + i, -0.44, 0],
            ]}
            color="#718787"
          />
        ))}
        <Line
          points={[
            [-3, 0, 0],
            [-3 + 6 * t, 0, 0],
          ]}
          color="#e3c27d"
          lineWidth={1.5}
        />
        {/* Light pulse: a bright core with a soft additive glow and a fading wake. */}
        <mesh position={[-3 + 6 * t, 0, 0]}>
          <sphereGeometry args={[0.04, 24, 16]} />
          <meshBasicMaterial color="#fff6dc" toneMapped={false} />
        </mesh>
        <sprite position={[-3 + 6 * t, 0, 0]} scale={[0.42, 0.42, 1]}>
          <spriteMaterial
            map={glowMap()}
            color="#ffd27a"
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </sprite>
        {Array.from({ length: 10 }, (_, i) => {
          const x = -3 + 6 * t - (i + 1) * 0.06;
          return x >= -3 ? (
            <sprite key={i} position={[x, 0, 0]} scale={[0.2 - i * 0.016, 0.2 - i * 0.016, 1]}>
              <spriteMaterial
                map={glowMap()}
                color="#e9bf71"
                transparent
                opacity={0.5 - i * 0.045}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </sprite>
          ) : null;
        })}
        <Tag
          pos={[0, -1, 0]}
          text={`Light time · ${lightTime}`}
          note="The moving dot is a light signal travelling at constant speed. At 1× speed, playback squeezes the whole journey into 24 seconds; the readout shows the matching real travel time."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Signal progress "}
        {(t * 100).toFixed(0)}
        {"% · elapsed "}
        {stop === 2
          ? `${((s.lightSeconds * t) / (365.25 * 86400)).toFixed(2)} years`
          : `${(s.lightSeconds * t).toFixed(2)} s`}
        .{" "}
        {trueScale
          ? "Physical sizes are shown; tiny bodies may be smaller than a pixel."
          : "Displayed radius enlargement: " +
            s.origin +
            " ×" +
            enlarge(r1 / s.originRadius) +
            "; " +
            s.target +
            " ×" +
            enlarge(r2 / s.targetRadius) +
            "."}
        <br />
        {stop === 0
          ? "384400 km is a mean centre distance, not a fixed lunar orbit."
          : stop === 1
            ? "1 AU is exactly 149597870.7 km; Earth–Sun distance varies during the year."
            : "4.24 light-years is a rounded distance to Proxima. The line is a distance comparison, not a sky direction or a map of other stars."}{" "}
        {"At 1× speed, Play compresses each light journey into 24 seconds."}
      </ScienceReadout>
    </>
  );
}

let glow: THREE.CanvasTexture | null = null;
function glowMap() {
  if (glow || typeof document === "undefined") return glow;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!,
    g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,230,170,0.5)");
  g.addColorStop(1, "rgba(255,200,120,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  glow = new THREE.CanvasTexture(c);
  glow.colorSpace = THREE.SRGBColorSpace;
  return glow;
}
