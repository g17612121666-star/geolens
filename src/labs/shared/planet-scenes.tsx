import { useMemo } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { EarthMesh, AxisLine, Graticule, CityMarker, Atmosphere } from "@/components/globe/earth";
import { StarMesh } from "@/components/globe/star";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "./science-kit";
import { Tag } from "./kit";
import { latLonToXYZ } from "@/lib/geo";
import { solarEphemeris, daylight } from "@/lib/solar";
import { TerrainMaterial, PlantStand } from "./natural-world";
import { skyPosition } from "../solar-altitude/sky";

export function RotationScene() {
  const { t, params } = useLabControls();
  useLabTick(1 / 28);
  return (
    <>
      <ScienceStudio
        slug="rotation"
        lights={false}
        space
        camera={[0, 1, 4.8]}
        scale="Earth rotates eastward · 15° per mean solar hour · Sun direction held fixed"
        trueScale="Spherical Earth · time-zone lines are ideal 15° meridians, not civil borders"
      >
        {/* Sun direction marker: same direction as the shader's light, well outside Earth. */}
        <group position={ROTATION_SUN.clone().multiplyScalar(2.45).toArray()}>
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
          <EarthMesh radius={1.25} sunDirection={ROTATION_SUN} />
          <AxisLine radius={1.48} tiltDeg={0} />
          <CityMarker lat={51.5} lon={-0.1} radius={1.27} />
          {params.zones > 0.5 ? (
            Array.from({ length: 24 }, (_, i) => (
              <Line
                key={i}
                points={Array.from({ length: 65 }, (_, j) =>
                  latLonToXYZ(-90 + (j / 64) * 180, i * 15, 1.255),
                )}
                color={i === 0 ? "#f1c994" : "#91a9ac"}
                lineWidth={i === 0 ? 2 : 1}
              />
            ))
          ) : (
            <Graticule radius={1.255} />
          )}
        </group>
        <Line
          points={Array.from({ length: 161 }, (_, i): [number, number, number] => {
            const a = (i / 160) * Math.PI * 2;
            return [
              (-Math.sin(a) / Math.sqrt(10)) * 1.257,
              Math.cos(a) * 1.257,
              ((3 * Math.sin(a)) / Math.sqrt(10)) * 1.257,
            ];
          })}
          color="#d9c397"
          lineWidth={1.25}
        />
      </ScienceStudio>
      <ScienceReadout>
        {(t * 24).toFixed(2)} {"hours of rotation · "}
        {(t * 360).toFixed(1)}
        {"°. West-to-east rotation brings successive places into sunlight. "}
        {params.zones > 0.5
          ? "Civil time zones may depart from these ideal meridians."
          : "Day and night come from geometry, not time-zone boundaries."}
      </ScienceReadout>
    </>
  );
}

const ROTATION_SUN = new THREE.Vector3(3, 0, 1).normalize();

