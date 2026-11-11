import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { StarMesh } from "@/components/globe/star";
import { useLabControls } from "@/lib/store/lab-controls";
import { radiationBudget } from "@/lib/energy-wind-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { TerrainMaterial } from "../shared/natural-world";
import { CloudPuffMaterial } from "../shared/cloud-material";
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
  const { params, t } = useLabControls();
  useLabTick(1 / 12);
  const albedo = params.albedo ?? 0.3,
    greenhouse = (params.greenhouse ?? 1) > 0.5,
    b = radiationBudget(albedo, greenhouse ? 0.78 : 0),
    w = (flux: number) => flux * PER_WATT,
    surfaceC = b.surfaceK - 273.15,
    // Brighter ground and more cloud at higher albedo; planetary albedo is mostly clouds.
    whiteness = THREE.MathUtils.clamp((albedo - 0.3) / 0.55, 0, 1),
    ground = useMemo(
      () => new THREE.Color("#6f8f4e").lerp(new THREE.Color("#e8eef0"), whiteness),
      [whiteness],
    );
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
        <Ground color={ground} warmth={surfaceC} />
        <Column />
        <Clouds albedo={albedo} />
        {greenhouse && <InfraredLayer t={t} />}
        <group position={SUN}>
          <StarMesh radius={0.36} />
        </group>

        {/* Sunlight: in from the upper left; the reflected share peels off at cloud level. */}
        <FluxBand path={[IN_FROM, IN_TO]} width={w(b.absorbed)} color="#f2c76b" phase={t} />
        <FluxBand
          path={reflectedPath(w(b.absorbed), w(b.reflected))}
          width={w(b.reflected)}
          color="#f3ecd2"
          phase={t}
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
          phase={t}
        />
        {greenhouse && (
          <FluxBand
            path={[
              [1.35, 0.02],
              [1.35, SPACE + 0.25],
            ]}
            width={w(b.window)}
            color="#e8835a"
            phase={t}
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
              phase={t}
            />
            <FluxBand
              path={[
                [-0.95, LAYER_LOW + 0.1],
                [-0.95, 0.02],
              ]}
              width={w(b.backRadiation)}
              color="#7cc6dd"
              phase={t}
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
          "Yellow: sunlight absorbed; cream: sunlight reflected. Orange: infrared from the surface. Blue: infrared emitted by the layer, up to space and back down to the surface. Each band’s width is proportional to its flux. Top-of-atmosphere balance is sunlight absorbed minus infrared to space; zero means equilibrium. More cloud and whiter ground in the model mean a higher albedo."
        }
      </ScienceReadout>
    </>
  );
}

/** A slab of ground with a soil face; it glows faintly warmer as the surface heats. */
function Ground({ color, warmth }: { color: THREE.Color; warmth: number }) {
  const glow = THREE.MathUtils.clamp((warmth + 20) / 60, 0, 1);
  return (
    <group>
      <mesh position={[0, -0.025, 0]} receiveShadow>
        <boxGeometry args={[HALF_W * 2, 0.05, HALF_D * 2]} />
        <TerrainMaterial
          kind="grass"
          color={color}
          emissive="#ff6a2b"
          emissiveIntensity={0.015 + glow * 0.06}
        />
      </mesh>
      <mesh position={[0, -0.23, 0]} receiveShadow>
        <boxGeometry args={[HALF_W * 2, 0.36, HALF_D * 2]} />
        <TerrainMaterial kind="soil" color="#6e5641" />
      </mesh>
    </group>
  );
}

/** The atmosphere column: a sky gradient behind, faint edges, and the top of the atmosphere. */
function Column() {
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(HALF_W * 2, TOP, HALF_D * 2);
    box.translate(0, TOP / 2, 0);
    const e = new THREE.EdgesGeometry(box);
    box.dispose();
    return e;
  }, []);
  const sky = useMemo(
    () => ({
      low: { value: new THREE.Color("#8cc4e6") },
      high: { value: new THREE.Color("#1b3a6b") },
    }),
    [],
  );
  return (
    <group>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#9fb7c4" transparent opacity={0.35} />
      </lineSegments>
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
              gl_FragColor = vec4(c, mix(0.5, 0.18, vUv.y));
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

/** Cloud cover rises with albedo: the main reason Earth reflects about 30% of sunlight. */
function Clouds({ albedo }: { albedo: number }) {
  const count = Math.round(2 + 16 * THREE.MathUtils.clamp((albedo - 0.1) / 0.8, 0, 1)),
    mesh = useRef<THREE.InstancedMesh>(null),
    geometry = useMemo(() => new THREE.PlaneGeometry(1, 0.62), []);
  useLayoutEffect(() => {
    const m = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = -3 + ((i * 0.618 + 0.13) % 1) * 6,
        z = -0.8 + ((i * 0.381 + 0.5) % 1) * 1.6,
        s = 0.5 + ((i * 0.733) % 1) * 0.42;
      m.position.set(x, CLOUD_Y + 0.05 + ((i * 0.29) % 1) * 0.3, z);
      m.scale.set(s, s, s);
      m.updateMatrix();
      mesh.current?.setMatrixAt(i, m.matrix);
    }
    if (mesh.current) {
      mesh.current.count = count;
      mesh.current.instanceMatrix.needsUpdate = true;
      mesh.current.computeBoundingSphere();
    }
  }, [count]);
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, 18]} renderOrder={1}>
      <CloudPuffMaterial opacity={0.8} />
    </instancedMesh>
  );
}

function InfraredLayer({ t }: { t: number }) {
  const edges = useMemo(() => {
    const box = new THREE.BoxGeometry(HALF_W * 2, LAYER_HIGH - LAYER_LOW, HALF_D * 2);
    const e = new THREE.EdgesGeometry(box);
    box.dispose();
    return e;
  }, []);
  return (
    <group position={[0, (LAYER_LOW + LAYER_HIGH) / 2, 0]}>
      <mesh renderOrder={1}>
        <boxGeometry args={[HALF_W * 2, LAYER_HIGH - LAYER_LOW, HALF_D * 2]} />
        <meshStandardMaterial
          color="#8fd0d8"
          roughness={0.5}
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8fd0d8" transparent opacity={0.6} />
      </lineSegments>
      <Molecules t={t} />
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
function Molecules({ t }: { t: number }) {
  return (
    <group>
      {Array.from({ length: 16 }, (_, i) => {
        const shape = SHAPES[i % 3],
          x = -3 + (i / 15) * 6,
          z = -0.85 + 1.7 * ((i * 0.618) % 1),
          wobble = 0.02 * Math.sin(t * 60 + i * 2.1);
        return (
          <group
            key={i}
            position={[x, 0.12 * Math.sin(i * 1.7) + wobble, z]}
            rotation={[i * 0.7, i * 1.3 + t * 2, 0]}
          >
            {shape.atoms.map((a, k) => (
              <mesh key={k} position={a.p.map((v) => v * (1 + wobble * (k ? 2 : 0))) as Point}>
                <sphereGeometry args={[a.r, 16, 12]} />
                <meshStandardMaterial color={ATOM[a.e]} roughness={0.35} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}
