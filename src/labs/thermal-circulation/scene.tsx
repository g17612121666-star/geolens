import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { coastalContrast } from "@/lib/circulation-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand, TerrainMaterial } from "../shared/natural-world";
import { FlowWaterMaterial } from "../shared/flow-water";
export default function ThermalCirculation() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 50);
  const urban = params.urban > 0.5,
    coast = (params.landsea ?? 1) > 0.5,
    c = coastalContrast(t * 24, urban, coast),
    direction = Math.sign(c.contrast),
    f = trueScale ? 0.25 : 1;
  const path = (u: number, z = 0): [number, number, number] => [
    2.2 * Math.cos(u),
    0.12 + (1 + Math.sin(u)) * 1.2 * f,
    z,
  ];
  return (
    <>
      <ScienceStudio
        slug="thermal-circulation"
        camera={[1.6, 3.3, 7.5]}
        scale="Vertical circulation ×4 · prescribed thermal contrast · markers enlarged"
        trueScale="Conceptual domain 20 km wide and 2 km deep · trees and buildings enlarged"
      >
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[6, 0.4, 2.8]} />
          <TerrainMaterial kind="grass" color="#6c7860" />
        </mesh>
        {!urban && coast && (
          <mesh position={[-1.5, 0.01, 0]}>
            <boxGeometry args={[3, 0.025, 2.8]} />
            <FlowWaterMaterial color="#39728a" flow={[direction * 0.4, 0.1]} speed={0.3} />
          </mesh>
        )}
        {urban ? (
          Array.from({ length: 12 }, (_, i) => (
            <mesh
              key={i}
              position={[
                0.6 + (i % 4) * 0.5,
                0.14 + (i % 3) * 0.04,
                -0.8 + Math.floor(i / 4) * 0.7,
              ]}
            >
              <boxGeometry args={[0.28, 0.28 + (i % 3) * 0.08, 0.3]} />
              <meshStandardMaterial color="#78817c" roughness={0.85} />
            </mesh>
          ))
        ) : (
          <PlantStand
            positions={[0.6, 1.2, 1.8, 2.4].map(
              (x, i) => [x, 0.01, -0.6 + (i % 2) * 0.7] as [number, number, number],
            )}
            scale={0.16}
            kind="conifer"
            seed={3}
          />
        )}
        {direction !== 0 && (
          <>
            <Line
              points={Array.from({ length: 97 }, (_, i) => path((i / 96) * Math.PI * 2))}
              color="#96aaa2"
              transparent
              opacity={0.55}
            />
            {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((a) => (
              <Arrow
                key={a}
                from={path(a)}
                to={path(a + direction * 0.24)}
                color={Math.cos(a) * direction > 0 ? "#e3aa82" : "#83c6d9"}
                width={1}
              />
            ))}
            {Array.from({ length: 18 }, (_, i) => {
              const phase = (t * 4 * direction + i / 18) * Math.PI * 2;
              return (
                <mesh key={i} position={path(phase)}>
                  <sphereGeometry args={[0.043, 16, 12]} />
                  <meshStandardMaterial
                    color={Math.cos(phase) * direction > 0 ? "#e3aa82" : "#83c6d9"}
                  />
                </mesh>
              );
            })}
          </>
        )}
        <Tag
          pos={[-1.7, 0.07, 1.6]}
          text={`${urban ? "Rural" : coast ? "Sea" : "Left"} ${c.left.toFixed(1)} °C`}
          note="The temperatures are prescribed to explore circulation direction, not calculated from a full surface-energy budget."
          occlude={false}
        />
        <Tag
          pos={[1.7, 0.07, 1.6]}
          text={`${urban ? "Urban" : coast ? "Land" : "Right"} ${c.right.toFixed(1)} °C`}
          note="A warmer column tends to expand; pressure differences drive a return circulation. Real breezes depend on background wind, moisture, clouds and terrain."
          occlude={false}
        />
        <Tag
          pos={[0, 2.4 * f + 0.45, 0]}
          text={
            direction > 0
              ? "Surface flow → warmer right"
              : direction < 0
                ? "Surface flow → warmer left"
                : "Equal heating · no loop"
          }
          note="The surface branch flows towards the warmer side, ascent occurs there, and flow returns aloft. Loop height and speed are illustrative."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Illustrative local hour "}
        {(t * 24).toFixed(1)} {"· right minus left "}
        {c.contrast.toFixed(1)} {"°C. "}
        {urban
          ? "Urban heat compares a city with its rural surroundings."
          : coast
            ? direction > 0
              ? "Sea breeze: surface flow onshore."
              : "Land breeze: surface flow offshore."
            : "Both settings are off: equal temperature gives no thermal circulation."}
        <br />
        {
          "Play follows the chosen daily heating cycle. Real conditions may prevent the night-time reversal shown in the coastal example."
        }
      </ScienceReadout>
    </>
  );
}