export function GraticuleScene() {
  const { params } = useLabControls(),
    lat = params.lat ?? 51.5,
    lon = params.lon ?? -0.1;
  const latitude = useMemo(
    () => Array.from({ length: 129 }, (_, i) => latLonToXYZ(lat, -180 + (i / 128) * 360, 1.265)),
    [lat],
  );
  const longitude = useMemo(
    () => Array.from({ length: 97 }, (_, i) => latLonToXYZ(-90 + (i / 96) * 180, lon, 1.27)),
    [lon],
  );
  return (
    <>
      <ScienceStudio
        slug="graticule"
        space
        scale="Spherical coordinates · lines and marker enlarged for clarity"
        trueScale="Latitude and longitude angles are true; Earth represented as a sphere"
        lights={false}
        camera={[0, 1, 4.8]}
      >
        <group rotation={[0, Math.PI - (lon * Math.PI) / 180, 0]}>
          <EarthMesh radius={1.25} lighting="viewer" />
          <Graticule radius={1.26} />
          <Line
            points={Array.from({ length: 129 }, (_, i) =>
              latLonToXYZ(0, -180 + (i / 128) * 360, 1.262),
            )}
            color="#e9d9b4"
            lineWidth={1.4}
          />
          <Line
            points={Array.from({ length: 97 }, (_, i) =>
              latLonToXYZ(-90 + (i / 96) * 180, 0, 1.262),
            )}
            color="#e9d9b4"
            lineWidth={1.4}
          />
          <Tag
            pos={latLonToXYZ(0, -25, 1.36)}
            text="Equator 0°"
            note="The equator is the 0° line of latitude, halfway between the poles."
          />
          <Tag
            pos={latLonToXYZ(38, 0, 1.36)}
            text="Prime meridian 0°"
            note="The prime meridian through Greenwich is the agreed 0° line of longitude; east and west are measured from it."
          />
          {/* Tropics and polar circles, at the latitudes set by Earth's axial tilt. */}
          {[23.44, -23.44, 66.56, -66.56].map((l) => (
            <Line
              key={l}
              points={Array.from({ length: 129 }, (_, i) =>
                latLonToXYZ(l, -180 + (i / 128) * 360, 1.262),
              )}
              color={Math.abs(l) < 30 ? "#f1d38a" : "#cfe6f2"}
              lineWidth={1}
              dashed
              dashSize={0.05}
              gapSize={0.035}
              transparent
              opacity={0.8}
            />
          ))}
          <Tag
            pos={latLonToXYZ(23.44, -55, 1.34)}
            text="Tropic of Cancer 23.4°N"
            note="The furthest north the Sun is ever directly overhead, at the June solstice. Its latitude equals Earth's axial tilt."
          />
          <Tag
            pos={latLonToXYZ(66.56, -40, 1.34)}
            text="Arctic Circle 66.6°N"
            note="North of this line there is at least one day each year when the Sun does not set, and one when it does not rise."
          />
          <Line points={latitude} color="#7fd4ff" lineWidth={2} />
          <Line points={longitude} color="#edb777" lineWidth={2} />
          <CityMarker lat={lat} lon={lon} radius={1.28} />
          <Line
            points={Array.from({ length: 65 }, (_, i) => latLonToXYZ((lat * i) / 64, lon, 1.285))}
            color="#f4bc81"
            lineWidth={3}
          />
          <Line
            points={Array.from({ length: 97 }, (_, i) => latLonToXYZ(0, (lon * i) / 96, 1.285))}
            color="#92dce8"
            lineWidth={3}
          />
          <Tag
            pos={latLonToXYZ(lat, lon, 1.42)}
            text={`${Math.abs(lat).toFixed(1)}°${lat < 0 ? "S" : "N"} ${Math.abs(lon).toFixed(1)}°${lon < 0 ? "W" : "E"}`}
            note="Latitude is north or south of the equator. Longitude is east or west of Greenwich. Poles are shared by every meridian."
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        {"Latitude "}
        {lat.toFixed(1)}
        {"° · longitude "}
        {lon.toFixed(1)}
        {"° · local mean solar-time difference "}
        {lon / 15 >= 0 ? "+" : ""}
        {(lon / 15).toFixed(2)}{" "}
        {
          "h from Greenwich. Gold arc measures latitude from the equator; blue arc measures longitude from Greenwich. This does not select a civil time zone."
        }
      </ScienceReadout>
    </>
  );
}

export { LunarModel as LunarScene } from "./lunar-model";

