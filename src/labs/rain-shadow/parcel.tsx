import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { mountainParcel } from "@/lib/atmosphere-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { CloudVolume, RainStreaks } from "../atmosphere-layers/weather-volumes";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
export default function RainShadow() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 30);
  const crest = params.ridge ?? 2100,
    humidity = (params.wind ?? 70) / 100,
    f = trueScale ? 1 : 2.5;
  // How much water the air loses on the way up sets how strongly the lee side dries out.
  const dryness = Math.min(1, mountainParcel(0, crest, humidity, true).condensedGrams / 3);
  const h = (x: number) => crest * Math.exp((-x * x) / 1.05);
  const surface = (x: number, z: number) =>
    (h(x) / 3000) *
    f *
    (1 +
      Math.min(1, Math.max(0, (Math.abs(z) - 0.18) / 0.3)) ** 2 *
        (0.13 * (noise(x * 4.2, z * 3.1) - 0.5) + 0.07 * (noise(x * 11.3, z * 9.7) - 0.5)));
  const terrain = useMemo(() => {
    const g = terrainBlockGeometry(surface, 6, 2.5, 160, -0.2),
      p = g.attributes.position,
      colors = new Float32Array(p.count * 3),
      green = new THREE.Color("#7caa55"),
      dry = new THREE.Color("#b9a06e"),
      rock = new THREE.Color("#938974");
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        mix = dryness * Math.min(1, Math.max(0, (x + 0.25) / 1.2)),
        color = green
          .clone()
          .lerp(dry, mix)
          .lerp(rock, Math.max(0, y / ((crest / 3000) * f) - 0.45) * 1.6);
      color.multiplyScalar(0.9 + 0.1 * Math.sin(x * 17 + z * 29) ** 2);
      colors.set([color.r, color.g, color.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- surface is redefined each render from crest and f, which are listed
  }, [crest, f, dryness]);
  useEffect(() => () => terrain.dispose(), [terrain]);
  const x = -3 + t * 6,
    height = h(x),
    parcel = mountainParcel(height, crest, humidity, x > 0),
    downstream = mountainParcel(0, crest, humidity, true);
  const path = Array.from({ length: 129 }, (_, i): [number, number, number] => {
    const xx = -3 + (i / 128) * 6;
    return [xx, (h(xx) / 3000) * f + 0.2, 0.05];
  });
  return (
    <>
      <ScienceStudio
        slug="rain-shadow"
        scale="Relief ×2.5 · parcel ascent and descent · simplified lapse rates"
        trueScale="1 scene unit = 3 km in every direction · parcel marker enlarged"
        camera={[0.7, 2.2, 8]}
      >
        <mesh geometry={terrain} receiveShadow castShadow>
          <TerrainMaterial attach="material-0" kind="grass" color="#ffffff" vertexColors />
          <RockMaterial attach="material-1" color="#82715d" />
        </mesh>
        <Line points={path} color="#dfc58f" lineWidth={2} />
        <Arrow from={[-2.95, 0.75, 0.05]} to={[-2.05, 0.75, 0.05]} color="#8fd2de" width={1.4} />
        <mesh position={[x, (height / 3000) * f + 0.2, 0.05]}>
          <sphereGeometry args={[0.09, 32, 24]} />
          <meshStandardMaterial
            color={parcel.relativeHumidity > 0.99 ? "#e0ecea" : "#dfb577"}
            roughness={0.45}
          />
        </mesh>
        <PlantStand
          positions={Array.from({ length: 70 }, (_, i) => {
            const lee = i >= 44,
              tx = lee ? 0.9 + random(i + 475) * 1.9 : -2.8 + random(i + 475) * 1.9,
              tz = -1.12 + random(i + 491) * 2.24;
            // Lee-side trees thin out as the rain shadow strengthens.
            if (lee && random(i + 523) < dryness) return null;
            return [tx, surface(tx, tz), tz] as [number, number, number];
          }).filter((p): p is [number, number, number] => p !== null && Math.abs(p[2]) > 0.2)}
          scale={0.08}
          kind="conifer"
          seed={5}
        />
        {Array.from({ length: 5 }, (_, i) => {
          const cx = -1.05 + (i / 4) * 1.05,
            ch = h(cx);
          if (ch < parcel.lcl) return null;
          return (
            <group key={i}>
              <CloudVolume
                position={[cx, (ch / 3000) * f + 0.25, -0.12]}
                scale={[0.46, 0.66, 0.7]}
                seed={i + 2}
                density={55}
              />
              <RainStreaks
                t={t}
                position={[cx, (ch / 3000) * f + 0.2, -0.1]}
                width={0.4}
                depth={0.7}
                height={0.19}
                count={30}
              />
            </group>
          );
        })}
        <Tag
          pos={[-2.3, 1.05, 0.05]}
          text="Wind · windward side rising"
          note="Unsaturated air cools at about 9.8 °C/km. Above cloud base the model uses 6 °C/km; real saturated rates vary with temperature and pressure."
          occlude={false}
        />
        <Tag
          pos={[2, 1.05, 0.05]}
          text="Leeward · descending"
          note="Once its condensed water has rained out, the sinking air warms at about 9.8 °C/km. The model ignores mixing with other air and radiative heating or cooling."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Parcel "}
        {height.toFixed(0)} {"m · "}
        {parcel.temperature.toFixed(1)} {"°C · RH "}
        {(parcel.relativeHumidity * 100).toFixed(0)}
        {"%. Cloud base ≈ "}
        {Math.max(0, parcel.lcl).toFixed(0)} {"m. Leeward foot: "}
        {downstream.temperature.toFixed(1)} {"°C, "}
        {(downstream.relativeHumidity * 100).toFixed(0)}
        {"% RH."}
        <br />
        {"Windward foot (start): 20 °C, "}
        {(humidity * 100).toFixed(0)}
        {"% RH. "}
        {crest <= parcel.lcl
          ? "This ridge is too low for the air to reach cloud base."
          : "Condensation removes moisture as the air crosses the ridge."}
      </ScienceReadout>
    </>
  );
}
