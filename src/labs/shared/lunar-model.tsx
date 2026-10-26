import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useTexture } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { EarthMesh, Atmosphere } from "@/components/globe/earth";
import { StarMesh } from "@/components/globe/star";
import {
  LUNAR,
  lunarPosition,
  illuminatedFraction,
  lunarEclipse,
  shadowRadii,
  equilibriumTide,
  solarEclipse,
} from "@/lib/lunar-science";
import { useLabTick } from "@/labs/tick";
import { Tag } from "./kit";
import { ScienceStudio, ScienceReadout, Arrow } from "./science-kit";

export function LunarSurface({
  position = [0, 0, 0],
  radius,
  angle = 0,
  dim = false,
  shadow,
  photometry = false,
}: {
  position?: [number, number, number];
  radius: number;
  angle?: number;
  dim?: boolean;
  /**
   * Lunar photometry (Lommel–Seeliger): the real Moon stays bright right up to the terminator
   * instead of darkening like a matte ball, so thin crescents look as wide as they really are.
   */
  photometry?: boolean;
  /** Earth's shadow along the x axis (Sun toward +x): umbra and penumbra radii at x0 and x1. */
  shadow?: { x0: number; x1: number; u0: number; u1: number; p0: number; p1: number };
}) {
  const [map, height] = useTexture([
    "/textures/planets/moon-lroc-4k.jpg",
    "/textures/planets/moon-lola-height.png",
  ]);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;
  height.colorSpace = THREE.NoColorSpace;
  height.anisotropy = 16;
  const shadowUniforms = useMemo(
    () => ({
      uShadow: { value: new THREE.Vector3() },
      uU: { value: new THREE.Vector2() },
      uP: { value: new THREE.Vector2() },
    }),
    [],
  );
  if (shadow) {
    shadowUniforms.uShadow.value.set(shadow.x0, shadow.x1, 0);
    shadowUniforms.uU.value.set(shadow.u0, shadow.u1);
    shadowUniforms.uP.value.set(shadow.p0, shadow.p1);
  }
  const hasShadow = Boolean(shadow);
  const eclipse = useMemo(
    () =>
      hasShadow
        ? (sh: THREE.WebGLProgramParametersWithUniforms) => {
            Object.assign(sh.uniforms, shadowUniforms);
            sh.vertexShader =
              "varying vec3 moonWorld;\n" +
              sh.vertexShader.replace(
                "#include <begin_vertex>",
                "#include <begin_vertex>\nmoonWorld=(modelMatrix*vec4(transformed,1.)).xyz;",
              );
            sh.fragmentShader =
              "varying vec3 moonWorld; uniform vec3 uShadow; uniform vec2 uU,uP;\n" +
              sh.fragmentShader
                .replace(
                  "#include <lights_fragment_end>",
                  `#include <lights_fragment_end>
  float k=clamp((moonWorld.x-uShadow.x)/(uShadow.y-uShadow.x),0.,1.);
  float umbra=mix(uU.x,uU.y,k),pen=mix(uP.x,uP.y,k),r=length(moonWorld.yz);
  float visible=sqrt(smoothstep(umbra,pen,r));
  reflectedLight.directDiffuse*=visible;
  reflectedLight.directSpecular*=visible;`,
                )
                .replace(
                  "#include <emissivemap_fragment>",
                  `#include <emissivemap_fragment>
  {float k2=clamp((moonWorld.x-uShadow.x)/(uShadow.y-uShadow.x),0.,1.);
   float inUmbra=1.-smoothstep(mix(uU.x,uU.y,k2)*.85,mix(uU.x,uU.y,k2),length(moonWorld.yz));
   totalEmissiveRadiance+=vec3(.42,.12,.04)*inUmbra*diffuseColor.rgb*1.6;}`,
                );
          }
        : photometry
          ? (sh: THREE.WebGLProgramParametersWithUniforms) => {
              sh.fragmentShader = sh.fragmentShader.replace(
                "#include <lights_fragment_end>",
                `#include <lights_fragment_end>
  #if NUM_DIR_LIGHTS > 0
  {
    float mu0 = max(dot(normal, directionalLights[0].direction), 0.0);
    float mu = max(dot(normal, normalize(vViewPosition)), 1e-3);
    reflectedLight.directDiffuse *= 2.0 / (mu0 + mu + 1e-3);
  }
  #endif`,
              );
            }
          : undefined,
    [hasShadow, shadowUniforms, photometry],
  );
  // NASA LOLA height encodes -12..+12 km about the 1737.4 km reference sphere.
  // LROC albedo never substitutes for height; relief has no vertical exaggeration.
  return (
    <mesh position={position} rotation={[0, angle + Math.PI, 0]}>
      <sphereGeometry args={[radius, radius > 0.2 ? 192 : 80, radius > 0.2 ? 128 : 56]} />
      <meshStandardMaterial
        map={map}
        displacementMap={height}
        displacementScale={(radius * 24) / 1737.4}
        displacementBias={(-radius * 12) / 1737.4}
        bumpMap={height}
        bumpScale={(radius * 24) / 1737.4}
        color={dim && !shadow ? "#945b41" : "#ffffff"}
        roughness={0.96}
        onBeforeCompile={eclipse}
        customProgramCacheKey={() =>
          shadow ? "moon-eclipse" : photometry ? "moon-photometry" : "moon"
        }
      />
    </mesh>
  );
}
function TidalEnvelope({ radius, moon }: { radius: number; moon: [number, number, number] }) {
  const geometry = useMemo(() => new THREE.SphereGeometry(radius * 1.13, 64, 48), [radius]);
  const rest = useMemo(() => Float32Array.from(geometry.attributes.position.array), [geometry]);
  const [moonX, moonY, moonZ] = moon;
  useLayoutEffect(() => {
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const n: [number, number, number] = [rest[3 * i], rest[3 * i + 1], rest[3 * i + 2]],
        k = 1 + 0.065 * equilibriumTide(n, moon);
      p.setXYZ(i, n[0] * k, n[1] * k, n[2] * k);
    }
    p.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- moon is a fresh array from the caller each render; keyed on its listed coordinates
  }, [geometry, rest, moonX, moonY, moonZ]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color="#70c5e2"
        transparent
        opacity={0.23}
        roughness={0.18}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
/** Cropped Earth shadow at the Moon: every visible dimension uses the same km scale. */
function LunarShadow({ p, phase }: { p: [number, number, number]; phase: number }) {
  const scale = 1 / 6000,
    x = -Math.hypot(...p),
    span = 9000;
  const lunar: [number, number, number] = [(p[0] - x) * scale, p[1] * scale, p[2] * scale];
  const radii0 = shadowRadii(LUNAR.earth, LUNAR.au, -x - span),
    radii1 = shadowRadii(LUNAR.earth, LUNAR.au, -x + span);
  return (
    <>
      <directionalLight position={[10, 0, 0]} intensity={3} />
      <ambientLight intensity={0.02} />
      {(["penumbra", "umbra"] as const).map((kind) => (
        <mesh key={kind} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry
            args={[
              Math.max(0, radii1[kind]) * scale,
              Math.max(0, radii0[kind]) * scale,
              2 * span * scale,
              96,
              1,
              true,
            ]}
          />
          <meshBasicMaterial
            color={kind === "umbra" ? "#2a1a1c" : "#6f8796"}
            side={THREE.DoubleSide}
            transparent
            opacity={kind === "umbra" ? 0.38 : 0.1}
            depthWrite={false}
          />
        </mesh>
      ))}
      <Line
        points={[
          [-span * scale, 0, 0],
          [span * scale, 0, 0],
        ]}
        color="#81939a"
        dashed
        dashSize={0.08}
        gapSize={0.04}
      />
      <LunarSurface
        position={lunar}
        radius={LUNAR.moon * scale}
        angle={phase * 2 * Math.PI}
        dim={lunarEclipse(p) === "Total lunar eclipse"}
        shadow={{
          x0: -span * scale,
          x1: span * scale,
          u0: Math.max(0, radii1.umbra) * scale,
          u1: Math.max(0, radii0.umbra) * scale,
          p0: radii1.penumbra * scale,
          p1: radii0.penumbra * scale,
        }}
      />
      <Tag
        pos={[-1.15, shadowRadii(LUNAR.earth, LUNAR.au, -x).umbra * scale + 0.2, 0]}
        text="Umbra"
        note="Inside this cone Earth blocks the whole Sun. The cone ignores Earth's atmosphere, which bends some red light into it."
        occlude={false}
      />
      <Tag
        pos={[-1.4, -shadowRadii(LUNAR.earth, LUNAR.au, -x).penumbra * scale - 0.2, 0]}
        text="Penumbra"
        note="Earth blocks only part of the solar disc in the outer shadow."
        occlude={false}
      />
      <Tag
        pos={[lunar[0], lunar[1] + LUNAR.moon * scale + 0.25, lunar[2]]}
        text="Moon"
        occlude={false}
      />
      <Arrow from={[1.5, -1.25, 0]} to={[-1.5, -1.25, 0]} color="#e9c996" width={0.6} />
      <Tag
        pos={[1.5, -1.05, 0]}
        text="Sunlight"
        note="Sunlight arrives from this side; the shadow points directly away from the Sun."
        occlude={false}
      />
    </>
  );
}
function SolarShadow({ p }: { p: [number, number, number] }) {
  const eclipse = solarEclipse(p);
  const scale = 1 / 6000,
    moon = new THREE.Vector3(...p).multiplyScalar(scale),
    sun = new THREE.Vector3(LUNAR.au * scale, 0, 0),
    direction = moon.clone().sub(sun).normalize();
  const distance = -moon.dot(direction),
    center = moon.clone().addScaledVector(direction, distance),
    q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const sunDistance = sun.distanceTo(moon) / scale,
    near = shadowRadii(LUNAR.moon, sunDistance, (distance - 1.6) / scale),
    far = shadowRadii(LUNAR.moon, sunDistance, (distance + 1.6) / scale);
  return (
    <>
      <EarthMesh
        radius={LUNAR.earth * scale}
        sunDirection={new THREE.Vector3(1, 0, 0)}
        occluder={{
          position: moon,
          radius: LUNAR.moon * scale,
          sunPosition: sun,
          sunRadius: LUNAR.sun * scale,
        }}
      />
      <mesh position={center} quaternion={q}>
        <cylinderGeometry args={[far.penumbra * scale, near.penumbra * scale, 3.2, 96, 1, true]} />
        <meshBasicMaterial
          color="#0b1116"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Line
        points={[
          center.clone().addScaledVector(direction, -1.6),
          center.clone().addScaledVector(direction, 1.6),
        ]}
        color="#e0bf8a"
        dashed
        dashSize={0.07}
        gapSize={0.04}
      />
      {(eclipse.kind === "total" || eclipse.kind === "annular") && (
        <Tag
          pos={center
            .clone()
            .addScaledVector(
              direction,
              -Math.sqrt(Math.max(0, (LUNAR.earth * scale) ** 2 - center.lengthSq())),
            )
            .toArray()}
          text={eclipse.kind === "total" ? "Totality here" : "Annular eclipse here"}
          note={
            eclipse.kind === "total"
              ? "Inside this narrow spot the Moon covers the whole Sun."
              : "The Moon is too far away to cover the whole Sun, so a ring of sunlight stays visible."
          }
          occlude={false}
        />
      )}
      <Tag
        pos={[0, 1.4, 0]}
        text="Earth · solar obscuration"
        note="Darkness on the surface is calculated from how much of the Sun's disc the Moon covers. The dark cone is the Moon's penumbra. Sizes and distances share one scale; the Moon itself is off-screen."
        occlude={false}
      />
    </>
  );
}
/** Where the tilted lunar orbit crosses the ecliptic: eclipses need a new or full Moon near here. */
function NodeGuides({ node, aligned }: { node: number; aligned: boolean }) {
  const a = (node * Math.PI) / 180,
    ends = [1, -1].map((k) => [2.2 * k * Math.cos(a), 0, -2.2 * k * Math.sin(a)]) as [
      number,
      number,
      number,
    ][],
    low = lunarPosition((node + 270) / 360, node, aligned).map(
      (v) => (v * 2.2) / LUNAR.distance,
    ) as [number, number, number];
  return (
    <>
      <Line points={ends} color="#d7a86e" dashed dashSize={0.08} gapSize={0.06} lineWidth={1.2} />
      {ends.map((e, i) => (
        <mesh key={i} position={e}>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshBasicMaterial color="#d7a86e" />
        </mesh>
      ))}
      <Tag
        pos={[ends[0][0], 0.25, ends[0][2]]}
        text="Node"
        note="The line of nodes is where the Moon's orbit crosses the ecliptic plane. An eclipse needs a new or full Moon close to this line. Node direction turns it."
        occlude={false}
      />
      <Tag
        pos={[low[0], low[1] - 0.3, low[2]]}
        text={aligned ? "Moon's orbit (tilt removed)" : "Moon's orbit · tilted 5°"}
        occlude={false}
      />
      <Tag
        pos={[-2.2 * Math.cos(0.35), 0.2, -2.2 * Math.sin(0.35)]}
        text="Ecliptic plane"
        note="The dashed circle lies in the plane of Earth's orbit around the Sun."
        occlude={false}
      />
    </>
  );
}
function solarEclipseText(p: [number, number, number]) {
  const e = solarEclipse(p),
    km = Math.round(e.width / 10) * 10;
  return e.kind === "total"
    ? `Total solar eclipse: the umbra is about ${km} km wide where it meets Earth`
    : e.kind === "annular"
      ? `Annular solar eclipse: the Moon is too far to cover the Sun; the antumbra is about ${km} km wide`
      : e.kind === "partial"
        ? "Partial solar eclipse: only the penumbra touches Earth"
        : "The Moon's shadow misses Earth";
}
export function LunarModel({ slug }: { slug: "moon-phases" | "eclipses" | "tides" }) {
  const [near, setNear] = useState(false);
  const { t, params, trueScale } = useLabControls();
  useLabTick(1 / 32);
  const node = params.node ?? 60,
    aligned = params.align > 0.5,
    distance = params.distance ?? LUNAR.distance,
    p = lunarPosition(t, node, aligned, distance),
    fraction = illuminatedFraction(p);
  const orbit = useMemo(
    () =>
      Array.from(
        { length: 193 },
        (_, i) =>
          lunarPosition(i / 192, node, aligned, distance).map((v) => (v * 2.2) / distance) as [
            number,
            number,
            number,
          ],
      ),
    [node, aligned, distance],
  );
  const position = p.map((v) => (v * 2.2) / distance) as [number, number, number];
  const physical = trueScale || slug === "eclipses",
    radius = physical ? (2.2 * LUNAR.earth) / distance : 0.43;
  const focus = slug === "eclipses" && params.shadow > 0.5;
  // A narrow time window resolves the several-hour transit without distorting distances.
  const solar = params.eclipse > 0.5,
    shadowPhase = (solar ? 0 : 0.5) + (t - 0.5) * 0.012,
    shadowPoint = lunarPosition(shadowPhase, node, aligned, distance);
  const phaseName =
    fraction < 0.01
      ? "New Moon"
      : fraction > 0.99
        ? "Full Moon"
        : Math.abs(fraction - 0.5) < 0.03
          ? t < 0.5
            ? "First quarter"
            : "Last quarter"
          : t < 0.5
            ? fraction < 0.5
              ? "Waxing crescent"
              : "Waxing gibbous"
            : fraction < 0.5
              ? "Waning crescent"
              : "Waning gibbous";
  const disc = slug === "moon-phases" && near,
    cosine = -p[0] / Math.hypot(...p),
    discSun: [number, number, number] = [
      Math.sign(Math.sin(t * Math.PI * 2)) * Math.sqrt(Math.max(0, 1 - cosine * cosine)) * 10,
      0,
      cosine * 10,
    ];
  return (
    <>
      <ScienceStudio
        key={disc ? "disc" : focus ? (solar ? "solar" : "lunar") : "orbit"}
        slug={slug}
        lights={false}
        space
        // The lunar close-up looks from Earth's side, so the Moon crosses the shadow sideways.
        camera={
          disc ? [0, 0, 4.5] : focus ? (solar ? [7, 1, 2] : [6.5, 1.2, 2.6]) : [1.8, 4.5, 6.6]
        }
        scale={
          disc
            ? "Moon near side · LROC color + LOLA measured relief · no vertical exaggeration"
            : focus
              ? `${solar ? "New" : "Full"}-Moon shadow close-up · kilometers share one scale`
              : physical
                ? "Earth–Moon radii and separation share one scale"
                : "Earth and Moon enlarged · correct size ratio · separation shortened"
        }
        trueScale={
          disc
            ? "Reference lunar radius 1737.4 km · relief shares the radius scale"
            : focus
              ? "Same scale in every direction · atmosphere omitted"
              : "Earth–Moon radii and separation share one scale"
        }
      >
        {disc ? (
          <>
            <directionalLight position={discSun} intensity={3} />
            <ambientLight intensity={0.015} />
            <LunarSurface radius={1.2} angle={Math.PI / 2} photometry />
          </>
        ) : focus ? (
          solar ? (
            <SolarShadow p={shadowPoint} />
          ) : (
            <LunarShadow p={shadowPoint} phase={shadowPhase} />
          )
        ) : (
          <>
            <directionalLight position={[10, 0, 0]} intensity={3} />
            <ambientLight intensity={0.025} />
            <Line points={orbit} color="#8aa3aa" lineWidth={1.3} />
            <EarthMesh radius={radius} sunDirection={new THREE.Vector3(1, 0, 0)} />
            {!physical && <Atmosphere radius={radius * 1.035} />}
            <LunarSurface
              position={position}
              radius={(radius * LUNAR.moon) / LUNAR.earth}
              angle={t * 2 * Math.PI}
              dim={slug === "moon-phases" && lunarEclipse(p) === "Total lunar eclipse"}
            />
            <Line
              points={Array.from({ length: 129 }, (_, i): [number, number, number] => [
                2.2 * Math.cos((i / 128) * 2 * Math.PI),
                0,
                -2.2 * Math.sin((i / 128) * 2 * Math.PI),
              ])}
              color="#786c53"
              dashed
              dashSize={0.055}
              gapSize={0.055}
            />
            <Tag
              pos={[position[0], position[1] + 0.3, position[2]]}
              text={phaseName}
              occlude={false}
              note="The phase is the illuminated fraction viewed from Earth. It is not Earth's shadow falling on the Moon."
            />
            <group position={[3.35, 0, 0]}>
              <StarMesh radius={0.24} />
              <Tag
                pos={[0, 0.5, 0]}
                text="Sunlight"
                note="Not to scale: the real Sun is about 109 times Earth's diameter and about 390 times farther away than the Moon. Its light reaches Earth and Moon as parallel rays from this side."
                occlude={false}
              />
            </group>
            {slug === "tides" && <TidalEnvelope radius={radius} moon={p} />}
            {slug === "eclipses" && <NodeGuides node={node} aligned={aligned} />}
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {slug === "moon-phases" && (
          <div className="pointer-events-auto mb-2 flex justify-center gap-2">
            <button
              type="button"
              className="min-h-11 rounded-lg border border-white/20 px-3"
              aria-pressed={!near}
              onClick={() => setNear(false)}
            >
              {"Orbit geometry"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-lg border border-white/20 px-3"
              aria-pressed={near}
              onClick={() => setNear(true)}
            >
              {"Moon close-up"}
            </button>
          </div>
        )}
        {focus
          ? `${((t - 0.5) * 0.012 * 29.53059 * 24).toFixed(2)} h from ${solar ? "new" : "full"} Moon: ${solar ? solarEclipseText(shadowPoint) : lunarEclipse(shadowPoint)}.`
          : `At day ${(t * 29.53059).toFixed(1)} of the model month, the Moon is ${(fraction * 100).toFixed(1)}% illuminated as seen from Earth (${phaseName.replace(/^\w/, (c) => c.toLowerCase())}).`}{" "}
        {slug === "moon-phases" && !focus && /lunar eclipse/i.test(lunarEclipse(p))
          ? `Earth's shadow now falls on the Moon: ${lunarEclipse(p).toLowerCase()}. `
          : ""}
        {slug === "eclipses" && !focus
          ? lunarEclipse(p) + ". Turn on Shadow close-up for a closer view."
          : slug === "tides"
            ? "The surface shows the combined lunar and solar tidal effects."
            : `The Moon's orbit is tilted by ${aligned ? "0" : LUNAR.inclination}°.`}
        <br />
        {focus &&
          "Play follows an 8.5-hour window around the selected lunar phase. Change Node direction to compare an eclipse with a missed alignment. "}
        {slug === "tides"
          ? "The equilibrium tidal deformation is enlarged. Coastlines, friction and inertia shape the tides at real coasts. "
          : "The orbit model illustrates phase and eclipse geometry without predicting a calendar date. "}
        {"Lunar terrain data come from NASA SVS, LROC and LOLA, with colors adapted for this view."}
      </ScienceReadout>
    </>
  );
}