export function SolarAltitudeScene() {
  const { t, params } = useLabControls();
  useLabTick(1 / 36);
  const lat = params.latitude ?? 51.5,
    date = new Date(Date.UTC(2026, 0, 1) + t * 365 * 86400000),
    declination = solarEphemeris(date).declination;
  const points = Array.from({ length: 145 }, (_, i) =>
    skyPosition(lat, declination, (i / 144) * 24),
  );
  const noon = points[72],
    length = daylight(lat, declination),
    hour = params.hour ?? 12,
    selected = skyPosition(lat, declination, hour);
  const shadowLength =
      selected[1] > 0.005
        ? Math.min(1.72, (0.22 * Math.hypot(selected[0], selected[2])) / selected[1])
        : 0,
    azimuth = Math.atan2(selected[2], selected[0]);
  return (
    <>
      <ScienceStudio
        slug="solar-altitude"
        horizon
        scale="Local sky sphere · horizon and solar path use true angles"
        trueScale="Sky directions are angular · the Sun is drawn larger than its angular diameter"
        camera={[4, 2.8, 5]}
      >
        <SunLight position={selected} />
        <SolarGround />
        <Sundial />
        <SkyDome sun={selected} />
        <Line points={points.filter((p) => p[1] > -0.02)} color="#f2c777" lineWidth={2.4} />
        <Line
          points={points.filter((p) => p[1] <= 0)}
          color="#7d6c4e"
          lineWidth={1}
          dashed
          dashSize={0.06}
          gapSize={0.05}
        />
        {Array.from({ length: 24 }, (_, h) => skyPosition(lat, declination, h))
          .filter((p) => p[1] > 0.01)
          .map((p, i) => (
            <mesh key={i} position={p}>
              <sphereGeometry args={[0.022, 12, 8]} />
              <meshBasicMaterial color="#f7dca0" />
            </mesh>
          ))}
        <group position={selected}>
          {selected[1] > 0 ? (
            <StarMesh radius={0.075} />
          ) : (
            <mesh>
              <sphereGeometry args={[0.06, 24, 16]} />
              <meshBasicMaterial color="#8a7a5b" />
            </mesh>
          )}
        </group>
        {shadowLength > 0 && (
          <Line
            points={[
              [0, 0.006, 0],
              [-Math.cos(azimuth) * shadowLength, 0.006, -Math.sin(azimuth) * shadowLength],
            ]}
            color="#20322b"
            lineWidth={5}
          />
        )}
        <Line
          points={[[0, 0, 0], selected]}
          color="#f7dfa5"
          dashed
          dashSize={0.08}
          gapSize={0.04}
        />
        <Tag pos={[0, 0, 2.1]} text="North" occlude={false} />
        <Tag pos={[0, 0, -2.1]} text="South" occlude={false} />
        <Tag pos={[-2.1, 0, 0]} text="East" occlude={false} />
        <Tag pos={[2.1, 0, 0]} text="West" occlude={false} />
        <Tag
          pos={[noon[0], noon[1] + 0.3, noon[2]]}
          text={`Noon ${(90 - Math.abs(lat - (declination * 180) / Math.PI)).toFixed(1)}°`}
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {date.toISOString().slice(0, 10)} {"· latitude "}
        {lat.toFixed(1)}
        {"° · daylight "}
        {length.hours.toFixed(2)} {"h at a geometric horizon. Selected local solar time "}
        {hour.toFixed(1)} {"h; altitude "}
        {((Math.asin(selected[1] / 1.8) * 180) / Math.PI).toFixed(1)}
        {
          "°. The gnomon shadow follows the Sun and ends at the displayed ground edge. Refraction is excluded."
        }
      </ScienceReadout>
    </>
  );
}

/** Sky hemisphere tinted by the Sun's altitude: blue by day, glowing near a low Sun, dark at
 * night. Colours are illustrative; 30° and 60° altitude rings are for reading the Sun's height. */
