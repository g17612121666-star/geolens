import { Vector3 } from "three";
import { StarMesh } from "@/components/globe/star";
import { EarthMesh } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { radiationBudget } from "@/lib/energy-wind-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { GuideLine as Line } from "@/labs/shared/guide-line";

type Point = [number, number, number];
function Flux({
  from,
  to,
  value,
  color,
  phase,
}: {
  from: Point;
  to: Point;
  value: number;
  color: string;
  phase: number;
}) {
  if (value < 0.01) return null;
  // Band half-width is proportional to the flux (340 W/m² ≈ 0.12), so wider bands carry more energy.
  const half = Math.max(0.02, (value / 340) * 0.12),
    direction = new Vector3(...to).sub(new Vector3(...from)).normalize(),
    normal = new Vector3(-direction.y, direction.x, 0);
  return (
    <group>
      <Arrow from={from} to={to} color={color} width={0.6 + value / 240} />
      {[-1, 1].map((side) => (
        <Line
          key={side}
          points={Array.from({ length: 97 }, (_, i) => {
            const u = i / 96,
              wave =
                Math.sin(u * Math.PI * 16 - phase * Math.PI * 8) * 0.045 * Math.sin(u * Math.PI);
            return from.map(
              (a, k) => a + (to[k] - a) * u + normal.getComponent(k) * (side * half + wave),
            ) as Point;
          })}
          color={color}
          lineWidth={1.2}
          transparent
          opacity={0.65}
        />
      ))}
    </group>
  );
}
export default function EnergyBudget() {
  const { params, t } = useLabControls();
  useLabTick(1 / 12);
  const greenhouse = (params.greenhouse ?? 1) > 0.5,
    b = radiationBudget(params.albedo ?? 0.3, greenhouse ? 0.78 : 0);
  return (
    <>
      <ScienceStudio
        slug="energy-budget"
        scale="One-layer radiation experiment · arrows show global mean fluxes"
        trueScale="Arrow widths represent flux; positions are not atmospheric heights"
        camera={[0.3, 0.8, 8]}
      >
        <group position={[-0.4, -1.25, 0]} rotation={[0, Math.PI, 0]}>
          <EarthMesh radius={1.02} sunDirection={new Vector3(-2, 3, 5)} />
        </group>
        {greenhouse && (
          <>
            <mesh position={[0.1, 0.8, -0.3]}>
              <boxGeometry args={[4.7, 0.3, 1.1]} />
              <meshPhysicalMaterial
                color="#9ccfd2"
                roughness={0.6}
                transparent
                opacity={0.14}
                depthWrite={false}
              />
            </mesh>
            <Molecules t={t} />
          </>
        )}
        <group position={[-3.25, 2.75, 0.2]}>
          <StarMesh radius={0.3} />
        </group>
        <Flux
          from={[-2.8, 2.3, 0.2]}
          to={[-1.2, -0.3, 0.2]}
          value={b.incoming}
          color="#ebc57e"
          phase={t}
        />
        <Flux
          from={[-1.4, -0.2, 0.3]}
          to={[-2.05, 2.3, 0.3]}
          value={b.reflected}
          color="#e9ddbc"
          phase={t}
        />
        <Flux
          // Starts on the globe's surface (x = 0.65 lies beyond the globe's edge).
          from={[0.45, -0.74, 0.3]}
          to={[0.45, greenhouse ? 0.8 : 2.3, 0.3]}
          value={b.surfaceUp}
          color="#e6a085"
          phase={t}
        />
        <Flux
          from={[0.85, 0.9, 0.3]}
          to={[0.85, 2.3, 0.3]}
          value={greenhouse ? b.window : 0}
          color="#e6a085"
          phase={t}
        />
        <Flux
          from={[2, 0.9, 0.3]}
          to={[2, 2.3, 0.3]}
          value={b.atmosphereUp}
          color="#86c8da"
          phase={t}
        />
        <Flux
          from={[0.1, 0.65, 0.5]}
          to={[0.1, -0.35, 0.5]}
          value={b.backRadiation}
          color="#86c8da"
          phase={t}
        />
        <Tag
          pos={[-2.8, 2.65, 0.2]}
          text={`Incoming ${b.incoming.toFixed(0)} W/m²`}
          note="Earth intercepts 1361 W/m² across a disc but spreads it over a sphere with four times the area, so the average is a quarter."
          occlude={false}
        />
        <Tag
          pos={[-2.05, 1.5, 0.4]}
          text={`Reflected ${b.reflected.toFixed(0)} W/m²`}
          note="Planetary albedo is the fraction of incoming sunlight reflected to space by air, clouds and the surface."
          occlude={false}
        />
        <Tag
          pos={[1.1, 2.7, 0.3]}
          text={`To space ${b.outgoing.toFixed(0)} W/m²`}
          note="Outgoing infrared = surface radiation that passes through the layer + infrared the layer emits upwards. At equilibrium it equals the sunlight absorbed."
          occlude={false}
        />
        <Tag
          pos={[greenhouse ? 2 : 2.3, 0.4, 0.3]}
          text={greenhouse ? "IR layer · ε = 0.78" : "No infrared absorption"}
          note="One layer absorbs and emits the same share of infrared at every wavelength but lets sunlight through. The hugely enlarged molecules stand for greenhouse gases: carbon dioxide (linear), water vapour (bent) and methane; their vibrations absorb infrared. Convection, evaporation and wavelength detail are left out."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <span className="text-sandstone">
          {"Sunlight absorbed "}
          {b.absorbed.toFixed(1)}
        </span>{" "}
        ·{" "}
        <span className="text-magma">
          {"Surface emits "}
          {b.surfaceUp.toFixed(1)}
        </span>{" "}
        ·{" "}
        <span className="text-glacier">
          {"Back radiation "}
          {b.backRadiation.toFixed(1)}
        </span>{" "}
        {"W/m². Equilibrium surface temperature "}
        {(b.surfaceK - 273.15).toFixed(1)} {"°C · top-of-atmosphere balance "}
        {Math.abs(b.absorbed - b.outgoing) < 0.05
          ? "0.0"
          : (b.absorbed - b.outgoing).toFixed(1)}{" "}
        {"W/m²."}
        <br />
        {
          "Yellow: sunlight in and reflected. Orange: infrared from the surface. Blue: infrared emitted by the layer, up to space and back down to the surface. Each band’s width is proportional to its flux. Top-of-atmosphere balance is sunlight absorbed minus infrared to space; zero means equilibrium."
        }
      </ScienceReadout>
    </>
  );
}

