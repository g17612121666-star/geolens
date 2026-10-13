import { useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { PLANETS, planetPosition, planetRadiusAtOrbitScale } from "@/lib/planet-science";
import { AU_KM } from "@/lib/distance-science";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { useIsCompact } from "@/hooks/use-media";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlanetBody } from "./planet-bodies";
import { StarMesh } from "@/components/globe/star";
function Orbit({ index, scale }: { index: number; scale: number }) {
  const path = useMemo(
    () =>
      Array.from(
        { length: 321 },
        (_, i) =>
          planetPosition(index, (PLANETS[index].period * i) / 320).map((v) => v * scale) as [
            number,
            number,
            number,
          ],
      ),
    [index, scale],
  );
  return (
    <Line points={path} color={PLANETS[index].color} transparent opacity={0.68} lineWidth={1.4} />
  );
}
export default function SolarSystem() {
  const { params, t, trueScale, setParam } = useLabControls();
  useLabTick(1 / 60);
  const mode = Math.round(params.view ?? 0),
    all = params.outer > 0.5,
    span = params.span ?? 2,
    years = t * span,
    selected = Math.round(params.planet ?? 2),
    p = PLANETS[selected],
    indices = (all ? PLANETS : PLANETS.slice(0, 4)).map((_, i) => i),
    scale = all ? 0.16 : 2.5,
    mobile = useIsCompact(),
    selectedPosition = planetPosition(selected, years);
  const radiusUnit = all ? 69911 : 6371.0084;
  const extents = indices.map((i) => (PLANETS[i].radius / radiusUnit) * (i === 5 ? 2.45 : 1));
  const offsets: number[] = [];
  let cursor = 0;
  indices.forEach((_, i) => {
    offsets.push(cursor + extents[i]);
    cursor += extents[i] * 2 + 0.6;
  });
  const sizes = indices.map((i, k) => ({
    i,
    r: PLANETS[i].radius / radiusUnit,
    x: mobile ? ((k % 2) - 0.5) * (all ? 5.5 : 3) : offsets[k] - (cursor - 0.6) / 2,
    y: mobile ? (Math.ceil(indices.length / 2) - 1) * 1.75 - Math.floor(k / 2) * 3.5 : 0,
  }));
  return (
    <>
      <ScienceStudio
        key={mode}
        slug="solar-system"
        camera={mode === 0 ? [1, 7, 7] : [0, 1.4, 9]}
        lights={mode !== 0}
        scale={
          mode === 0
            ? `Orbits use one AU scale · bodies ${trueScale ? "at the same scale" : "enlarged for visibility"}`
            : mode === 1
              ? "Mean-radius comparison · one size scale · spacing is a display arrangement"
              : "Selected body close-up · radius shown below · comparison Earth shares its size scale"
        }
        trueScale={
          mode === 0
            ? "Radii and orbital distances share one scale · labels are visibility symbols"
            : "Mean radii remain at one relative scale · positions are not orbital distances"
        }
      >
        {mode === 0 ? (
          <>
            <ambientLight intensity={0.06} />
            <pointLight position={[0, 0, 0]} intensity={3} decay={0} />
            <StarMesh radius={trueScale ? (695700 / AU_KM) * scale : 0.12} />
            {indices.map((i) => {
              const pos = planetPosition(i, years).map((v) => v * scale) as [
                  number,
                  number,
                  number,
                ],
                r = trueScale
                  ? planetRadiusAtOrbitScale(i, scale)
                  : 0.035 + 0.085 * Math.sqrt(PLANETS[i].radius / 69911);
              return (
                <group key={i}>
                  <Orbit index={i} scale={scale} />
                  <group position={pos}>
                    <PlanetBody
                      years={years}
                      index={i}
                      radius={r}
                      sun={new THREE.Vector3(...pos).negate()}
                    />
                    {i === selected && (
                      <Tag
                        pos={[0, 0.3, 0]}
                        text={PLANETS[i].name}
                        note={`Mean radius ${PLANETS[i].radius.toLocaleString("en-GB")} km; orbital period ${PLANETS[i].period.toFixed(3)} Earth years. Orbital geometry is a fixed-element experiment, not the current sky.`}
                        occlude={false}
                      />
                    )}
                  </group>
                </group>
              );
            })}
          </>
        ) : mode === 1 ? (
          <>
            {sizes.map((v) => (
              <group key={v.i} position={[v.x, v.y, 0]}>
                <PlanetBody years={years} index={v.i} radius={v.r} />
                <Tag
                  pos={[0, v.r + 0.35, 0]}
                  text={PLANETS[v.i].name}
                  note={`Mean radius ${PLANETS[v.i].radius.toLocaleString("en-GB")} km; ${(PLANETS[v.i].radius / 6371.0084).toFixed(2)} Earth radii. Spacing on this comparison board has no distance meaning.`}
                  occlude={false}
                />
              </group>
            ))}
          </>
        ) : (
          <>
            <group position={[-(3 + (1.2 * 6371.0084) / p.radius) / 2, 0, 0]}>
              <PlanetBody years={years} index={selected} radius={1.2} />
              <Tag
                pos={[0, 1.7, 0]}
                text={p.name}
                note={`Mean radius ${p.radius.toLocaleString("en-GB")} km. Mercury uses an enhanced-colour MESSENGER map. Mars and Saturn use NASA model geometry and mapped materials; Jupiter uses a NASA global map. Venus, Uranus and Neptune show explicitly modelled cloud colours, not mapped weather observations.`}
                occlude={false}
              />
            </group>
            <group position={[(3 + (1.2 * 6371.0084) / p.radius) / 2, 0, 0]}>
              <PlanetBody years={years} index={2} radius={(1.2 * 6371.0084) / p.radius} />
              <Tag
                pos={[0, (1.2 * 6371.0084) / p.radius + 0.35, 0]}
                text="Earth comparison"
                note="Both bodies use the same radius multiplier. Positions and lighting are arranged for comparison, not an orbital alignment."
                occlude={false}
              />
            </group>
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        <div className="pointer-events-auto mb-1 flex flex-wrap justify-center gap-1">
          {PLANETS.map((planet, i) => (
            <button
              key={planet.name}
              type="button"
              aria-pressed={i === selected}
              onClick={() => {
                setParam("planet", i);
                if (i > 3) setParam("outer", 1);
              }}
              className={`min-h-11 rounded-lg border px-2 text-xs ${i === selected ? "border-glacier text-chalk" : "border-white/10 text-mist"}`}
            >
              {planet.name}
            </button>
          ))}
        </div>
        {p.name}
        {": mean radius "}
        {p.radius.toLocaleString("en-GB")} {"km · a = "}
        {p.a.toFixed(3)} {"AU · period "}
        {p.period.toFixed(3)} {"years."}
        {mode === 0
          ? ` Model year ${years.toFixed(3)}; distance ${Math.hypot(...selectedPosition).toFixed(3)} AU.`
          : ` Model year ${years.toFixed(3)}; the selected planet rotates on the same time scale as the orbital view.`}
        <br />
        {mode === 0
          ? "All planets begin at perihelion in this model. Press T to show physical radii at the orbital scale, or choose Inner / all orbits to examine the inner system."
          : "Planet textures use enhanced-colour Mercury imagery, a NASA/GSFC Jupiter map, and NASA/JPL-Caltech maps for Mars and Saturn. Cloud colours for Venus and the ice giants are modelled. Saturn’s rings consist of particles."}
      </ScienceReadout>
    </>
  );
}
