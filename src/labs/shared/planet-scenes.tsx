import { useMemo } from "react";
import { Line as PlainLine } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { StarMesh } from "@/components/globe/star";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "./science-kit";
import { Tag } from "./kit";
import { solarEphemeris, daylight } from "@/lib/solar";
import { TerrainMaterial, PlantStand } from "./natural-world";
import { skyPosition } from "../solar-altitude/sky";

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
    azimuth = Math.atan2(selected[2], selected[0]),
    altitude = (Math.asin(selected[1] / 1.8) * 180) / Math.PI,
    noonAltitude = 90 - Math.abs(lat - (declination * 180) / Math.PI),
    minutes = Math.round(hour * 60) % 1440,
    clock = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return (
    <>
      <ScienceStudio
        slug="solar-altitude"
        horizon
        scale="Local sky sphere · horizon and solar path use true angles"
        trueScale="Sky directions are angular · the Sun is drawn larger than its angular diameter"
        // Look from the poleward side, so the noon Sun is beyond the dial in both hemispheres.
        key={lat < 0 ? "south" : "north"}
        camera={[4, 2.8, lat < 0 ? -5 : 5]}
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
          // A plain line: GuideLine lightens dark colours in dark mode, which would make the shadow pale.
          <PlainLine
            points={[
              [0, 0.014, 0],
              [-Math.cos(azimuth) * shadowLength, 0.014, -Math.sin(azimuth) * shadowLength],
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
          pos={[noon[0], noon[1] + (noonAltitude < 12 ? 0.55 : 0.3), noon[2]]}
          text={`Noon ${noonAltitude.toFixed(1)}°`}
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {date.toISOString().slice(0, 10)} {"· latitude "}
        {lat.toFixed(1)}
        {"° · daylight "}
        {length.hours.toFixed(2)} {"h at a geometric horizon. Selected local solar time "}
        {clock}
        {"; altitude "}
        {altitude.toFixed(1)}
        {altitude > 0
          ? "°. The pin's shadow points away from the Sun and is cut off at the edge of the ground. Refraction is ignored."
          : "°. The Sun is below the horizon, so there is no shadow. Refraction is ignored."}
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

/** A stone pedestal with a plain dial plate and a vertical pin gnomon. A flat dial with a
 * vertical pin needs unevenly spaced hour lines, so none are drawn. */
function Sundial() {
  return (
    <group>
      <mesh position={[0, 0.006, 0]} receiveShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.012, 64]} />
        <meshStandardMaterial color="#c9c0aa" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.018, 0.22, 24]} />
        <meshStandardMaterial color="#b08d4a" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
