import { Vector3 } from "three";
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
  const direction = new Vector3(...to).sub(new Vector3(...from)).normalize(),
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
              (a, k) => a + (to[k] - a) * u + normal.getComponent(k) * (side * 0.095 + wave),
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
          <mesh position={[0.1, 0.8, -0.3]}>
            <boxGeometry args={[4.7, 0.16, 1.1]} />
            <meshPhysicalMaterial
              color="#7ebbbd"
              roughness={0.7}
              transparent
              opacity={0.12}
              depthWrite={false}
            />
          </mesh>
        )}
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
          from={[0.65, -0.55, 0.3]}
          to={[0.65, 0.8, 0.3]}
          value={b.surfaceUp}
          color="#e6a085"
          phase={t}
        />
        <Flux
          from={[0.85, 0.9, 0.3]}
          to={[0.85, 2.3, 0.3]}
          value={b.window}
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
          note="The solar irradiance of 1361 W/m² is divided by four to average a disc intercept over the area of a sphere."
          occlude={false}
        />
        <Tag
          pos={[-2.05, 1.5, 0.4]}
          text={`Reflected ${b.reflected.toFixed(0)}`}
          note="Planetary albedo is the fraction of incoming sunlight reflected to space. It includes atmosphere, clouds and surface."
          occlude={false}
        />
        <Tag
          pos={[1.1, 2.7, 0.3]}
          text={`To space ${b.outgoing.toFixed(0)} W/m²`}
          note="Outgoing longwave equals surface radiation transmitted through the layer plus upward radiation emitted by the layer. At equilibrium it balances absorbed sunlight."
          occlude={false}
        />
        <Tag
          pos={[2, 0.4, 0.3]}
          text={greenhouse ? "IR layer · ε = 0.78" : "No infrared absorption"}
          note="A grey layer absorbs and emits infrared but is transparent to sunlight. This deliberately omits convection, latent heat and spectral detail."
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
        {"W/m²."}
        <br />
        {"Surface equilibrium "}
        {(b.surfaceK - 273.15).toFixed(1)} {"°C · top-of-atmosphere balance "}
        {(b.absorbed - b.outgoing).toFixed(1)}{" "}
        {"W/m². Follow the wave symbols to trace the exchange of energy."}
      </ScienceReadout>
    </>
  );
}
