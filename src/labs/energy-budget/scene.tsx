import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { StarMesh } from "@/components/globe/star";
import { useLabState } from "@/lib/store/lab-controls";
import { radiationBudget } from "@/lib/energy-wind-science";
import { useLabFrame, useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { ShallowWater } from "../shared/shallow-water";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { ScientificText } from "@/components/scientific-text";
import { useIsCompact } from "@/hooks/use-media";
import { FluxBand } from "./flux-band";

interface EnergyLabel {
  pos: [number, number, number];
  text: string;
  tone?: "sandstone" | "magma" | "ice";
  note: string;
}

const KEY_TONE = {
  chalk: "text-chalk",
  sandstone: "text-sandstone",
  magma: "text-magma",
  ice: "text-ice",
};

/**
 * A cut-away column of atmosphere over a patch of ground, in the spirit of the global energy
 * budget diagram. Bands carry each global-mean flux; their widths are proportional to W/m².
 * Heights are schematic: the one-layer model has no altitude.
 */
const TOP = 2.75,
  LAYER_LOW = 1.15,
  LAYER_HIGH = 1.6,
  HALF_W = 3.3,
  HALF_D = 1.1,
  SPACE = TOP + 0.45,
  /** Scene units of band width per W/m². */
  PER_WATT = 0.5 / 340;

const SUN: [number, number, number] = [-3.9, 3.95, 0];
const IN_FROM: [number, number] = [-3.45, 3.45],
  IN_TO: [number, number] = [-2.35, 0.02],
  CLOUD_Y = 2.2;

/**
 * The reflected band runs beside the incoming beam (on its right), dips to cloud level and
 * curves back up to space, so the two read as one beam that splits.
 */
function reflectedPath(absorbedWidth: number, reflectedWidth: number): [number, number][] {
  const d = new THREE.Vector2(IN_TO[0] - IN_FROM[0], IN_TO[1] - IN_FROM[1]).normalize(),
    n = new THREE.Vector2(-d.y, d.x),
    offset = (absorbedWidth + reflectedWidth) / 2 + 0.02,
    start = new THREE.Vector2(...IN_FROM).addScaledVector(n, offset),
    turn = start.clone().addScaledVector(d, (start.y - CLOUD_Y) / -d.y),
    end = new THREE.Vector2(-1.35, SPACE + 0.2),
    // Continue a little past the cloud level before swinging up, like light scattered back.
    curve = new THREE.QuadraticBezierCurve(turn, turn.clone().addScaledVector(d, 0.55), end);
  return [[start.x, start.y], ...curve.getPoints(24).map((p) => [p.x, p.y] as [number, number])];
}

export default function EnergyBudget() {
  const { params } = useLabState("params");
  useLabTick(1 / 12);
  const albedo = params.albedo ?? 0.3,
    greenhouse = (params.greenhouse ?? 1) > 0.5,
    b = radiationBudget(albedo, greenhouse ? 0.78 : 0),
    w = (flux: number) => flux * PER_WATT,
    surfaceC = b.surfaceK - 273.15,
    // More cloud, and snow and sea ice spreading, at higher albedo; today's 0.3 is mostly clouds.
    whiteness = THREE.MathUtils.clamp((albedo - 0.3) / 0.55, 0, 1);
  const compact = useIsCompact();
  // Numbered in order on a phone; the back-radiation label exists only with the IR layer.
  const entries: (EnergyLabel | false)[] = [
    {
      pos: [-3.75, 1.2, 0.2],
      text: `Sunlight in ${b.incoming.toFixed(0)} W/m²`,
      tone: "sandstone",
      note: "Earth intercepts 1361 W/m² across a disc but spreads it over a sphere with four times the area, so the global average is a quarter: 340 W/m².",
    },
    {
      pos: [-1.35, SPACE + 0.45, 0.2],
      text: `Reflected ${b.reflected.toFixed(0)} W/m²`,
      note: "Planetary albedo is the fraction of incoming sunlight reflected to space, mostly by clouds, with some from air and bright surfaces such as snow and ice.",
    },
    {
      pos: [0.25, 0.42, 0.2],
      text: `Surface emits ${b.surfaceUp.toFixed(0)}`,
      tone: "magma",
      note: "The warm surface radiates infrared. A warmer surface radiates more (Stefan–Boltzmann law: emission rises with the fourth power of temperature).",
    },
    greenhouse && {
      pos: [-0.95, 0.85, 0.2],
      text: `Back radiation ${b.backRadiation.toFixed(0)}`,
      tone: "ice",
      note: "The layer emits infrared in both directions. The half sent downward warms the surface further, which is the greenhouse effect.",
    },
    {
      pos: [1.9, SPACE + 0.45, 0.2],
      text: `To space ${b.outgoing.toFixed(0)} W/m²`,
      note: "Outgoing infrared = surface radiation escaping through the window + infrared the layer emits upward. At equilibrium it equals the sunlight absorbed.",
    },
    {
      pos: [HALF_W + 0.25, greenhouse ? (LAYER_LOW + LAYER_HIGH) / 2 : 1.4, 0],
      text: greenhouse ? "IR layer · ε = 0.78" : "No infrared absorption",
      note: "One layer absorbs and emits the same share of infrared at every wavelength but lets sunlight through. The hugely enlarged molecules stand for greenhouse gases: carbon dioxide (linear), water vapor (bent) and methane; their vibrations absorb infrared. Convection, evaporation and wavelength detail are left out.",
    },
    {
      pos: [HALF_W - 0.6, -0.25, HALF_D + 0.05],
      text: `Surface ${surfaceC.toFixed(1)} °C`,
      tone: "magma",
      note: "The equilibrium surface temperature: the temperature at which the surface emits exactly what it receives from sunlight and back radiation.",
    },
    {
      pos: [HALF_W + 0.35, TOP, 0],
      text: "Top of atmosphere",
      note: "The energy balance is measured here: sunlight absorbed must equal infrared leaving for the climate to be steady.",
    },
  ];
  const labels = entries
    .filter((l): l is EnergyLabel => l !== false)
    .map((l, i) => ({ ...l, n: i + 1 }));
  return (
    <>
      <ScienceStudio
        slug="energy-budget"
        scale="One-layer radiation experiment · band widths are proportional to global mean fluxes · heights are schematic"
        trueScale="The one-layer model has no altitude; the layer stands for all infrared-absorbing gases"
        camera={[0.7, 0.75, 9]}
      >
        <Landscape whiteness={whiteness} />
        <Sky />
        <Clouds albedo={albedo} />
        {greenhouse && <InfraredLayer />}
        <group position={SUN}>
          <StarMesh radius={0.36} />
        </group>

        {/* Sunlight: in from the upper left; the reflected share peels off at cloud level. */}
        <FluxBand path={[IN_FROM, IN_TO]} width={w(b.absorbed)} color="#f2c76b" />
        <FluxBand
          path={reflectedPath(w(b.absorbed), w(b.reflected))}
          width={w(b.reflected)}
          color="#f3ecd2"
          opacity={0.82}
        />
        {/* Infrared from the surface: absorbed by the layer, or straight out through the window. */}
        <FluxBand
          path={[
            [0.25, 0.02],
            [0.25, greenhouse ? LAYER_LOW + 0.1 : SPACE + 0.25],
          ]}
          width={w(greenhouse ? b.surfaceUp - b.window : b.surfaceUp)}
          color="#e8835a"
        />
        {greenhouse && (
          <FluxBand
            path={[
              [1.35, 0.02],
              [1.35, SPACE + 0.25],
            ]}
            width={w(b.window)}
            color="#e8835a"
          />
        )}
        {greenhouse && (
          <>
            <FluxBand
              path={[
                [2.45, LAYER_HIGH - 0.1],
                [2.45, SPACE + 0.25],
              ]}
              width={w(b.atmosphereUp)}
              color="#7cc6dd"
            />
            <FluxBand
              path={[
                [-0.95, LAYER_LOW + 0.1],
                [-0.95, 0.02],
              ]}
              width={w(b.backRadiation)}
              color="#7cc6dd"
            />
          </>
        )}

        {/* On a phone the labels become numbers keyed below the model, so it can fill the
            screen instead of shrinking to make room for long labels. */}
        {labels.map((l) => (
          <Tag
            key={l.n}
            pos={l.pos}
            text={compact ? String(l.n) : l.text}
            title={compact ? `${l.n} · ${l.text}` : undefined}
            tone={l.tone}
            note={l.note}
            occlude={false}
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {compact && (
          <ol className="mb-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {labels.map((l) => (
              <li key={l.n} className={KEY_TONE[l.tone ?? "chalk"]}>
                <span className="font-mono">{l.n}</span> <ScientificText>{l.text}</ScientificText>
              </li>
            ))}
          </ol>
        )}
        <span className="text-sandstone">
          {"Sunlight absorbed "}
          {b.absorbed.toFixed(1)}
        </span>{" "}
        ·{" "}
        <span className="text-magma">
          {"Surface emits "}
          {b.surfaceUp.toFixed(1)}
        </span>{" "}
        ·{" "}
        <span className="text-glacier">
          {"Back radiation "}
          {b.backRadiation.toFixed(1)}
        </span>{" "}
        {"W/m². Equilibrium surface temperature "}
        {surfaceC.toFixed(1)} {"°C · top-of-atmosphere balance "}
        {Math.abs(b.absorbed - b.outgoing) < 0.05
          ? "0.0"
          : (b.absorbed - b.outgoing).toFixed(1)}{" "}
        {"W/m²."} <br />
        {
          "Yellow: sunlight absorbed; cream: sunlight reflected. Orange: infrared from the surface. Blue: infrared emitted by the layer, up to space and back down to the surface. Each band’s width is proportional to its flux. Top-of-atmosphere balance is sunlight absorbed minus infrared to space; zero means equilibrium. In the model, a higher albedo brings more cloud, and snow and sea ice spreading from the poleward edge."
        }
      </ScienceReadout>
    </>
  );
}

/** Shoreline: ocean to the west, under the incoming sunlight; low plains to the east. */
const COAST = -1.15;
const shore = (x: number, z: number) =>
  x - COAST - 0.1 * Math.sin(z * 2.4 + 0.5) - 0.08 * (noise(x * 1.4 + 2, z * 1.4) - 0.5);
/** The land surface and sea floor (sea level is 0). Relief is small and schematic. */
function groundHeight(x: number, z: number) {
  const s = shore(x, z);
  if (s < 0) return -0.015 - 0.1 * THREE.MathUtils.smoothstep(-s, 0, 1.3);
  return (
    0.006 +
    0.05 * THREE.MathUtils.smoothstep(s, 0.15, 3.6) +
    0.012 * (noise(x * 2.5 + 3, z * 2.5) - 0.5) * THREE.MathUtils.smoothstep(s, 0, 0.3)
  );
}
const seaLevel = () => 0;
/** Snow or ice cover (0–1) spreading from the poleward (back) edge as `whiteness` rises. */
function cover(x: number, z: number, whiteness: number, patchy: number) {
  if (whiteness <= 0) return 0;
  const edge = -HALF_D - 0.1 + (2 * HALF_D + 0.35) * whiteness,
    front = z + patchy * (noise(x * 3 + 7, z * 3) - 0.5);
  return 1 - THREE.MathUtils.smoothstep(front, edge - 0.05, edge + 0.05);
}
const tone = new THREE.Color(),
  white = new THREE.Color("#edf2f4");

/**
 * A coast under the column: dark ocean where the sunlight arrives, a beach and grassy plains
 * with trees. As albedo rises, snow and sea ice spread from the poleward edge.
 */
function Landscape({ whiteness }: { whiteness: number }) {
  const color = useMemo(
    () => (x: number, _y: number, z: number) => {
      const s = shore(x, z),
        n = noise(x * 3.1 + 1, z * 3.1);
      tone.set(s < 0 ? "#8b8670" : s < 0.12 ? "#d6c597" : n > 0.62 ? "#55743d" : "#6f8f4e");
      if (s >= 0) tone.lerp(white, cover(x, z, whiteness, 0.25));
      return "#" + tone.getHexString();
    },
    [whiteness],
  );
  const ice = useMemo(() => {
    const g = new THREE.PlaneGeometry(COAST + HALF_W + 0.3, HALF_D * 2, 120, 50);
    g.rotateX(-Math.PI / 2);
    g.translate((COAST + 0.3 - HALF_W) / 2, 0.004, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 4);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        // Floes: sea ice breaks into patches toward its edge.
        floes = THREE.MathUtils.smoothstep(noise(x * 9 + 1, z * 9), 0.25, 0.4),
        a = cover(x, z, whiteness * 0.94, 0.35),
        alpha = shore(x, z) < 0 ? Math.min(1, a * (a > 0.85 ? 1 : floes) * 1.1) : 0;
      c.set([0.93, 0.96, 0.98, alpha], i * 4);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 4));
    return g;
  }, [whiteness]);
  useLayoutEffect(() => () => ice.dispose(), [ice]);
  const trees = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i): [number, number, number] => {
        const x = -0.7 + random(i + 3) * 3.85,
          z = -0.95 + random(i + 41) * 1.9;
        return [x, groundHeight(x, z), z];
      }).filter(
        ([x, , z]) =>
          shore(x, z) > 0.35 &&
          // Clear of the infrared bands rising from the ground along the middle.
          (Math.abs(z) > 0.32 || (Math.abs(x - 0.25) > 0.42 && Math.abs(x - 1.35) > 0.32)) &&
          cover(x, z, whiteness, 0.25) < 0.5,
      ),
    [whiteness],
  );
  return (
    <group>
      <GeomorphicTerrain
        height={groundHeight}
        color={color}
        width={HALF_W * 2}
        depth={HALF_D * 2}
        base={-0.34}
        resolution={180}
        cliff={0}
        mottle={0.06}
        section={{ rock: "sandstone", soil: 0.035, regolith: 0.03, beds: 5 }}
      />
      <ShallowWater
        land={groundHeight}
        level={seaLevel}
        width={HALF_W * 2}
        depth={HALF_D * 2}
        resolution={160}
        deep={0.09}
        shallowColour="#3f7f8c"
        deepColour="#173f5c"
      />
      <mesh geometry={ice} renderOrder={3}>
        <meshStandardMaterial vertexColors transparent roughness={0.55} depthWrite={false} />
      </mesh>
      <PlantStand kind="broadleaf" positions={trees} scale={0.1} seed={5} />
    </group>
  );
}