function SkyDome({ sun }: { sun: [number, number, number] }) {
  const rings = useMemo(
    () =>
      [30, 60].map((alt) => {
        const a = (alt * Math.PI) / 180;
        return Array.from({ length: 97 }, (_, i): [number, number, number] => {
          const az = (i / 96) * Math.PI * 2;
          return [
            1.8 * Math.cos(a) * Math.cos(az),
            1.8 * Math.sin(a),
            1.8 * Math.cos(a) * Math.sin(az),
          ];
        });
      }),
    [],
  );
  const uniforms = useMemo(() => ({ sunDir: { value: new THREE.Vector3(0, 1, 0) } }), []);
  uniforms.sunDir.value.set(...sun).normalize();
  return (
    <group>
      <mesh raycast={() => null}>
        <sphereGeometry args={[1.8, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <shaderMaterial
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          vertexShader={`varying vec3 vDir; void main(){vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
          fragmentShader={`uniform vec3 sunDir; varying vec3 vDir;
  void main(){
    float alt=sunDir.y, up=max(vDir.y,0.), toward=max(dot(vDir,sunDir),0.);
    float day=smoothstep(-.12,.2,alt);
    vec3 zenith=mix(vec3(.04,.06,.16),vec3(.22,.48,.86),day);
    vec3 horizon=mix(vec3(.10,.10,.22),vec3(.70,.84,.96),day);
    vec3 c=mix(horizon,zenith,pow(up,.6));
    float low=exp(-pow(alt/.18,2.));
    c=mix(c,vec3(1.,.55,.25),low*pow(toward,6.)*(1.-up)*.9);
    c+=vec3(1.,.9,.7)*pow(toward,60.)*day*.6;
    gl_FragColor=vec4(c,.16+.1*(1.-up));
    #include <colorspace_fragment>
  }`}
        />
      </mesh>
      {rings.map((points, i) => (
        <Line key={i} points={points} color="#9fc6d6" transparent opacity={0.4} lineWidth={0.8} />
      ))}
      <Tag pos={rings[0][0]} text="30°" occlude={false} />
      <Tag pos={rings[1][0]} text="60°" occlude={false} />
    </group>
  );
}

/** A directional light placed along the computed Sun direction, so real shadows follow it. */
function SunLight({ position }: { position: [number, number, number] }) {
  const light = useMemo(() => new THREE.DirectionalLight("#fff3dc", 1.6), []);
  const up = position[1] / 1.8;
  light.position.set(position[0] * 3, position[1] * 3, position[2] * 3);
  light.intensity = up > 0 ? 0.6 + 1.4 * Math.min(1, up * 3) : 0;
  light.castShadow = up > 0;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.camera.left = light.shadow.camera.bottom = -2.2;
  light.shadow.camera.right = light.shadow.camera.top = 2.2;
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 14;
  light.shadow.bias = -0.0004;
  return <primitive object={light} />;
}

/** Meadow and fields on a soil slab, a ring of trees and a cottage near the edge. */
function SolarGround() {
  const geometry = useMemo(() => {
    const g = new THREE.RingGeometry(0, 1.8, 160, 64);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3),
      fields = ["#7f9b52", "#93a95c", "#b3a863", "#6f8a48", "#a2a35a"].map(
        (x) => new THREE.Color(x),
      ),
      col = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        cell = Math.floor((x + 0.2 * Math.sin(z * 2)) / 0.45) * 7 + Math.floor(z / 0.38) * 13,
        k = Math.abs(Math.sin(cell * 12.9898) * 43758.5453) % 1;
      col.copy(fields[Math.floor(k * fields.length)]);
      if (Math.hypot(x, z) < 0.42) col.set("#8fa173");
      c.set([col.r, col.g, col.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, []);
  const trees = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i): [number, number, number] => {
        const a = i * 2.399,
          r = 1.5 + 0.22 * ((i * 0.618) % 1);
        return [r * Math.cos(a), 0, r * Math.sin(a)];
      }).filter(([x, , z]) => !(x > 0.6 && z > 0.5 && z < 1.2)),
    [],
  );
  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <TerrainMaterial kind="grass" color="#d0d0d0" vertexColors />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.12, 96, 1, true]} />
        <TerrainMaterial kind="soil" color="#6f5a45" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.8, 96]} />
        <meshStandardMaterial color="#4f4033" roughness={1} />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.09} seed={14} />
      <group position={[1.05, 0, 0.85]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.045, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.16, 0.09, 0.11]} />
          <meshStandardMaterial color="#e6dccb" roughness={0.9} />
        </mesh>
        <mesh
          position={[0, 0.115, 0]}
          rotation={[0, 0, Math.PI / 4]}
          scale={[1, 1, 1.25]}
          castShadow
        >
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color="#9c4a35" roughness={0.8} />
        </mesh>
      </group>
    </group>
  );
}

/** A stone pedestal with an hour-marked dial plate and a vertical pin gnomon. */
function Sundial() {
  return (
    <group>
      <mesh position={[0, 0.006, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.012, 64]} />
        <meshStandardMaterial color="#c9c0aa" roughness={0.85} />
      </mesh>
      {Array.from({ length: 24 }, (_, h) => {
        const a = (h / 24) * Math.PI * 2;
        return (
          <mesh
            key={h}
            position={[0.17 * Math.cos(a), 0.0135, 0.17 * Math.sin(a)]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[h % 6 === 0 ? 0.05 : 0.03, 0.006]} />
            <meshBasicMaterial color="#5b4f3e" />
          </mesh>
        );
      })}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.22, 24]} />
        <meshStandardMaterial color="#b08d4a" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
