import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { tropicalVortex } from "@/lib/tropical-cyclone-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { EyeCloud } from "./eye-cloud";
import { CloudShield, RainCurtains, WindSea } from "./cloud-shield";
export default function TropicalCyclone() {
  const { params, t, trueScale, slice } = useLabControls();
  useLabTick(1 / 50);
  const maximum = 20 + 60 * (params.intensity ?? 0.7),
    spin = params.sh > 0.5 ? 1 : -1,
    vertical = trueScale ? 0.2 : 1,
    centre = tropicalVortex(0, maximum);
  const trace = Array.from(
    { length: 101 },
    (_, i) =>
      `${(25 + (i / 100) * 340).toFixed(3)},${(80 - (tropicalVortex((i / 100) * 150000, maximum).wind / 80) * 65).toFixed(3)}`,
  ).join(" ");
  return (
    <>
      <ScienceStudio
        slug="tropical-cyclone"
        horizon
        camera={[4, 5.5, 8]}
        scale="Cloud height ×5 · max-wind radius 30 km · ocean domain radius 300 km"
        trueScale="1 scene unit = 50 km · 12 km cloud depth at common geometric scale"
      >
        <mesh position={[0, -0.04, 0]}>
          <cylinderGeometry args={[6, 6, 0.08, 128]} />
          <FlowWaterMaterial
            color="#123d55"
            opacity={1}
            roughness={0.28}
            speed={0.25}
            flow={[spin, 0.2]}
          />
        </mesh>
        <WindSea spin={spin} maximum={maximum} t={t} />
        <group scale={[1, vertical, 1]}>
          <CloudShield slice={slice} spin={spin} t={t} maximum={maximum} vertical={1} />
          <RainCurtains vertical={1} maximum={maximum} />
          <EyeCloud slice={slice} spin={spin} t={t} maximum={maximum} />
          {Array.from({ length: 30 }, (_, i) => {
            const r = 0.6 + (i % 5) * 0.8,
              angle =
                i * 2.399 +
                (spin * t * 7200 * tropicalVortex(r * 50000, maximum).wind) / (r * 50000);
            return (
              <mesh key={i} position={[r * Math.cos(angle), 0.04, r * Math.sin(angle)]}>
                <sphereGeometry args={[0.028, 12, 10]} />
                <meshBasicMaterial color="#efce96" />
              </mesh>
            );
          })}
          {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
            <group key={a}>
              <Arrow
                from={[2.8 * Math.cos(a), 0.08, 2.8 * Math.sin(a)]}
                to={[1.2 * Math.cos(a), 0.08, 1.2 * Math.sin(a)]}
                color="#e2b17c"
                width={0.8}
              />
              <Arrow
                from={[0.82 * Math.cos(a), 0.1, 0.82 * Math.sin(a)]}
                to={[0.9 * Math.cos(a), 1.2, 0.9 * Math.sin(a)]}
                color="#a8d0d8"
                width={0.8}
              />
              <Arrow
                from={[1.3 * Math.cos(a), 1.35, 1.3 * Math.sin(a)]}
                to={[3.3 * Math.cos(a), 1.35, 3.3 * Math.sin(a)]}
                color="#a8d0d8"
                width={0.8}
              />
            </group>
          ))}
          <Arrow from={[0, 1.1, 0]} to={[0, 0.2, 0]} color="#debfb0" width={0.65} />
        </group>
        <Line
          points={[
            [0, 0.05, 0],
            [-1.3, 0.7, 1.4],
          ]}
          color="#c9d9d8"
        />
        <Tag
          pos={[-2.4, 0.85, 2.3]}
          text="Eye"
          note="The eye has relatively light winds, sinking air and often little cloud. It is surrounded by the strong winds and deep convection of the eyewall; it is not a funnel touching the sea."
          occlude={false}
        />
        <Tag
          pos={[2.0, 1.65 * vertical, -0.5]}
          text="Eyewall"
          note="In this model the wind peaks 30 km from the centre. In real storms, rising moist air releases latent heat that powers the eyewall; that heat is not calculated here."
          occlude={false}
        />
        <Tag
          pos={[-3.7, 0.7, -1.4]}
          text="Rainbands"
          note="Cloud shapes are a 3D structural illustration, not satellite data or simulated rainfall. Actual bands, eye size and symmetry vary considerably."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 390 108"
          className="mx-auto h-24 w-full max-w-lg"
          role="img"
          aria-label={
            "Idealised wind profile: peak at a radius of 30 kilometres, decreasing outwards"
          }
        >
          <line x1="25" x2="365" y1="80" y2="80" stroke="#8b9f9c" />
          <polyline points={trace} stroke="var(--color-sandstone)" fill="none" strokeWidth="2" />
          <text x="2" y="16" fill="var(--color-mist)" fontSize="12">
            {"80 m/s"}
          </text>
          <text x="25" y="102" fill="var(--color-mist)" fontSize="12">
            {"0 km"}
          </text>
          <text x="85" y="102" fill="var(--color-mist)" fontSize="12">
            {"30 km"}
          </text>
          <text x="325" y="102" fill="var(--color-mist)" fontSize="12">
            {"150 km"}
          </text>
        </svg>
        {"Maximum tangential wind "}
        {maximum.toFixed(1)} {"m/s · model centre pressure "}
        {(centre.pressure / 100).toFixed(0)} {"hPa. "}
        {spin < 0 ? "Northern Hemisphere: anticlockwise" : "Southern Hemisphere: clockwise"}{" "}
        {"viewed from above."}
        <br />
        {
          "Use Cutaway to open the structure. Clouds and tracers move as in two hours of a steady, idealised vortex; arrows show inflow, rising air and outflow. The model does not forecast intensity changes, rainfall, track or landfall."
        }
      </ScienceReadout>
    </>
  );
}
