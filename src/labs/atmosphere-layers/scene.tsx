import { usePreferences } from "@/lib/preferences";
import { useMemo, useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { EarthMesh, CloudLayer } from "@/components/globe/earth";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { shellSection } from "../shared/science-geometry";
import { Tag } from "../shared/kit";
const layers = [
  {
    name: "Troposphere",
    lo: 0,
    hi: 12,
    color: "#8fc5e0",
    note: "Reference tropopause 12 km; typically about 8 km at the poles to 16–18 km in the tropics. Most weather occurs here.",
  },
  {
    name: "Stratosphere",
    lo: 12,
    hi: 50,
    color: "#9bafdc",
    note: "Ozone absorbs ultraviolet radiation; temperature generally rises with height.",
  },
  {
    name: "Mesosphere",
    lo: 50,
    hi: 85,
    color: "#bfadd6",
    note: "Temperature generally falls with height; many meteors become luminous here.",
  },
  {
    name: "Thermosphere",
    lo: 85,
    hi: 500,
    color: "#d5b395",
    note: "Shown only to 500 km. Its upper boundary varies with solar activity; the atmosphere continues beyond this view. Very high kinetic temperature does not mean dense hot air.",
  },
];
function GasLayer({
  i,
  factor,
  explode,
  lapse,
}: {
  i: number;
  factor: number;
  explode: number;
  lapse: number;
}) {
  const light = usePreferences((s) => s.resolvedTheme === "light");
  const l = layers[i],
    inner = 1 + (l.lo / 6371) * factor,
    outer = 1 + (l.hi / 6371) * factor;
  const geo = useMemo(() => {
    const g = shellSection(inner + 1e-5, outer, Math.PI * 0.62, 96);
    g.groups[0].count /= 2;
    return g;
  }, [inner, outer]);
  useEffect(() => () => geo.dispose(), [geo]);
  const color =
    i === 0
      ? new THREE.Color("#b1d8e6").lerp(new THREE.Color("#658ebd"), (lapse - 4) / 6)
      : l.color;
  return (
    <group position={[0, i * explode * 0.3, 0]}>
      <mesh geometry={geo}>
        <meshBasicMaterial
          attach="material-0"
          color={light ? new THREE.Color(color).multiplyScalar(0.6) : color}
          side={THREE.FrontSide}
          transparent
          opacity={i === 3 ? 0.14 : 0.23}
          depthWrite={false}
        />
        <meshBasicMaterial
          attach="material-1"
          color={light ? new THREE.Color(color).multiplyScalar(0.6) : color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.42}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={[
          [outer * Math.sin(0.4 + i * 0.65), outer * Math.cos(0.4 + i * 0.65), 0],
          [1.7, (1.5 - i) * 0.62, 0],
        ]}
        color={light ? new THREE.Color(l.color).multiplyScalar(0.55) : l.color}
        lineWidth={1.8}
      />
      <Tag
        pos={[1.7, (1.5 - i) * 0.62, 0]}
        text={`${i + 1}`}
        title={`${i + 1} · ${l.name}`}
        note={`${l.lo}–${l.hi} km${i === 3 ? " shown" : ""}. ${l.note}`}
        occlude={false}
      />
    </group>
  );
}
export default function AtmosphereLayers() {
  const [profile, setProfile] = useState(false);
  const { trueScale, explode, params } = useLabControls(),
    lapse = params.lapse ?? 6.5,
    factor = trueScale ? 1 : 8;
  const temperatures = [
    [0, 15],
    [12, 15 - 12 * lapse],
    [20, 15 - 12 * lapse],
    [50, -2],
    [85, -86],
    [120, 80],
  ];
  return (
    <>
      <ScienceStudio
        key={profile ? "profile" : "globe"}
        slug="atmosphere-layers"
        scale={
          profile
            ? "Reference temperature profile · horizontal: °C · vertical: km"
            : "Altitude ×8 · gas layers, not solid shells · T restores the thin film"
        }
        trueScale={
          profile
            ? "Reference temperature profile · axes use different labelled units"
            : "Earth and altitude share a scale · layer boundaries are approximate"
        }
        camera={profile ? [0, 0, 5] : [0.5, 1.1, 5.5]}
      >
        {!profile && (
          <group position={[-0.25, 0, 0]}>
            <CloudLayer radius={1 + (3 / 6371) * factor} />
            <mesh>
              <sphereGeometry args={[1 + (10 / 6371) * factor, 128, 96]} />
              <shaderMaterial
                transparent
                depthWrite={false}
                side={THREE.BackSide}
                vertexShader={`varying vec3 normalWorld; varying vec3 world; void main(){normalWorld=normalize(mat3(modelMatrix)*normal);world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}`}
                fragmentShader={`varying vec3 normalWorld;varying vec3 world;void main(){float rim=pow(1.-abs(dot(normalize(normalWorld),normalize(cameraPosition-world))),2.3);gl_FragColor=vec4(.30,.62,.88,rim*.4);}`}
              />
            </mesh>
            <group rotation={[0, Math.PI, 0]}>
              <EarthMesh sunDirection={new THREE.Vector3(4, 2, 3)} />
            </group>
            {layers.map((_, i) => (
              <GasLayer key={i} i={i} factor={factor} explode={explode} lapse={lapse} />
            ))}
          </group>
        )}
        {profile && (
          <group position={[0, -1, 0]}>
            <Line
              points={temperatures.map(([h, temp]) => [temp / 100, h / 60, 0])}
              color="#efb474"
              lineWidth={3}
            />
            <Line
              points={[
                [-1.15, 0, 0],
                [-1.15, 2, 0],
              ]}
              color="#617677"
            />
            <Line
              points={[
                [-1.15, 0, 0],
                [0.9, 0, 0],
              ]}
              color="#617677"
            />
            {[0, 50, 100].map((h) => (
              <Html key={h} position={[-1.4, h / 60, 0]} center>
                <span className="whitespace-nowrap font-mono text-xs text-mist">
                  {h} {"km"}
                </span>
              </Html>
            ))}
            {[-100, 0, 75].map((temp) => (
              <Html key={temp} position={[temp / 100, -0.18, 0]} center>
                <span className="whitespace-nowrap font-mono text-xs text-mist">
                  {temp}
                  {"°C"}
                </span>
              </Html>
            ))}
            <Tag
              pos={[0, 2.2, 0]}
              text="Temperature profile"
              note="Reference trend: the tropospheric section follows the chosen lapse rate. The rest is an illustrative atmospheric profile, not a radiosonde observation."
              occlude={false}
            />
          </group>
        )}
      </ScienceStudio>
      <ScienceReadout>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label="Atmosphere view" className="flex gap-2">
            <button
              className="min-h-11 rounded-lg border border-white/15 px-3"
              aria-pressed={!profile}
              onClick={() => setProfile(false)}
            >
              Layer globe
            </button>
            <button
              className="min-h-11 rounded-lg border border-white/15 px-3"
              aria-pressed={profile}
              onClick={() => setProfile(true)}
            >
              Temperature profile
            </button>
          </div>
          <p>
            At 12 km: <strong>{(15 - 12 * lapse).toFixed(1)} °C</strong> with a lapse rate of{" "}
            {lapse.toFixed(1)} °C/km.
          </p>
        </div>
        <br />
        {!profile && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            {layers.map((layer, index) => (
              <p key={layer.name}>
                <strong>
                  {index + 1}. {layer.name}
                </strong>
                <br />
                {layer.lo}–{layer.hi} km{index === 3 ? " shown" : ""}
              </p>
            ))}
          </div>
        )}
        <p>
          The selected profile starts at 15 °C at the surface. Separating the layers helps identify
          them; real atmospheric gases remain continuous.
        </p>
      </ScienceReadout>
    </>
  );
}
