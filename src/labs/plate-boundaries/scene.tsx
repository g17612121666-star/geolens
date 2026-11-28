import { useLabState } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { ReconstructionGlobe, PlateLines } from "../shared/geo-globe";
import { PlateSection } from "../shared/plate-section";
import { Graticule, CityMarker } from "@/components/globe/earth";
import { Tag } from "../shared/kit";
import { latLonToXYZ } from "@/lib/geo";
import * as THREE from "three";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import { msg, useT } from "@/lib/i18n";

const HAWAII = { lat: 19.4, lon: -155.3 };

/**
 * Turns the globe about its axis so Hawaiʻi faces the current camera when the hotspot is shown;
 * otherwise the marker would usually sit on the far side, out of view.
 */
function GlobeSpin({ faceHawaii, children }: { faceHawaii: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera),
    invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    if (!group.current) return;
    // latLonToXYZ places longitude L at azimuth atan2(x, z) = L + 180°; rotation.y adds to it.
    group.current.rotation.y = faceHawaii
      ? Math.atan2(camera.position.x, camera.position.z) -
        THREE.MathUtils.degToRad(HAWAII.lon + 180)
      : Math.PI;
    invalidate();
  }, [faceHawaii, camera, invalidate]);
  return (
    <group ref={group} rotation-y={Math.PI}>
      {children}
    </group>
  );
}

