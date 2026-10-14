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
    color: "#5fb2e6",
    note: "Reference tropopause 12 km; typically about 8 km at the poles to 16–18 km in the tropics. Most weather occurs here.",
  },
  {
    name: "Stratosphere",
    lo: 12,
    hi: 50,
    color: "#7d8ee0",
    note: "Ozone absorbs ultraviolet radiation; temperature generally rises with height.",
  },
  {
    name: "Mesosphere",
    lo: 50,
    hi: 85,
    color: "#b088d8",
    note: "Temperature generally falls with height; many meteors become luminous here.",
  },
  {
    name: "Thermosphere",
    lo: 85,
    hi: 500,
    color: "#e3a06c",
    note: "Shown only to 500 km. Its upper boundary varies with solar activity; the atmosphere continues beyond this view. Very high kinetic temperature does not mean dense hot air.",
  },
];
const CUT_VERTEX = `varying vec3 vLocal; void main(){vLocal=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Cut face: density falls off with height (about 8 km scale height), with the ozone layer,
 * meteor trails and polar aurora drawn where they occur. Colours are illustrative. */
const CUT_FRAGMENT = `uniform float factor; uniform vec3 base; uniform float light; varying vec3 vLocal;
float ah(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float r=length(vLocal), km=(r-1.)*6371./factor, lat=asin(clamp(vLocal.y/r,-1.,1.));
  float density=exp(-km/8.5);
  vec3 c=base;
  float a=.16+.5*density;
  float ozone=exp(-pow((km-25.)/7.,2.));
  c=mix(c,vec3(1.,.62,.32),ozone*.65); a+=ozone*.25;
  float meteor=step(.985,ah(floor(vec2(atan(vLocal.x,vLocal.z)*220.,km*.6))))*exp(-pow((km-90.)/9.,2.));
  c=mix(c,vec3(1.,.95,.75),meteor); a+=meteor*.6;
  float polar=smoothstep(1.05,1.2,abs(lat))*(1.-smoothstep(1.3,1.45,abs(lat)));
  float curtain=.6+.4*sin(atan(vLocal.x,vLocal.z)*90.+km*.05);
  float green=exp(-pow((km-140.)/45.,2.)),red=exp(-pow((km-300.)/70.,2.));
  vec3 aur=vec3(.2,1.,.45)*green+vec3(1.,.25,.3)*red*.7;
  c=mix(c,aur,polar*curtain*(green+red*.7)*.85); a+=polar*curtain*(green+red*.5)*.5;
  gl_FragColor=vec4(c,clamp(a,0.,.85));
  #include <colorspace_fragment>
}`;

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
        <shaderMaterial
          attach="material-1"
          uniforms={useMemo(
            () => ({
              factor: { value: factor },
              base: { value: new THREE.Color(color).multiplyScalar(light ? 0.75 : 1) },
              light: { value: light ? 1 : 0 },
            }),
            [factor, color, light],
          )}
          vertexShader={CUT_VERTEX}
          fragmentShader={CUT_FRAGMENT}
          side={THREE.DoubleSide}
          transparent
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
              <EarthMesh lighting="viewer" />
            </group>
            {layers.map((_, i) => (
              <GasLayer key={i} i={i} factor={factor} explode={explode} lapse={lapse} />
            ))}
            {explode < 0.01 && <AuroraOval factor={factor} />}
            {explode < 0.01 && <Satellite factor={factor} />}
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

/** Northern auroral oval: a curtain about 23° from the pole, green near 110–200 km, red above. */
function AuroraOval({ factor }: { factor: number }) {
  const lo = 1 + (100 / 6371) * factor,
    hi = 1 + (300 / 6371) * factor,
    colat = (23 * Math.PI) / 180;
  const geometry = useMemo(() => {
    const n = 160,
      pos: number[] = [],
      col: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        wob = 0.03 * Math.sin(a * 5) + 0.02 * Math.sin(a * 11),
        c = colat + wob;
      for (const [k, r] of [lo, hi].entries()) {
        pos.push(r * Math.sin(c) * Math.cos(a), r * Math.cos(c), r * Math.sin(c) * Math.sin(a));
        if (k === 0) col.push(0.25, 1, 0.5);
        else col.push(0.9, 0.25, 0.35);
      }
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    return g;
  }, [lo, hi, colat]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group>
      <mesh geometry={geometry}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.7}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Tag
        pos={[-0.45, hi + 0.12, 0.2]}
        text="Aurora"
        note="Charged particles from the Sun, guided by Earth's magnetic field, make oxygen glow green (about 100–200 km) and red (higher) in an oval around each magnetic pole. Brightness is illustrative."
        occlude={false}
      />
    </group>
  );
}

/** The International Space Station orbits about 410 km up, inside the thermosphere. */
function Satellite({ factor }: { factor: number }) {
  const r = 1 + (410 / 6371) * factor,
    a = 0.55;
  return (
    <group position={[r * Math.sin(a + 0.5), r * Math.cos(a + 0.5) * 0.2, r * 0.9]}>
      <mesh>
        <boxGeometry args={[0.05, 0.018, 0.018]} />
        <meshStandardMaterial color="#d9d9d4" metalness={0.6} roughness={0.35} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, s * 0.045]}>
          <boxGeometry args={[0.07, 0.003, 0.05]} />
          <meshStandardMaterial color="#3a4f7a" metalness={0.5} roughness={0.3} />
        </mesh>
      ))}
      <Tag
        pos={[0, 0.12, 0]}
        text="ISS · ~410 km"
        note="The International Space Station orbits in the thermosphere, where the air is so thin it barely slows the station. Model size hugely enlarged."
        occlude={false}
      />
    </group>
  );
}