/** The sky behind the column, fading from pale blue near the ground to dark blue at the top. */
function Sky() {
  const sky = useMemo(
    () => ({
      low: { value: new THREE.Color("#9ccbe8") },
      high: { value: new THREE.Color("#1b3a6b") },
    }),
    [],
  );
  return (
    <group>
      <mesh position={[0, TOP / 2, -HALF_D]} renderOrder={0}>
        <planeGeometry args={[HALF_W * 2, TOP]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={sky}
          vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`}
          fragmentShader={`
            uniform vec3 low; uniform vec3 high; varying vec2 vUv;
            void main(){
              vec3 c = mix(low, high, smoothstep(0.0, 1.0, vUv.y));
              // Soft side edges, so the sky reads as air rather than a pane of glass.
              float side = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
              gl_FragColor = vec4(c, mix(0.62, 0.5, vUv.y) * side);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`}
        />
      </mesh>
      <Line
        points={[
          [-HALF_W, TOP, HALF_D],
          [HALF_W, TOP, HALF_D],
          [HALF_W, TOP, -HALF_D],
          [-HALF_W, TOP, -HALF_D],
          [-HALF_W, TOP, HALF_D],
        ]}
        color="#cfe3ea"
        lineWidth={1.4}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
    </group>
  );
}

/** Cloud spots: the first sits where the reflected sunlight turns back toward space. */
const CLOUD_SPOTS: [number, number, number][] = [
  [-2.05, CLOUD_Y + 0.05, -0.2],
  [0.6, CLOUD_Y + 0.12, -0.45],
  [2.4, CLOUD_Y, 0.25],
  [-0.9, CLOUD_Y + 0.18, 0.45],
  [1.5, CLOUD_Y + 0.2, 0.55],
  [-2.8, CLOUD_Y + 0.15, 0.55],
  [-0.2, CLOUD_Y + 0.02, -0.75],
  [2.9, CLOUD_Y + 0.15, -0.6],
  [-1.6, CLOUD_Y + 0.25, -0.75],
];
/** Cloud cover rises with albedo: clouds cause most of the 30% of sunlight Earth reflects. */
function Clouds({ albedo }: { albedo: number }) {
  const count = Math.round(1 + 8 * THREE.MathUtils.clamp((albedo - 0.1) / 0.8, 0, 1));
  return (
    <>
      {CLOUD_SPOTS.slice(0, count).map((p, i) => {
        const s = 0.62 + 0.2 * random(i + 9);
        return (
          <CloudVolume
            key={i}
            position={p}
            scale={[s * 1.1, s * 0.62, s * 0.8]}
            seed={i + 3}
            density={26}
            opacity={0.95}
          />
        );
      })}
    </>
  );
}

/** The infrared-absorbing layer: a band of haze, soft at its top and bottom, with molecules. */
function InfraredLayer() {
  const haze = useMemo(
    () => ({
      color: { value: new THREE.Color("#4f9aa6") },
    }),
    [],
  );
  return (
    <group position={[0, (LAYER_LOW + LAYER_HIGH) / 2, 0]}>
      <mesh renderOrder={1}>
        <boxGeometry args={[HALF_W * 2, LAYER_HIGH - LAYER_LOW, HALF_D * 2]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={haze}
          vertexShader={`varying vec3 vLocal; void main(){ vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`}
          fragmentShader={`
            uniform vec3 color; varying vec3 vLocal;
            void main(){
              float h = ${((LAYER_HIGH - LAYER_LOW) / 2).toFixed(3)};
              float soft = 1.0 - smoothstep(h * 0.3, h, abs(vLocal.y));
              gl_FragColor = vec4(color, 0.3 * soft);
              #include <tonemapping_fragment>
              #include <colorspace_fragment>
            }`}
        />
      </mesh>
      {[LAYER_LOW, LAYER_HIGH].map((y) => (
        <Line
          key={y}
          points={[
            [-HALF_W, y - (LAYER_LOW + LAYER_HIGH) / 2, HALF_D],
            [HALF_W, y - (LAYER_LOW + LAYER_HIGH) / 2, HALF_D],
            [HALF_W, y - (LAYER_LOW + LAYER_HIGH) / 2, -HALF_D],
          ]}
          color="#5aa9b5"
          lineWidth={1.3}
          dashed
          dashSize={0.1}
          gapSize={0.07}
        />
      ))}
      <Molecules />
    </group>
  );
}

type Point = [number, number, number];
const ATOM = { C: "#3a3a3a", O: "#d4473b", H: "#f2f2f2" } as const;
type Atom = { e: keyof typeof ATOM; p: Point; r: number };
/** Greenhouse molecules, hugely enlarged: CO₂ is linear, H₂O bent, CH₄ tetrahedral. */
const SHAPES: { name: string; atoms: Atom[] }[] = [
  {
    name: "CO2",
    atoms: [
      { e: "C", p: [0, 0, 0], r: 0.045 },
      { e: "O", p: [-0.1, 0, 0], r: 0.05 },
      { e: "O", p: [0.1, 0, 0], r: 0.05 },
    ],
  },
  {
    name: "H2O",
    atoms: [
      { e: "O", p: [0, 0, 0], r: 0.055 },
      { e: "H", p: [-0.065, -0.05, 0], r: 0.032 },
      { e: "H", p: [0.065, -0.05, 0], r: 0.032 },
    ],
  },
  {
    name: "CH4",
    atoms: [
      { e: "C", p: [0, 0, 0], r: 0.05 },
      { e: "H", p: [0.06, 0.06, 0.06], r: 0.03 },
      { e: "H", p: [-0.06, -0.06, 0.06], r: 0.03 },
      { e: "H", p: [-0.06, 0.06, -0.06], r: 0.03 },
      { e: "H", p: [0.06, -0.06, -0.06], r: 0.03 },
    ],
  },
];
/** Where the molecules sit along the front of the layer, clear of the bands behind them. */
const MOLECULES = [-2.95, -2.1, -1.45, -0.3, 0.8, 1.9, 2.95];
/** Enlarged molecules that turn and vibrate; they move every frame without re-rendering. */
function Molecules() {
  const groups = useRef<(THREE.Group | null)[]>([]);
  useLabFrame((t) => {
    groups.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.set(i * 0.7 + t * 1.3, i * 1.3 + t * 2, 0);
      // Bonds stretch and bend: the vibrations that absorb infrared.
      const wobble = 1 + 0.12 * Math.sin(t * 90 + i * 2.1);
      g.children.forEach((atom, k) => {
        const p = SHAPES[i % 3].atoms[k].p;
        atom.position.set(p[0] * wobble, p[1] * (k ? 2 - wobble : 1), p[2] * wobble);
      });
    });
  });
  return (
    <group>
      {MOLECULES.map((x, i) => {
        const shape = SHAPES[i % 3];
        return (
          <group
            key={i}
            ref={(g) => {
              groups.current[i] = g;
            }}
            position={[x, 0.07 * Math.sin(i * 1.7), HALF_D - 0.18]}
            scale={2.3}
          >
            {shape.atoms.map((a, k) => (
              <mesh key={k} position={a.p}>
                <sphereGeometry args={[a.r, 18, 14]} />
                <meshStandardMaterial color={ATOM[a.e]} roughness={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
