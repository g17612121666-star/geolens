import { useEffect, useMemo, useRef } from "react";
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
  // Keep the selected planet in the scene: picking an outer planet turns on All eight orbits,
  // and turning All eight orbits off while an outer planet is selected returns to Earth.
  const previous = useRef({ all, selected });
  useEffect(() => {
    const was = previous.current;
    previous.current = { all, selected };
    if (all || selected <= 3) return;
    if (was.all && was.selected === selected) setParam("planet", 2);
    else setParam("outer", 1);
  }, [all, selected, setParam]);
  // In the whole-system view the inner orbits fit inside a small cluster, so the selected
  // planet's label is raised on a leader line instead of covering the Sun and inner planets.
  const lift = all ? 0.75 : 0;
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
        space
        scale={
          mode === 0
            ? trueScale
              ? "Orbits use one AU scale · Sun and planets at the same scale"
              : "Orbits use one AU scale · planets enlarged far more than the Sun, so the Sun looks too small beside them"
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
            <ambientLight intensity={0.16} />
            <pointLight position={[0, 0, 0]} intensity={3.2} decay={0} />
            <StarMesh radius={trueScale ? (695700 / AU_KM) * scale : all ? 0.04 : 0.3} />
            {all && <AsteroidBelt scale={scale} />}
            {indices.map((i) => {
              const pos = planetPosition(i, years).map((v) => v * scale) as [
                  number,
                  number,
                  number,
                ],
                // Teaching scale: sizes keep their order (∝ √radius) but are enlarged so
                // each body reads as a disc rather than a dot against its orbit.
                r = trueScale
                  ? planetRadiusAtOrbitScale(i, scale)
                  : all
                    ? Math.max(0.05, 0.22 * Math.sqrt(PLANETS[i].radius / 69911))
                    : 0.3 * Math.sqrt(PLANETS[i].radius / 6371.0084);
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
                    {i === selected && lift > 0 && (
                      <Line
                        points={[
                          [0, r, 0],
                          [0, r + lift, 0],
                        ]}
                        color={PLANETS[i].color}
                        transparent
                        opacity={0.7}
                        lineWidth={1}
                      />
                    )}
                    {i === selected && (
                      <Tag
                        pos={[0, r + 0.18 + lift, 0]}
                        text={PLANETS[i].name}
                        note={`Mean radius ${PLANETS[i].radius.toLocaleString("en-GB")} km; orbital period ${PLANETS[i].period.toFixed(3)} Earth years. Positions come from a fixed model, not today's sky.`}
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
            {sizes.map((v, k) => (
              <group key={v.i} position={[v.x, v.y, 0]}>
                <PlanetBody years={years} index={v.i} radius={v.r} />
                <Tag
                  // Stagger the closely packed inner-planet labels in the eight-planet row.
                  pos={[0, v.r + 0.35 + (all && !mobile && k < 4 && k % 2 ? 0.6 : 0), 0]}
                  text={PLANETS[v.i].name}
                  note={`Mean radius ${PLANETS[v.i].radius.toLocaleString("en-GB")} km; ${(PLANETS[v.i].radius / 6371.0084).toFixed(2)} Earth radii. The spacing here does not show distance.`}
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
                note={`Mean radius ${p.radius.toLocaleString("en-GB")} km. Mercury uses an enhanced-color MESSENGER map. Mars and Saturn use NASA model geometry and mapped materials; Jupiter uses a NASA global map. Venus, Uranus and Neptune have modeled cloud colors, not observed maps.`}
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
          ? "All planets begin at perihelion in this model. Choose physical scale (T) to show true radii at the orbital scale, or turn off All eight orbits to examine the inner system."
          : "Planet textures use enhanced-color Mercury imagery, a NASA/GSFC Jupiter map, and NASA/JPL-Caltech maps for Mars and Saturn. Cloud colors for Venus and the ice giants are modeled. Saturn’s rings consist of particles."}
      </ScienceReadout>
    </>
  );
}

/** Main-belt asteroids between Mars and Jupiter (about 2.1–3.3 AU), drawn as scattered rocks.
 * Positions are random within the belt; sizes are enlarged far beyond true scale. */
function AsteroidBelt({ scale }: { scale: number }) {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry(),
      n = 900,
      p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399 + Math.sin(i * 7.3),
        r = (2.1 + 1.2 * ((i * 0.618034) % 1)) * scale,
        y = 0.08 * scale * Math.sin(i * 12.9);
      p.set([r * Math.cos(a), y, r * Math.sin(a)], i * 3);
    }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    return g;
  }, [scale]);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#a89a86" size={0.018} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}