export default function Plates() {
  const { params } = useLabState("params");
  const tr = useT();
  useLabTick(1 / 16);
  const age = params.ageMa ?? 0,
    section = params.section > 0.5,
    kind = Math.round(params.boundary ?? 0),
    hotspot = params.hotspot > 0.5;
  return (
    <>
      <ScienceStudio
        slug="plate-boundaries"
        scale={
          section
            ? tr("Schematic cross-section · arrows show relative motion")
            : tr(
                "Globe to scale · boundaries from Bird PB2002 · reconstructed coastlines from GPlates",
              )
        }
        trueScale={
          section
            ? tr("Schematic cross-section · no measured length or speed scale")
            : tr("Spherical geometry unchanged · marker sizes enlarged for legibility")
        }
        camera={section ? [3.5, 2.3, 6.5] : [2.8, 1.2, 3.8]}
      >
        {section ? (
          <PlateSection kind={kind} />
        ) : (
          <GlobeSpin faceHawaii={hotspot && age < 5}>
            <ReconstructionGlobe age={age} />
            <Graticule radius={1.255} />
            {age < 5 && <PlateLines />}
            {age < 5 && <PlateMotion />}
            {age < 5 &&
              EXAMPLES.map((e) => (
                <Tag
                  key={e.text}
                  pos={latLonToXYZ(e.lat, e.lon, 1.3)}
                  text={tr(e.text)}
                  short={tr(e.short)}
                  note={tr(e.note)}
                  tone={e.tone}
                  priority={e.priority ?? 0}
                />
              ))}
            {hotspot && age < 5 && (
              <>
                <CityMarker lat={HAWAII.lat} lon={HAWAII.lon} radius={1.26} color="#f99c75" />
                <Tag
                  pos={latLonToXYZ(HAWAII.lat, HAWAII.lon, 1.4)}
                  text={tr("Hawaiʻi hotspot")}
                  note={tr(
                    "Young volcanism at the southeastern end of the Hawaiian chain. Older islands extend northwest as the Pacific plate moves relative to the hotspot.",
                  )}
                />
              </>
            )}
          </GlobeSpin>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {section ? (
          [
            tr("The plates separate, allowing new oceanic crust to form at the ridge."),
            tr("An oceanic plate descends beneath another plate at this convergent boundary."),
            tr("The plates slide past one another along a transform boundary."),
          ][kind]
        ) : age < 5 ? (
          <>
            <p>
              {tr(
                "Present-day plate boundaries. White arrows show the direction each plate moves relative to the hotspots; arrow length is not speed. A boundary's type depends on how the two plates move relative to each other.",
              )}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
              {[
                { name: tr("Divergent"), color: "#69dfce" },
                { name: tr("Convergent"), color: "#f39676" },
                { name: tr("Transform"), color: "#e5ca85" },
              ].map((item) => (
                <span key={item.name} className="rounded-lg border border-white/15 px-2 py-2">
                  <span
                    className="mr-2 inline-block h-2 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          tr(
            "Continental positions {age} million years ago. Move toward the present to compare how the continents have shifted.",
            { age: Math.round(age / 10) * 10 },
          )
        )}
        {hotspot && age >= 5 && !section && " " + tr("Return to the present to locate Hawaiʻi.")}{" "}
        <br />
        {section
          ? tr(
              "Arrows show relative plate motion. Compare the section with the surface pattern on the globe.",
            )
          : tr(
              "The older views carry modern coastlines backward using a plate reconstruction; past sea levels and shorelines also differed.",
            )}
      </ScienceReadout>
    </>
  );
}

/** Named examples of each boundary type, US first; hidden when they turn to the far side. */
const EXAMPLES: {
  lat: number;
  lon: number;
  text: string;
  short: string;
  note: string;
  tone: "glacier" | "magma" | "sandstone";
  priority?: number;
}[] = [
  {
    lat: 35.8,
    lon: -120.4,
    text: msg("San Andreas Fault · transform"),
    short: msg("San Andreas"),
    tone: "sandstone",
    priority: 1,
    note: msg(
      "The Pacific plate slides northwest past the North American plate, about 4–5 cm per year across the whole boundary. Crust is neither made nor destroyed, but stuck sections slip in earthquakes.",
    ),
  },
  {
    lat: 45,
    lon: -125.5,
    text: msg("Cascadia · convergent"),
    short: msg("Cascadia"),
    tone: "magma",
    note: msg(
      "The small Juan de Fuca plate sinks beneath North America. Melting above it feeds the Cascade volcanoes, including Mount St. Helens and Mount Rainier.",
    ),
  },
  {
    lat: -30,
    lon: -13.5,
    text: msg("Mid-Atlantic Ridge · divergent"),
    short: msg("Mid-Atlantic Ridge"),
    tone: "glacier",
    priority: 1,
    note: msg(
      "The plates on either side move apart by a few centimeters a year. Magma rises into the gap and forms new ocean floor, so the Atlantic is slowly widening.",
    ),
  },
  {
    lat: -20,
    lon: -71.8,
    text: msg("Peru–Chile Trench · convergent"),
    short: msg("Peru–Chile Trench"),
    tone: "magma",
    note: msg(
      "The Nazca plate dives beneath South America. The deep trench, the Andes and their volcanoes and large earthquakes all come from this subduction.",
    ),
  },
  {
    lat: 28.5,
    lon: 84,
    text: msg("Himalaya · collision"),
    short: msg("Himalaya"),
    tone: "magma",
    note: msg(
      "Two continents meet: India pushes north into Eurasia. Continental crust is too buoyant to sink far, so it crumples and thickens into the highest mountains on Earth.",
    ),
  },
  {
    lat: 1,
    lon: 36.5,
    text: msg("East African Rift · divergent"),
    short: msg("East African Rift"),
    tone: "glacier",
    note: msg(
      "A continent beginning to split: the Somali plate pulls away from the rest of Africa, opening rift valleys with volcanoes such as Kilimanjaro nearby.",
    ),
  },
];

/**
 * Representative present-day plate motions (direction only, relative to a fixed hotspot
 * frame, generalized from the MORVEL/NUVEL-1A models). Arrow length is not to scale.
 */
const MOTIONS: { lat: number; lon: number; bearing: number; name: string }[] = [
  { lat: 18, lon: -150, bearing: 300, name: "Pacific" },
  { lat: -12, lon: -95, bearing: 82, name: "Nazca" },
  { lat: -12, lon: -48, bearing: 265, name: "South American" },
  { lat: 2, lon: 18, bearing: 55, name: "African" },
  { lat: 22, lon: 78, bearing: 20, name: "Indian" },
  { lat: -25, lon: 133, bearing: 15, name: "Australian" },
  { lat: 42, lon: -98, bearing: 245, name: "North American" },
  { lat: 52, lon: 70, bearing: 80, name: "Eurasian" },
];

function PlateMotion() {
  return (
    <>
      {MOTIONS.map((m) => {
        const r = 1.262,
          p = new THREE.Vector3(...latLonToXYZ(m.lat, m.lon, r)),
          up = p.clone().normalize(),
          north = new THREE.Vector3(...latLonToXYZ(m.lat + 0.5, m.lon, r)).sub(p).normalize(),
          east = new THREE.Vector3().crossVectors(north, up).normalize(),
          b = (m.bearing * Math.PI) / 180,
          dir = north
            .multiplyScalar(Math.cos(b))
            .add(east.multiplyScalar(Math.sin(b)))
            .normalize();
        const from = p.clone().addScaledVector(dir, -0.2).addScaledVector(up, 0.01),
          to = p.clone().addScaledVector(dir, 0.2).addScaledVector(up, 0.01);
        return (
          <Arrow
            key={m.name}
            from={from.toArray() as [number, number, number]}
            to={to.toArray() as [number, number, number]}
            color="#fff6e4"
            width={1.8}
          />
        );
      })}
    </>
  );
}
