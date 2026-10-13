import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ensoSection } from "@/lib/ocean-circulation-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { WaterPrism } from "../shared/water-prism";
import { RockPrism } from "../shared/rock-prism";
import { Tag } from "../shared/kit";
import { OceanSurface } from "../shared/ocean-section";
import { CloudVolume, RainStreaks, FlowFilaments } from "../atmosphere-layers/weather-volumes";
export default function Enso() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 35);
  const c = ensoSection(params.enso ?? 0),
    f = (trueScale ? 1 : 10000) / 3000000,
    west = -c.westDepth * f,
    east = -c.eastDepth * f,
    bottom = -500 * f;
  const left = c.ascentX,
    right = 2.2,
    centre = (left + right) / 2,
    radius = (right - left) / 2;
  const air = (u: number): [number, number, number] => [
    centre + radius * Math.cos(u),
    0.35 + 0.65 * (1 + Math.sin(u)),
    0,
  ];
  return (
    <>
      <ScienceStudio
        slug="enso"
        camera={[1.3, 2.1, 7]}
        scale="Ocean depths ×10,000 · 15,000 km section · atmospheric loop schematic"
        trueScale="Ocean uses 1 scene unit = 3000 km · atmospheric arrows remain schematic"
      >
        <RockPrism
          points={[
            [-2.5, bottom],
            [2.5, bottom],
            [2.5, bottom - 0.12],
            [-2.5, bottom - 0.12],
          ]}
          depth={1.6}
          color="#8a806c"
        />
        <WaterPrism
          points={[
            [-2.5, west - 0.25 * f],
            [2.5, east - 0.25 * f],
            [2.5, bottom],
            [-2.5, bottom],
          ]}
          colour="#356486"
        />
        <WaterPrism
          points={[
            [-2.5, 0],
            [2.5, 0],
            [2.5, east],
            [-2.5, west],
          ]}
          colour="#c98a64"
          colour2={`hsl(${24 + 16 * (1 - (c.eastTemperature - 21) / 8)},40%,55%)`}
          opacity={0.85}
        />
        <OceanSurface
          points={[
            [-2.5, 0],
            [2.5, 0],
          ]}
          flow={[-c.tradeStrength, 0]}
          opacity={0.35}
        />
        <CloudVolume position={[left, 1.38, 0]} scale={[0.62, 0.55, 0.75]} density={90} seed={4} />
        <RainStreaks
          t={t}
          position={[left, 1.2, 0]}
          width={0.7}
          depth={0.9}
          height={0.65}
          count={80}
        />
        <FlowFilaments
          paths={Array.from({ length: 4 }, (_, k) =>
            Array.from({ length: 81 }, (_, i) => {
              const p = air((-i / 80) * Math.PI * 2);
              return [p[0], p[1], -0.5 + k / 3] as [number, number, number];
            }),
          )}
          t={t}
          speed={c.tradeStrength}
          color="#c9dedb"
        />
        <Line
          points={[
            [-2.5, west, 0.82],
            [2.5, east, 0.82],
          ]}
          color="#e1c99d"
          lineWidth={2}
        />
        <Line
          points={Array.from({ length: 81 }, (_, i) => air((i / 80) * Math.PI * 2))}
          color="#91b9c7"
          transparent
          opacity={0.65}
        />
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((u) => (
          <Arrow key={u} from={air(u)} to={air(u - 0.22)} color="#a3d3dc" width={1} />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={air(-(i / 12 + t * c.tradeStrength) * 2 * Math.PI)}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color="#b3dbe0" />
          </mesh>
        ))}
        {!trueScale && (
          <Arrow
            from={[2, -400 * f, 0.86]}
            to={[2, -(400 - 250 * c.upwelling) * f, 0.86]}
            color="#82cbd7"
            width={1}
          />
        )}
        <Tag
          pos={[left, 1.95, 0]}
          text="Convection shifts with warm water"
          note="The Walker circulation is schematic. In El Niño, principal ascent shifts towards the central Pacific and normal easterly trades weaken. Real events differ in strength and location."
          occlude={false}
        />
        <Tag
          pos={[-2.1, 0.06, 1.15]}
          text={`West · ${c.westTemperature.toFixed(1)} °C`}
          note="Ideal western equatorial Pacific, towards Indonesia. Temperatures are prescribed teaching values, not observations or an index-to-temperature calibration."
          occlude={false}
        />
        <Tag
          pos={[2.1, 0.06, 1.15]}
          text={`East · ${c.eastTemperature.toFixed(1)} °C`}
          note="Ideal eastern equatorial Pacific, towards South America. Stronger trades usually favour a shallower eastern thermocline and stronger cold-water upwelling."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {c.phase} {"· thermocline west "}
        {c.westDepth.toFixed(0)} {"m / east "}
        {c.eastDepth.toFixed(0)}{" "}
        {"m. Gold: ideal thermocline; amber: warmer upper water; blue: colder water."}
        <br />
        {
          "ENSO selects a prescribed state. Play moves illustrative tracers, not years or a forecast. Teleconnections change probabilities; they do not determine a particular UK winter."
        }
      </ScienceReadout>
    </>
  );
}
