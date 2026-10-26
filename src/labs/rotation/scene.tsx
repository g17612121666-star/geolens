import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, AxisLine, Graticule, Atmosphere } from "@/components/globe/earth";
import { StarMesh } from "@/components/globe/star";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { latLonToXYZ } from "@/lib/geo";

/**
 * Sun to the left of the default camera, at right angles to the view, so the camera sees half
 * day and half night. Positive rotation about +Y turns Earth eastward; the near face therefore
 * moves left to right, carrying places from the lit half across the sunset terminator.
 */
const SUN = new THREE.Vector3(-1, 0, 0);
const CITY = { name: "New York", lat: 40.7, lon: -74 };

/** Terminator: the great circle at right angles to the Sun direction (equinox geometry). */
const TERMINATOR = Array.from({ length: 161 }, (_, i): [number, number, number] => {
  const a = (i / 160) * Math.PI * 2;
  return [0, Math.cos(a) * 1.257, Math.sin(a) * 1.257];
});

const ZONES = Array.from({ length: 24 }, (_, i) =>
  Array.from({ length: 65 }, (_, j) => latLonToXYZ(-90 + (j / 64) * 180, i * 15, 1.255)),
);

export default function RotationScene() {
  const { t, params } = useLabControls();
  useLabTick(1 / 28);
  // At t = 0 the 90°E meridian faces the Sun, so Greenwich is at 06:00 local solar time.
  const solar = (((6 + t * 24 + CITY.lon / 15) % 24) + 24) % 24,
    minutes = Math.round(solar * 60) % 1440,
    clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    // Equinox: the Sun is above the horizon from 06:00 to 18:00 local solar time everywhere.
    phase =
      Math.abs(solar - 6) < 0.1
        ? "sunrise"
        : Math.abs(solar - 18) < 0.1
          ? "sunset"
          : solar > 6 && solar < 18
            ? "day"
            : "night";
  return (
    <>
      <ScienceStudio
        slug="rotation"
        lights={false}
        space
        camera={[0, 1, 4.8]}
        scale="Earth rotates eastward · 15° per mean solar hour · Sun direction held fixed · Equinox geometry: axial tilt left out, so the terminator passes through both poles · City marker enlarged"
        trueScale="Spherical Earth · time-zone lines are ideal 15° meridians, not real borders · Equinox geometry: axial tilt left out"
      >
        {/* Sun direction marker: same direction as the shader's light, well outside Earth. */}
        <group position={SUN.clone().multiplyScalar(2.45).toArray()}>
          <StarMesh radius={0.17} />
          <Tag
            pos={[0, 0.38, 0]}
            text="Sunlight"
            note="The Sun is drawn much closer and smaller than reality. Its light arrives as almost parallel rays, lighting one half of Earth at a time."
            occlude={false}
          />
        </group>
        <Atmosphere radius={1.3} />
        <group rotation={[0, t * Math.PI * 2, 0]}>
          <EarthMesh radius={1.25} sunDirection={SUN} />
          <AxisLine radius={1.48} tiltDeg={0} />
          <mesh position={latLonToXYZ(CITY.lat, CITY.lon, 1.265)}>
            <sphereGeometry args={[0.035, 16, 12]} />
            <meshBasicMaterial color="#3EE0C6" />
          </mesh>
          <Tag
            pos={latLonToXYZ(CITY.lat, CITY.lon, 1.4)}
            text={CITY.name}
            tone="glacier"
            note="Follow this marked city as Earth turns. It crosses the terminator into darkness at sunset and back into daylight at sunrise."
          />
          {params.zones > 0.5 ? (
            ZONES.map((points, i) => (
              <Line
                key={i}
                points={points}
                color={i === 0 ? "#f1c994" : "#91a9ac"}
                lineWidth={i === 0 ? 2 : 1}
              />
            ))
          ) : (
            <Graticule radius={1.255} />
          )}
        </group>
        <Line points={TERMINATOR} color="#d9c397" lineWidth={1.25} />
        <Tag
          pos={[0, -0.62, 1.15]}
          text="Terminator (sunset)"
          title="Terminator"
          note="The boundary between the lit and dark halves of Earth. On this side, rotation carries places from day into night; on the far side, places cross it from night into day at sunrise."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {(t * 24).toFixed(2)} {"hours of rotation · "}
        {(t * 360).toFixed(1)}
        {"° · "}
        {CITY.name} {"local solar time "}
        {clock} ({phase}){". West-to-east rotation brings successive places into sunlight. "}
        {params.zones > 0.5
          ? "Civil time zones may depart from these ideal meridians."
          : "Day and night come from geometry, not time-zone boundaries."}
      </ScienceReadout>
    </>
  );
}
