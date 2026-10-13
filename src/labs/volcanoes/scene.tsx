import { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { RockMaterial } from "../shared/rock-material";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { volcanoGeometry, volcanoHeight } from "./geometry";
function LavaChannel({
  points,
  active = false,
}: {
  points: [number, number, number][];
  active?: boolean;
}) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p))),
        80,
        active ? 0.018 : 0.031,
        8,
        false,
      ),
    [points, active],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow>
      <RockMaterial
        color={active ? "#d85925" : "#352e2a"}
        emissive={active ? "#ff571d" : "#000000"}
        emissiveIntensity={active ? 0.55 : 0}
        roughness={active ? 0.65 : 0.96}
      />
    </mesh>
  );
}
export default function Volcanoes() {
  const { params, slice, t } = useLabControls();
  useLabTick(1 / 9);
  const v = params.visc ?? 0.25,
    gas = params.gas ?? 0.45,
    fissure = params.fissure > 0.5;
  const g = useMemo(() => volcanoGeometry(v, slice * Math.PI * 0.72), [v, slice]);
  useEffect(
    () => () => {
      g.body.dispose();
      g.caps.forEach((c) => c.dispose());
    },
    [g],
  );
  const energetic = gas * (0.35 + 0.65 * v),
    plume = energetic > 0.48;
  const flow = useMemo(
    () =>
      Array.from({ length: 80 }, (_, i): [number, number, number] => {
        const r = 0.16 + (i / 79) * (g.radius - 0.2),
          phi = 1.6 + Math.sin(r * 7) * 0.035;
        return [
          Math.sin(phi) * r,
          volcanoHeight(v, r, phi, slice * Math.PI * 0.72) + 0.025,
          Math.cos(phi) * r,
        ];
      }),
    [g.radius, v, slice],
  );
  const activeFlow = useMemo(
    () => flow.slice(0, Math.max(2, Math.round(2 + t * (flow.length - 2)))),
    [flow, t],
  );
  return (
    <>
      <ScienceStudio
        slug="volcanoes"
        scale={
          fissure
            ? "Idealised linear vents · relative geometry"
            : "Idealised forms · relative geometry · cross-section exposes the conduit"
        }
        trueScale="Slope and aspect ratio unchanged · this model has no single real-world size"
        camera={[4, 2.9, 6]}
      >
        <group position={[0, -0.6, 0]}>
          {!fissure ? (
            <group key="central-vent">
              <mesh geometry={g.body} castShadow receiveShadow>
                <RockMaterial
                  color={v > 0.5 ? "#9c8b77" : "#6a6864"}
                  roughness={0.9}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {slice > 0.001 &&
                g.caps.map((cap, i) => (
                  <mesh key={i} geometry={cap}>
                    <RockMaterial color="#a0876a" side={THREE.DoubleSide} />
                  </mesh>
                ))}
              <mesh position={[0, (g.height * 0.78 - 0.18) / 2, 0]}>
                <cylinderGeometry args={[0.04, 0.065, g.height * 0.78 + 0.18, 32]} />
                <meshStandardMaterial color="#ad3f22" emissive="#ff5a20" emissiveIntensity={0.35} />
              </mesh>
              <LavaChannel points={flow} />
              <LavaChannel points={activeFlow} active />
              <Tag
                pos={[0, g.height + 0.3, 0]}
                text={v < 0.5 ? "Shield end-member" : "Composite cone end-member"}
                note="Edifice shape records many eruptions. Viscosity, eruption rate, gas, fragmentation and erosion all contribute; this is a comparison, not a predictive formula."
                occlude={false}
              />
            </group>
          ) : (
            <group key="fissure-vents">
              <mesh position={[0, -0.12, 0]}>
                <boxGeometry args={[4.4, 0.22, 2.8]} />
                <RockMaterial color="#615b53" />
              </mesh>
              <Line
                points={[
                  [-1.5, 0.01, 0],
                  [1.5, 0.01, 0],
                ]}
                color="#f1903e"
                lineWidth={8}
              />
              {Array.from({ length: 7 }, (_, i) => (
                <mesh
                  key={i}
                  position={[-1.3 + i * 0.43, 0.028, (i % 2 ? 1 : -1) * (0.08 + 0.5 * t)]}
                  scale={[0.14, 0.028, 0.12 + 0.5 * t]}
                >
                  <sphereGeometry args={[1, 32, 16]} />
                  <RockMaterial color="#b34924" emissive="#d14e21" emissiveIntensity={0.4} />
                </mesh>
              ))}
              <Tag
                pos={[0, 0.45, 0]}
                text="Fissure vents"
                note="A linear crack can erupt basalt. Fissures are a vent geometry, not a distinct viscosity."
                occlude={false}
              />
            </group>
          )}
          {plume &&
            Array.from({ length: 9 }, (_, i) => {
              const u = (t + i / 9) % 1,
                h = 0.08 + u * 1.75,
                a = i * 2.399,
                width = 0.085 + h * 0.21;
              return (
                <CloudVolume
                  key={i}
                  position={[
                    (fissure ? -1.4 + (i % 5) * 0.7 : 0) + Math.cos(a) * h * 0.07,
                    (fissure ? 0.05 : g.height * 0.78) + h,
                    Math.sin(a) * h * 0.07,
                  ]}
                  scale={[width, 0.25 + h * 0.1, width]}
                  seed={i * 7 + 3}
                  opacity={0.65 * (1 - u * 0.6)}
                />
              );
            })}
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {"Viscosity "}
        {v.toFixed(2)} {"· gas drive "}
        {gas.toFixed(2)} ·{" "}
        {fissure ? "fissure vents" : v < 0.5 ? "broad shield" : "steeper composite cone"}.{" "}
        {plume
          ? "A qualitative fragmenting plume is active."
          : fissure
            ? "Lava emerges along the linear opening."
            : "The advancing lava front follows the selected process progress."}{" "}
        {
          "Gas, water interaction and eruption conditions also control explosivity; basalt can erupt explosively."
        }
      </ScienceReadout>
    </>
  );
}
