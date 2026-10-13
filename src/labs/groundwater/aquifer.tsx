import { useEffect, useMemo } from "react";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { wellHead } from "@/lib/hydrology-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { terrainGeometry } from "../shared/science-geometry";
import { Tag, InspectHotspot } from "../shared/kit";
import { DebrisField, PoreMarkers } from "../shared/geomorphic-terrain";
import { RockMaterial } from "../shared/rock-material";
export default function Groundwater() {
  const { params, trueScale, t } = useLabControls();
  useLabTick(1 / 24);
  const confined = params.confined > 0.5,
    pump = (params.pump ?? 0) / 800,
    H = params.head ?? 31,
    f = trueScale ? 1 / 20 : 1;
  const head = (x: number, z: number) =>
    (wellHead(Math.hypot(x, z) * 200, pump, H, confined) / 10) * f;
  const surface = useMemo(() => terrainGeometry(head, 5, 4, 160), [pump, H, confined, f]);
  useEffect(() => () => surface.dispose(), [surface]);
  const atWell = wellHead(0.2, pump, H, confined),
    radii = [10, 30, 80, 200, 400];
  return (
    <>
      <ScienceStudio
        slug="groundwater"
        scale="Vertical ×20 · well, grains and pore symbols enlarged · steady radial flow"
        trueScale="Equal horizontal and vertical scale · 1 scene unit = 200 m"
        camera={[5, 3.5, 7]}
      >
        <group position={[0, -1.5 * f, 0]}>
          <mesh position={[0, -0.12 * f, 0]}>
            <boxGeometry args={[5, 0.24 * f, 4]} />
            <RockMaterial color="#75685b" />
          </mesh>
          <mesh position={[0, 0.6 * f, 0]}>
            <boxGeometry args={[5, 1.2 * f, 4]} />
            <RockMaterial color="#bba07e" transparent opacity={0.35} depthWrite={false} />
          </mesh>
          {!confined && (
            <mesh position={[0, 2.6 * f, 0]}>
              <boxGeometry args={[5, 2.8 * f, 4]} />
              <RockMaterial color="#bfa784" transparent opacity={0.13} depthWrite={false} />
            </mesh>
          )}
          {confined && (
            <InspectHotspot
              name="Aquitard"
              note="A low-permeability layer confines the aquifer below 12 m. The gold pressure surface above it is the level in a well, not an extra water-filled layer."
            >
              <mesh position={[0, 1.32 * f, 0]}>
                <boxGeometry args={[5, 0.24 * f, 4]} />
                <RockMaterial color="#76635e" transparent opacity={0.8} />
              </mesh>
            </InspectHotspot>
          )}
          <mesh geometry={surface}>
            <meshPhysicalMaterial
              color={confined ? "#dfc17d" : "#4eb2d0"}
              transparent
              opacity={confined ? 0.22 : 0.3}
              roughness={0.25}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          {radii.map((r) => (
            <Line
              key={r}
              points={Array.from({ length: 97 }, (_, i): [number, number, number] => {
                const a = (i / 96) * Math.PI * 2;
                return [
                  (r / 200) * Math.cos(a),
                  (wellHead(r, pump, H, confined) / 10) * f + 0.005,
                  (r / 200) * Math.sin(a),
                ];
              })}
              color={confined ? "#dfc17d" : "#77d0dd"}
              lineWidth={1}
            />
          ))}
          <DebrisField
            points={Array.from({ length: 160 }, (_, i) => {
              const x = -2.35 + (i % 20) * 0.248,
                y = (0.12 + Math.floor(i / 20) * 0.13) * f;
              return [x, y, 2.015];
            })}
            size={0.044}
            color="#b39e80"
          />
          {pump > 0 &&
            Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * 2 * Math.PI,
                r = 0.1 + 1.85 * (1 - ((t + i * 0.173) % 1)) ** 0.65;
              return (
                <mesh key={`flow-${i}`} position={[r * Math.cos(a), 0.56 * f, r * Math.sin(a)]}>
                  <sphereGeometry args={[0.02, 8, 6]} />
                  <meshBasicMaterial color="#d8eef0" />
                </mesh>
              );
            })}
          {[0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1.0].map((y) => (
            <mesh key={y} position={[0, y * f, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.034, 0.005, 5, 20]} />
              <meshStandardMaterial color="#667c80" metalness={0.55} roughness={0.4} />
            </mesh>
          ))}
          <PoreMarkers
            positions={Array.from({ length: 200 }, (_, i) => [
              -2.4 + (i % 20) * 0.25,
              (confined ? 0.08 + Math.floor(i / 20) * 0.11 : 0.1 + Math.floor(i / 20) * 0.35) * f,
              2.04,
            ])}
            colours={Array.from({ length: 200 }, (_, i) => {
              const x = -2.4 + (i % 20) * 0.25,
                y =
                  (confined ? 0.08 + Math.floor(i / 20) * 0.11 : 0.1 + Math.floor(i / 20) * 0.35) *
                  f;
              return (confined ? y < 1.2 * f : y < head(x, 1.99)) ? "#82d3e0" : "#aa987d";
            })}
          />
          <mesh position={[0, 2 * f, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 4 * f, 24, 1, true]} />
            <meshStandardMaterial
              color="#c2c7c5"
              metalness={0.8}
              roughness={0.26}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, (atWell / 20) * f, 0]}>
            <cylinderGeometry args={[0.022, 0.022, (atWell / 10) * f, 16]} />
            <meshBasicMaterial color="#71c5e0" />
          </mesh>
          {pump > 0 && (
            <>
              {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a) => (
                <Arrow
                  key={a}
                  from={[0.85 * Math.cos(a), 0.55 * f, 0.85 * Math.sin(a)]}
                  to={[0.15 * Math.cos(a), 0.55 * f, 0.15 * Math.sin(a)]}
                  color="#85c5d7"
                  width={0.4}
                />
              ))}
              <mesh position={[0, 4.1 * f, 0]}>
                <sphereGeometry args={[0.025 + (0.5 + 0.5 * Math.sin(t * 50)) * 0.02, 12, 12]} />
                <meshBasicMaterial color="#9fdae8" />
              </mesh>
            </>
          )}
          <Tag
            pos={[-2.7, (H / 10) * f + 0.2, 1.9]}
            text={confined ? "Pressure head" : "Water table"}
            note={
              confined
                ? "The potentiometric surface is the level to which water rises in a well. The confined aquifer remains saturated beneath its lid."
                : "The water table separates saturated pores below from an unsaturated zone above. The coloured surface is a level, not a hollow lake."
            }
            occlude={false}
          />
          <Tag
            pos={[0.9, 4.3 * f, 0]}
            text="Pumping well"
            note="The pumping rate is imposed on a fully penetrating ideal well. In this steady experiment a fixed-head boundary supplies the withdrawal; it does not model long-term storage depletion."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">
          {"Q = "}
          {(pump * 800).toFixed(0)} {"m³/day · boundary head "}
          {H.toFixed(1)} {"m · well head "}
          {atWell.toFixed(2)} {"m · drawdown "}
          {(H - atWell).toFixed(2)} {"m."}
        </span>
        <br />
        {confined
          ? "Confined: 12 m saturated thickness; gold is pressure head."
          : "Unconfined: blue marks the top of saturated pores."}{" "}
        {
          "K = 10 m/day, fixed head at 500 m, well radius 0.2 m. Steady Thiem / Dupuit approximation. "
        }
        {pump > 0
          ? "Play follows water moving towards the well through the fixed head field."
          : "Set pumping above zero to follow inward flow tracers."}{" "}
        {""}
      </ScienceReadout>
    </>
  );
}
