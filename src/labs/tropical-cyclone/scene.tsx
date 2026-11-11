import { GuideLine as Line } from "@/labs/shared/guide-line";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { tropicalVortex } from "@/lib/tropical-cyclone-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { EyeCloud } from "./eye-cloud";
import { CloudShield, RainCurtains } from "./cloud-shield";
import { CloudSection, CloudTops } from "./storm-clouds";
import { OceanSection, OceanSurface } from "./ocean";
import { KM_TO_UNITS, OCEAN_DEPTH_UNITS, oceanTemperature } from "./field";

type V3 = [number, number, number];

export default function TropicalCyclone() {
  const { params, t, trueScale, slice } = useLabControls();
  useLabTick(1 / 50);
  const strength = params.intensity ?? 0.7,
    maximum = 20 + 60 * strength,
    spin = params.sh > 0.5 ? 1 : -1,
    satellite = (params.satellite ?? 0) > 0.5,
    vertical = trueScale ? 0.2 : 1,
    km = KM_TO_UNITS * vertical,
    turn = (spin * t * 7200) / 50000,
    center = tropicalVortex(0, maximum),
    open = slice > 0.02,
    wedge = slice * Math.PI * 0.48;
  // A point on one cutaway face (side -1 right, +1 left as seen from the front), nudged into the gap.
  const onFace = (side: number, r: number, y: number): V3 => {
    const cut = Math.PI / 2 + side * wedge,
      off = 0.07;
    return [
      Math.cos(cut) * r + Math.sin(cut) * side * off,
      y,
      Math.sin(cut) * r - Math.cos(cut) * side * off,
    ];
  };
  const warmSea = oceanTemperature(4, 0, strength),
    coolSea = oceanTemperature(0.7, 0, strength);
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
        camera={[0, 4.4, 8.6]}
        scale={
          satellite
            ? "Cloud tops: NASA MODIS image of Hurricane Katrina, 28 August 2005 · 1 unit = 50 km · cloud height ×5 · ocean depth ×160"
            : "Idealized hurricane · 1 unit = 50 km · cloud height ×5 · ocean depth ×160 (top 150 m) · eye radius 15 km, strongest wind at 30 km"
        }
        trueScale="Clouds at common scale: 15 km tops on a storm 550 km across. The ocean layer stays exaggerated so it remains visible"
      >
        {/* Frame the storm's core and inner rainbands; the outer sea and bands may run off the edges. */}
        <mesh userData={{ fitProxy: true }} visible={false} position={[0, 0.55, 0.5]}>
          <boxGeometry args={[7, 2.2, 5.6]} />
        </mesh>
        <group userData={{ noFit: true }}>
          <OceanSurface spin={spin} vmax={maximum} strength={strength} slice={slice} t={t} />
          <OceanSection spin={spin} vmax={maximum} strength={strength} slice={slice} t={t} />
          {satellite ? (
            <group scale={[1, vertical, 1]}>
              <CloudShield slice={slice} spin={spin} t={t} maximum={maximum} vertical={1} />
              <RainCurtains vertical={1} maximum={maximum} />
              <EyeCloud slice={slice} spin={spin} t={t} maximum={maximum} />
            </group>
          ) : (
            <>
              <CloudTops
                spin={spin}
                turn={turn}
                vmax={maximum}
                strength={strength}
                slice={slice}
                vertical={vertical}
              />
              <CloudSection
                spin={spin}
                turn={turn}
                vmax={maximum}
                strength={strength}
                slice={slice}
                vertical={vertical}
              />
            </>
          )}
        </group>

        {open &&
          [-1, 1].map((side) => (
            <group key={side}>
              {/* Warm, moist air spirals in just above the sea. */}
              <Arrow
                from={onFace(side, 4.7, 0.09)}
                to={onFace(side, 1.05, 0.09)}
                color="#efb27a"
                width={2.2}
              />
              {/* It rises in the eyewall, releasing latent heat as its water vapor condenses. */}
              <Arrow
                from={onFace(side, 0.74, 0.2)}
                to={onFace(side, 0.82, 0.04 + 13.2 * km)}
                color="#f08a5b"
                width={2.2}
              />
              {/* Cold, dry air spreads out at the top. */}
              <Arrow
                from={onFace(side, 1.1, 0.04 + 14.4 * km)}
                to={onFace(side, 4.5, 0.04 + 11.5 * km)}
                color="#9fd0e6"
                width={2.2}
              />
              {/* Evaporation from the warm sea surface feeds the inflow. */}
              {[2.3, 3.1, 3.9].map((r) => (
                <Line
                  key={r}
                  points={Array.from({ length: 13 }, (_, i) => {
                    const u = i / 12;
                    return onFace(side, r + 0.07 * Math.sin(u * Math.PI * 3), 0.01 + u * 0.32);
                  })}
                  color="#f6d7a8"
                  lineWidth={1.6}
                />
              ))}
            </group>
          ))}
        {open && (
          <Arrow
            from={[0, 0.04 + 13.5 * km, 0]}
            to={[0, 0.04 + 2.5 * km, 0]}
            color="#e9c9b8"
            width={1.8}
          />
        )}

        <Tag
          pos={[0, 0.35 + 17 * km, 0]}
          text={open ? "Eye · sinking air" : "Eye"}
          note="The eye has light winds and sinking air that warms as it is compressed, so it is often clear. It is surrounded by the strongest winds and deepest clouds of the eyewall; it is not a funnel touching the sea."
          occlude={false}
        />
        <Tag
          pos={open ? onFace(-1, 1.6, 0.04 + 16.8 * km) : [1.6, 0.04 + 15.5 * km, -0.9]}
          text="Eyewall · tallest clouds"
          note="Warm, moist air rises fastest here. As its water vapor condenses it releases latent heat, which warms the core of the storm and keeps the air rising. In this model the wind peaks 30 km from the center; that heat is described, not calculated."
          occlude={false}
        />
        <Tag
          pos={[-3.4, 0.04 + 10 * km, -2.3]}
          text="Spiral rainbands"
          note="Bands of thunderstorms spiral in toward the eyewall, separated by gaps with lighter rain. In the Northern Hemisphere they curve counterclockwise inward; in the Southern Hemisphere, clockwise."
          occlude={false}
        />
        {open && (
          <>
            <Tag
              pos={onFace(-1, 4.3, 0.55)}
              text="Inflow · warm, moist air"
              tone="sandstone"
              note="Near the surface, air spirals in toward low pressure at the center, picking up heat and water vapor from the warm sea as it goes."
              occlude={false}
            />
            <Tag
              pos={onFace(1, 4.4, 0.04 + 13 * km)}
              text="Outflow aloft"
              tone="ice"
              note="At the top of the storm, the air that rose in the eyewall spreads outward, often as a cirrus canopy. Removing air aloft lets more air flow in near the surface."
              occlude={false}
            />
            <Tag
              pos={onFace(1, 3.1, -0.55 * OCEAN_DEPTH_UNITS)}
              text="Warm sea ≥ 26.5 °C"
              tone="magma"
              note="Tropical cyclones usually need surface water of about 26.5 °C or warmer, through a deep enough layer, to keep supplying heat and moisture. The dashed line marks 26.5 °C. Under the core, strong winds mix up cooler water from below, which can weaken a slow-moving storm."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        <svg
          viewBox="0 0 390 108"
          className="mx-auto h-24 w-full max-w-lg"
          role="img"
          aria-label={
            "Idealized wind profile: peak at a radius of 30 kilometers, decreasing outward"
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
        {maximum.toFixed(1)} {"m/s · model center pressure "}
        {(center.pressure / 100).toFixed(0)} {"hPa · sea surface "}
        {warmSea.toFixed(1)} {"°C away from the core, "}
        {coolSea.toFixed(1)} {"°C under the eyewall. "}
        {spin < 0 ? "Northern Hemisphere: counterclockwise" : "Southern Hemisphere: clockwise"}{" "}
        {"viewed from above."} <br />
        {
          "Use Cutaway to look inside. Orange arrows: warm, moist air flowing in and rising in the eyewall. Blue: outflow at the top. Pale: sinking air in the eye. Wavy lines: evaporation from the warm sea. The ocean colors show temperature; the dashed line is 26.5 °C. Clouds turn as in two hours of a steady, idealized vortex. The cloud structure is typical of a mature hurricane, not a particular storm; switch on Real cloud tops to compare with Hurricane Katrina. The model does not forecast intensity, rainfall, track or landfall."
        }
      </ScienceReadout>
    </>
  );
}