const ATOM = { C: "#3a3a3a", O: "#d4473b", H: "#f2f2f2" } as const;
type Atom = { e: keyof typeof ATOM; p: Point; r: number };
/** Greenhouse molecules, hugely enlarged: CO₂ is linear, H₂O bent, CH₄ tetrahedral. */
const SHAPES: { name: string; atoms: Atom[] }[] = [
  {
    name: "CO2",
    atoms: [
      { e: "C", p: [0, 0, 0], r: 0.045 },
      { e: "O", p: [-0.1, 0, 0], r: 0.05 },
      { e: "O", p: [0.1, 0, 0], r: 0.05 },
    ],
  },
  {
    name: "H2O",
    atoms: [
      { e: "O", p: [0, 0, 0], r: 0.055 },
      { e: "H", p: [-0.065, -0.05, 0], r: 0.032 },
      { e: "H", p: [0.065, -0.05, 0], r: 0.032 },
    ],
  },
  {
    name: "CH4",
    atoms: [
      { e: "C", p: [0, 0, 0], r: 0.05 },
      { e: "H", p: [0.06, 0.06, 0.06], r: 0.03 },
      { e: "H", p: [-0.06, -0.06, 0.06], r: 0.03 },
      { e: "H", p: [-0.06, 0.06, -0.06], r: 0.03 },
      { e: "H", p: [0.06, -0.06, -0.06], r: 0.03 },
    ],
  },
];
function Molecules({ t }: { t: number }) {
  return (
    <group position={[0.1, 0.8, -0.3]}>
      {Array.from({ length: 14 }, (_, i) => {
        const shape = SHAPES[i % 3],
          x = -2.1 + (i / 13) * 4.2,
          z = -0.4 + 0.8 * ((i * 0.618) % 1),
          wobble = 0.02 * Math.sin(t * 60 + i * 2.1);
        return (
          <group
            key={i}
            position={[x, 0.05 * Math.sin(i * 1.7) + wobble, z]}
            rotation={[i * 0.7, i * 1.3 + t * 2, 0]}
          >
            {shape.atoms.map((a, k) => (
              <mesh key={k} position={a.p.map((v) => v * (1 + wobble * (k ? 2 : 0))) as Point}>
                <sphereGeometry args={[a.r, 16, 12]} />
                <meshStandardMaterial color={ATOM[a.e]} roughness={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
