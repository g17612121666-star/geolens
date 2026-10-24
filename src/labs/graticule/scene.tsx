import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { latLonToXYZ } from "@/lib/geo";

const ring = (lat: number, r: number) =>
  Array.from({ length: 129 }, (_, i) => latLonToXYZ(lat, -180 + (i / 128) * 360, r));
const meridian = (lon: number, r: number) =>
  Array.from({ length: 97 }, (_, i) => latLonToXYZ(-90 + (i / 96) * 180, lon, r));

/** 30° graticule. Unlike the shared one it ignores raycasts, so it cannot hide scene labels. */
function Grid({ radius }: { radius: number }) {
  const geometry = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let lat = -60; lat <= 60; lat += 30)
      for (let lon = -180; lon < 180; lon += 3)
        pts.push(
          new THREE.Vector3(...latLonToXYZ(lat, lon, radius)),
          new THREE.Vector3(...latLonToXYZ(lat, lon + 3, radius)),
        );
    for (let lon = -180; lon < 180; lon += 30)
      for (let lat = -84; lat < 84; lat += 3)
        pts.push(
          new THREE.Vector3(...latLonToXYZ(lat, lon, radius)),
          new THREE.Vector3(...latLonToXYZ(lat + 3, lon, radius)),
        );
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <lineSegments geometry={geometry} raycast={() => null}>
      <lineBasicMaterial color="#8b9a97" transparent opacity={0.32} />
    </lineSegments>
  );
}

const hemi = (v: number, pos: string, neg: string) =>
  `${Math.abs(v).toFixed(1)}°${Math.abs(v) < 0.05 ? "" : v < 0 ? neg : pos}`;

export default function GraticuleScene() {
  const { params } = useLabControls(),
    lat = params.lat ?? 51.5,
    lon = params.lon ?? -0.1;
  const parallel = useMemo(() => ring(lat, 1.265), [lat]);
  const localMeridian = useMemo(() => meridian(lon, 1.27), [lon]);
  const equator = useMemo(() => ring(0, 1.262), []);
  const prime = useMemo(() => meridian(0, 1.262), []);
  const special = useMemo(() => [23.44, -23.44, 66.56, -66.56].map((l) => ring(l, 1.262)), []);
  // One degree of longitude spans 111.32 km × cos(latitude) on a sphere of Earth's mean radius.
  const labelLat = lat >= 0 ? lat - 9 : lat + 9;
  // Hide a tropic or polar-circle label when the coordinate label would sit on top of it.
  const clear = (l: number) => Math.abs(labelLat - l) >= 10;
  const kmPerDegree = 111.32 * Math.cos((lat * Math.PI) / 180);
  return (
    <>
      <ScienceStudio
        slug="graticule"
        space
        scale="Spherical coordinates · lines and marker enlarged for clarity · globe tipped to keep the marker in view"
        trueScale="Latitude and longitude angles are true; Earth represented as a sphere"
        lights={false}
        camera={[0, 1, 4.8]}
      >
        {/* Tip the globe towards the viewer by half the latitude so high-latitude markers stay
            on the visible face; turn it so the marker's meridian faces the camera. */}
        <group rotation={[(lat * 0.5 * Math.PI) / 180, 0, 0]}>
          <group rotation={[0, Math.PI - (lon * Math.PI) / 180, 0]}>
            <EarthMesh radius={1.25} lighting="viewer" />
            <Grid radius={1.26} />
            <Line points={equator} color="#e9d9b4" lineWidth={1.4} />
            <Line points={prime} color="#e9d9b4" lineWidth={1.4} />
            <Tag
              pos={latLonToXYZ(0, lon - 35, 1.36)}
              text="Equator 0°"
              note="The equator is the 0° line of latitude, halfway between the poles."
            />
            {/* Only label the prime meridian while it is on the visible face of the globe. */}
            {Math.abs(lon) <= 60 && (Math.abs(lon) > 15 || clear(-38)) && (
              <Tag
                pos={latLonToXYZ(-38, 0, 1.36)}
                text="Prime meridian 0°"
                note="The prime meridian through Greenwich is the agreed 0° line of longitude; east and west are measured from it."
              />
            )}
            {/* Tropics and polar circles, at the latitudes set by Earth's axial tilt. */}
            {special.map((points, i) => (
              <Line
                key={i}
                points={points}
                color={i < 2 ? "#f1d38a" : "#cfe6f2"}
                lineWidth={1}
                dashed
                dashSize={0.05}
                gapSize={0.035}
                transparent
                opacity={0.8}
              />
            ))}
            {clear(23.44) && (
              <Tag
                pos={latLonToXYZ(23.44, lon + 40, 1.34)}
                text="Tropic of Cancer 23.4°N"
                note="The furthest north the Sun is ever directly overhead, at the June solstice. Its latitude equals Earth's axial tilt."
              />
            )}
            {clear(-23.44) && (
              <Tag
                pos={latLonToXYZ(-23.44, lon + 50, 1.34)}
                text="Tropic of Capricorn 23.4°S"
                note="The furthest south the Sun is ever directly overhead, at the December solstice."
              />
            )}
            {clear(66.56) && (
              <Tag
                pos={latLonToXYZ(66.56, lon - 40, 1.34)}
                text="Arctic Circle 66.6°N"
                note="North of this line there is at least one day each year when the Sun does not set, and one when it does not rise."
              />
            )}
            {/* Gold = latitude (the marker's parallel and the arc up its meridian);
                blue = longitude (the marker's meridian and the arc along the equator). */}
            <Line points={parallel} color="#edb777" lineWidth={2} />
            <Line points={localMeridian} color="#7fd4ff" lineWidth={2} />
            <Line
              points={Array.from({ length: 65 }, (_, i) => latLonToXYZ((lat * i) / 64, lon, 1.285))}
              color="#f4bc81"
              lineWidth={3.5}
            />
            <Line
              points={Array.from({ length: 97 }, (_, i) => latLonToXYZ(0, (lon * i) / 96, 1.285))}
              color="#92dce8"
              lineWidth={3.5}
            />
            <mesh position={latLonToXYZ(lat, lon, 1.29)}>
              <sphereGeometry args={[0.035, 16, 12]} />
              <meshBasicMaterial color="#ff6b5a" />
            </mesh>
            <Tag
              // Sit the label on the equator side of the marker so it does not cover the dot.
              pos={latLonToXYZ(labelLat, lon, 1.36)}
              text={`${hemi(lat, "N", "S")} ${hemi(lon, "E", "W")}`}
              note="Latitude is north or south of the equator. Longitude is east or west of Greenwich. Poles are shared by every meridian."
              occlude={false}
            />
          </group>
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {"Latitude "}
        {hemi(lat, "N", "S")}
        {" · longitude "}
        {hemi(lon, "E", "W")}
        {" · 1° of longitude here ≈ "}
        {kmPerDegree.toFixed(0)}
        {" km (111 km at the equator) · local mean solar time "}
        {lon / 15 >= 0 ? "+" : "−"}
        {Math.abs(lon / 15).toFixed(2)}
        {
          " h from Greenwich. Gold arc measures latitude from the equator; blue arc measures longitude from Greenwich. This does not select a civil time zone."
        }
      </ScienceReadout>
    </>
  );
}
