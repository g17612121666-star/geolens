import { usePreferences } from "@/lib/preferences";
import { useMemo, useEffect, useState } from "react";
import { Html } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { EarthMesh, CloudLayer } from "@/components/globe/earth";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { shellSection } from "../shared/science-geometry";
import { Tag } from "../shared/kit";
/** `color` marks the key, leader lines and profile; `fill` is the cut face, darkening with
 * height as the sky does when the air thins. */
const layers = [
  {
    name: "Troposphere",
    lo: 0,
    hi: 12,
    color: "#6cc4f2",
    fill: "#8cc8ec",
    note: "Tropopause drawn at 12 km; really about 8 km at the poles and 16–18 km in the tropics. Most weather happens here.",
  },
  {
    name: "Stratosphere",
    lo: 12,
    hi: 50,
    color: "#93a4f4",
    fill: "#4f70d4",
    note: "Ozone absorbs ultraviolet radiation; temperature generally rises with height.",
  },
  {
    name: "Mesosphere",
    lo: 50,
    hi: 85,
    color: "#c69cf0",
    fill: "#7350c4",
    note: "Temperature generally falls with height; many meteors become luminous here.",
  },
  {
    name: "Thermosphere",
    lo: 85,
    hi: 500,
    color: "#eda874",
    fill: "#3c3d96",
    note: "Shown only to 500 km; its top varies with solar activity and the air thins out beyond. Temperatures are very high, but the gas is so thin it would not feel hot.",
  },
];
/** Opening camera, and the globe's offset in the scene. */
const LAYER_CAMERA: [number, number, number] = [0.5, 1.1, 5.5];
const GLOBE_X = -0.25;
/** Direction of the opening camera around the globe's axis, as an angle from +x toward +z. */
const VIEW_AZIMUTH = Math.atan2(LAYER_CAMERA[2], LAYER_CAMERA[0] - GLOBE_X);
const CUT_VERTEX = `varying vec3 vLocal; void main(){vLocal=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Cut face: each layer has its own color, deeper where the air is denser, with a bright line
 * at its lower boundary (tropopause, stratopause, mesopause). The ozone layer, meteor trails and
 * polar aurora are drawn where they occur, and the thermosphere fades out with height because it
 * has no sharp top. Colors are illustrative. */
const CUT_FRAGMENT = `uniform float factor,lo,hi,light; uniform vec3 base; varying vec3 vLocal;
float ah(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float r=length(vLocal), km=(r-1.)*6371./factor, lat=asin(clamp(vLocal.y/r,-1.,1.));
  float depth=clamp((km-lo)/(hi-lo),0.,1.);
  vec3 c=base*mix(1.08,.82,depth);
  float a=mix(.62,.42,depth);
  float ozone=exp(-pow((km-25.)/6.,2.))*step(12.,km);
  c=mix(c,vec3(.98,.78,.5),ozone*.55); a+=ozone*.15;
  vec2 mg=vec2(lat*60.,km*.12),mc=floor(mg),mf=fract(mg);
  // Short streaks with a bright head, scattered through the upper mesosphere.
  float meteor=step(.94,ah(mc))*(1.-smoothstep(.04,.13,abs(mf.x-mf.y)))*mf.x*exp(-pow((km-80.)/8.,2.));
  c=mix(c,vec3(1.,.95,.75),meteor); a+=meteor*.6;
  float polar=smoothstep(1.05,1.2,abs(lat))*(1.-smoothstep(1.3,1.45,abs(lat)));
  // Auroral rays run along the magnetic field, close to vertical at high latitudes.
  float curtain=.55+.45*sin(lat*140.+km*.02);
  float green=exp(-pow((km-140.)/45.,2.)),red=exp(-pow((km-300.)/70.,2.));
  vec3 aur=vec3(.2,1.,.45)*green+vec3(1.,.25,.3)*red*.7;
  c=mix(c,aur,polar*curtain*(green+red*.7)*.85); a+=polar*curtain*(green+red*.5)*.5;
  if(hi>400.)a*=1.-.85*smoothstep(110.,500.,km);
  float edge=lo>0.?1.-smoothstep(0.,1.6*fwidth(km),abs(km-lo)):0.;
  c=mix(c,light>.5?vec3(.1,.13,.22):vec3(.93,.96,1.),edge*.85); a=max(a,edge*.9);
  gl_FragColor=vec4(c,clamp(a,0.,.9));
  #include <colorspace_fragment>
}`;
/** Outer surface of a layer: a faint limb glow, strongest where the line of sight grazes the
 * shell, so the globe inside stays clear. */
const SHELL_VERTEX = `varying vec3 vNormal; varying vec3 vWorld; void main(){vNormal=normalize(mat3(modelMatrix)*position); vec4 w=modelMatrix*vec4(position,1.); vWorld=w.xyz; gl_Position=projectionMatrix*viewMatrix*w;}`;
const SHELL_FRAGMENT = `uniform vec3 color; uniform float strength; varying vec3 vNormal; varying vec3 vWorld;
void main(){
  float facing=abs(dot(normalize(vNormal),normalize(cameraPosition-vWorld)));
  gl_FragColor=vec4(color,strength*(.05+.95*pow(1.-facing,2.5)));
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
    const g = shellSection(inner + 1e-5, outer, Math.PI, 96);
    g.groups[0].count /= 2;
    return g;
  }, [inner, outer]);
  useEffect(() => () => geo.dispose(), [geo]);
  const labels = useLabControls((s) => s.labels);
  // Leader starts mid-layer on the right half of the cut face.
  const mid = (inner + outer) / 2,
    theta = 0.4 + i * 0.65,
    phi = VIEW_AZIMUTH - Math.PI / 2,
    anchor: [number, number, number] = [
      mid * Math.sin(theta) * Math.cos(phi),
      mid * Math.cos(theta),
      mid * Math.sin(theta) * Math.sin(phi),
    ];
  // A steeper lapse rate makes a colder upper troposphere, shown as a deeper blue.
  const fill = (
    i === 0
      ? new THREE.Color("#a9dcf2").lerp(new THREE.Color("#5f93cf"), (lapse - 4) / 6)
      : new THREE.Color(l.fill)
  ).getHex();
  const shellUniforms = useMemo(
    () => ({
      color: { value: new THREE.Color(l.color).multiplyScalar(light ? 0.55 : 1) },
      strength: { value: i === 3 ? 0.22 : 0.4 },
    }),
    [l.color, light, i],
  );
  const cutUniforms = useMemo(
    () => ({
      factor: { value: factor },
      lo: { value: l.lo },
      hi: { value: l.hi },
      base: { value: new THREE.Color(fill).multiplyScalar(light ? 0.8 : 1) },
      light: { value: light ? 1 : 0 },
    }),
    [factor, l.lo, l.hi, fill, light],
  );
  return (
    <group position={[0, i * explode * 0.3, 0]}>
      {/* The near half is cut away: the cut faces the opening camera, so the layers read as
          bands of true relative thickness around the globe. */}
      <mesh geometry={geo} rotation={[0, -VIEW_AZIMUTH, 0]}>
        <shaderMaterial
          attach="material-0"
          uniforms={shellUniforms}
          vertexShader={SHELL_VERTEX}
          fragmentShader={SHELL_FRAGMENT}
          side={THREE.FrontSide}
          transparent
          depthWrite={false}
        />
        <shaderMaterial
          attach="material-1"
          uniforms={cutUniforms}
          vertexShader={CUT_VERTEX}
          fragmentShader={CUT_FRAGMENT}
          side={THREE.DoubleSide}
          transparent
          depthWrite={false}
        />
      </mesh>
      {labels && (
        <Line
          points={[anchor, [1.7, (1.5 - i) * 0.62, 0]]}
          color={light ? new THREE.Color(l.color).multiplyScalar(0.55) : l.color}
          lineWidth={1.8}
        />
      )}
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
  const { trueScale, explode, params } = useLabState("trueScale", "explode", "params"),
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
            : "Altitude ×8 · gas layers, not solid shells · press T for true thickness"
        }
        trueScale={
          profile
            ? "Reference temperature profile · axes use different labeled units"
            : "Earth and altitude share a scale · layer boundaries are approximate"
        }
        camera={profile ? [0, 0, 5] : LAYER_CAMERA}
      >
        {!profile && (
          <group position={[GLOBE_X, 0, 0]}>
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
            {[12, 50, 85].map((h, i) => (
              <Line
                key={h}
                points={[
                  [-1.15, h / 60, 0],
                  [0.9, h / 60, 0],
                ]}
                color={layers[i].color}
                dashed
                dashSize={0.05}
                gapSize={0.04}
                lineWidth={1}
              />
            ))}
            {layers.map((layer) => (
              <Html
                key={layer.name}
                position={[1.05, (layer.lo + Math.min(layer.hi, 120)) / 120, 0]}
              >
                <span
                  className="whitespace-nowrap font-mono text-xs"
                  style={{ color: layer.color, display: "block", transform: "translateY(-50%)" }}
                >
                  {layer.name}
                </span>
              </Html>
            ))}
            {[0, 12, 50, 85, 120].map((h) => (
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
              note="The troposphere part follows your lapse rate. Above it the curve is a typical average profile, not a measured sounding. Dashed lines mark the model's layer boundaries at 12, 50 and 85 km, where the temperature trend reverses."
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
        </div>{" "}
        <br />
        {!profile && (
          <div className="mb-3 grid grid-cols-2 gap-3">
            {layers.map((layer, index) => (
              <p key={layer.name}>
                <strong>
                  {index + 1}. {layer.name}
                </strong>{" "}
                <br />
                {layer.lo}–{layer.hi} km{index === 3 ? " shown" : ""}
              </p>
            ))}
          </div>
        )}
        <p>
          The profile starts at 15 °C at the surface. Separating the layers helps you identify them,
          but real air has no gaps between layers.
        </p>
      </ScienceReadout>
    </>
  );
}

const AURORA_VERTEX = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
/** Curtain of rays: a sharp lower edge near 100 km, green below and red above, fading upward.
 * Ray brightness varies smoothly along the oval. */
const AURORA_FRAGMENT = `uniform float light; varying vec2 vUv;
float h(float x){return fract(sin(x*127.1)*43758.5453);}
void main(){
  float u=vUv.x*110.,i=floor(u),f=fract(u);
  float ray=mix(h(i),h(i+1.),smoothstep(0.,1.,f));
  ray=.3+.7*ray*ray;
  float v=vUv.y;
  float body=smoothstep(0.,.07,v)*(1.-smoothstep(.4,1.,v));
  vec3 c=mix(vec3(.42,1.,.36),vec3(1.,.32,.42),smoothstep(.3,.85,v));
  float a=body*ray;
  gl_FragColor=light>.5?vec4(c*.62,a*.85):vec4(c,a*.95);
  #include <colorspace_fragment>
}`;

/** Northern auroral oval: a curtain about 23° from the pole, green near 100–200 km, red above. */
function AuroraOval({ factor }: { factor: number }) {
  const light = usePreferences((s) => s.resolvedTheme === "light");
  const lo = 1 + (100 / 6371) * factor,
    hi = 1 + (300 / 6371) * factor,
    colat = (23 * Math.PI) / 180;
  const geometry = useMemo(() => {
    const n = 160,
      pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2,
        wob = 0.03 * Math.sin(a * 5) + 0.02 * Math.sin(a * 11),
        c = colat + wob;
      for (const [k, r] of [lo, hi].entries()) {
        pos.push(r * Math.sin(c) * Math.cos(a), r * Math.cos(c), r * Math.sin(c) * Math.sin(a));
        uv.push(i / n, k);
      }
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }, [lo, hi, colat]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({ light: { value: light ? 1 : 0 } }), [light]);
  return (
    <group>
      <mesh geometry={geometry}>
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={AURORA_VERTEX}
          fragmentShader={AURORA_FRAGMENT}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
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
    // Lower left, in front of the cut, clear of the layer key on the right.
    direction = new THREE.Vector3(-0.78, -0.42, 0.62).normalize();
  return (
    <group position={direction.multiplyScalar(r).toArray()}>
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
