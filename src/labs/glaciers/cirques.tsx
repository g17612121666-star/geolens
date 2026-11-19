import { useMemo, useEffect, useRef } from "react";
import * as THREE from "three";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { useLabFrame } from "@/labs/tick";
import { glacialNoise as noise } from "./geometry";
import {
  CIRQUES,
  CIRQUE_RADIUS,
  cirqueHeight,
  cirqueIceGeometry,
  cirqueIceSurface,
  fromCirqueFrame,
  lipHeight,
  tarnGeometry,
  type Cirque,
} from "./cirque-geometry";
import { IceMaterial } from "./ice-material";
import { GNEISS, MEADOW, ROCK, SNOW, TILL, shape } from "./ground";

const smooth = THREE.MathUtils.smoothstep;
const SCREE = new THREE.Color("#968e81");

/**
 * Meadow on the low ground, bare rock on the headwalls and arêtes, pale scree at the foot of the
 * headwalls, till on the cirque floors, and snow on ledges and in gullies high up.
 */
function cirqueColor(x: number, y: number, z: number) {
  const n = noise(x * 3 + 1, z * 3),
    { gradient, curvature } = shape(cirqueHeight, x, z),
    steep = smooth(gradient, 0.55, 1.25),
    c = ROCK.clone();
  // Grass and meadow on gentle low ground; patchy alpine turf higher up.
  c.lerp(MEADOW, (1 - steep) * (1 - smooth(y, 0.55, 0.8 + 0.1 * n)) * 0.92);
  c.lerp(
    MEADOW,
    (1 - steep) * smooth(noise(x * 6, z * 6), 0.5, 0.7) * (1 - smooth(y, 0.8, 1.15)) * 0.6,
  );
  // Scree collects in the hollows at the foot of the headwalls.
  c.lerp(SCREE, smooth(curvature, 0.6, 2.5) * smooth(gradient, 0.35, 0.7) * (1 - steep) * 0.85);
  // Ice-scoured rock and till on the cirque floors.
  const floor = Math.max(...CIRQUES.map((q) => 1 - smooth(Math.abs(y - q.floor), 0.04, 0.12)));
  c.lerp(TILL, floor * (1 - steep) * 0.5);
  const lodged =
    Math.max(1 - steep, smooth(curvature, 0.5, 3)) * smooth(noise(x * 4 + 4, z * 4), 0.3, 0.55);
  c.lerp(SNOW, smooth(y, 1.45 + 0.12 * n, 1.65 + 0.12 * n) * lodged);
  c.multiplyScalar(1 - 0.28 * smooth(curvature, 0.5, 4) + 0.1 * smooth(-curvature, 0.5, 4));
  return c.getStyle();
}

/** A small glacier filling one cirque, thickest against its headwall. */
function CirqueGlacier({ cirque }: { cirque: Cirque }) {
  const geometry = useMemo(() => cirqueIceGeometry(cirque), [cirque]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <IceMaterial ela={0.5} kind="cirque" />
    </mesh>
  );
}

/** The lake left in a cirque's overdeepened floor once its ice has melted. */
function Tarn({ cirque }: { cirque: Cirque }) {
  const geometry = useMemo(() => tarnGeometry(cirque), [cirque]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const compile = useMemo(
    () => (s: THREE.WebGLProgramParametersWithUniforms) => {
      s.vertexShader =
        "attribute float iceDepth; varying float vWater;\n" +
        s.vertexShader.replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\n  vWater = iceDepth;",
        );
      s.fragmentShader =
        "varying float vWater;\n" +
        s.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
  if (vWater < .001) discard;
  // Pale and green over the shallow margins, dark where the water is deep.
  diffuseColor.rgb *= mix(vec3(.22, .36, .36), vec3(.05, .12, .17), smoothstep(.002, .03, vWater));`,
        );
    },
    [],
  );
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#ffffff"
        roughness={0.12}
        envMapIntensity={0.6}
        onBeforeCompile={compile}
        customProgramCacheKey={() => "cirque-tarn-v1"}
      />
    </mesh>
  );
}

/** Markers carried away from each headwall by the cirque ice, moved every frame from lab time. */
function CirqueMarkers() {
  const PER = 5,
    mesh = useRef<THREE.InstancedMesh>(null),
    m = useMemo(() => new THREE.Matrix4(), []);
  const paths = useMemo(
    () =>
      CIRQUES.map((c) =>
        Array.from({ length: 41 }, (_, j) => {
          const along = -CIRQUE_RADIUS * 0.75 + (j / 40) * CIRQUE_RADIUS * 1.55,
            [x, z] = fromCirqueFrame(c, along, 0),
            top = Math.max(cirqueIceSurface(c, x, z).surface, cirqueHeight(x, z));
          return [x, top + 0.02, z] as [number, number, number];
        }),
      ),
    [],
  );
  useLabFrame((t) => {
    if (!mesh.current) return;
    paths.forEach((path, i) => {
      for (let k = 0; k < PER; k++) {
        const p = path[Math.floor(((t + k / PER) % 1) * (path.length - 1))];
        m.makeTranslation(p[0], p[1], p[2]);
        mesh.current!.setMatrixAt(i * PER + k, m);
      }
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, paths.length * PER]}
      frustumCulled={false}
    >
      <sphereGeometry args={[0.025, 12, 8]} />
      <meshBasicMaterial color="#c0602a" />
    </instancedMesh>
  );
}

/** A point in the first cirque's frame, lifted above the ground. */
function inFirstCirque(along: number, across: number, lift: number): [number, number, number] {
  const [x, z] = fromCirqueFrame(CIRQUES[0], along, across);
  return [x, cirqueHeight(x, z) + lift, z];
}

export function Cirques({ ice }: { ice: boolean }) {
  // The arête between the first two cirques, partway down from the summit.
  const ridge = useMemo(() => {
    const a = (CIRQUES[0].angle + CIRQUES[1].angle) / 2,
      x = 0.75 * Math.cos(a),
      z = 0.75 * Math.sin(a);
    return [x, cirqueHeight(x, z) + 0.08, z] as [number, number, number];
  }, []);
  const tarn = useMemo(() => {
    const [x, , z] = inFirstCirque(-0.05, -0.2, 0);
    return [x, lipHeight(CIRQUES[0]) + 0.06, z] as [number, number, number];
  }, []);
  // Turned so the default camera looks along one arête, with a cirque on either side of it.
  return (
    <group rotation={[0, 0.61, 0]}>
      <GeomorphicTerrain
        height={cirqueHeight}
        color={cirqueColor}
        width={6}
        depth={6}
        resolution={230}
        base={-0.1}
        cliff={0.55}
        mottle={0.08}
        section={{ custom: GNEISS, soil: 0.015, regolith: 0.05, soilTone: "thin" }}
      />
      {CIRQUES.map((c) =>
        ice ? <CirqueGlacier key={c.angle} cirque={c} /> : <Tarn key={c.angle} cirque={c} />,
      )}
      {ice && <CirqueMarkers />}
      <Tag
        pos={[0, cirqueHeight(0, 0) + 0.18, 0]}
        text="Horn"
        note="Where three or more cirques have eroded back into one summit, they leave a steep pyramidal peak with a face above each cirque. This three-cirque form is an invented example, not a surveyed mountain."
        occlude={false}
      />
      <Tag
        pos={ridge}
        text="Arête"
        note="A knife-edged ridge left between neighboring cirques, where their headwalls have been cut back toward each other. It is rock that remains, not a wall of deposited debris."
        occlude={false}
      />
      <Tag
        pos={inFirstCirque(0.05, 0.25, ice ? 0.3 : 0.12)}
        text="Cirque"
        note="A bowl-shaped hollow with a steep headwall and a flat or overdeepened floor, eroded at the head of a glacier. Freeze–thaw loosens the headwall, and the ice plucks and scrapes the floor."
        occlude={false}
      />
      {!ice && (
        <Tag
          pos={tarn}
          text="Tarn"
          priority={-1}
          note="A lake filling the overdeepened floor of a cirque, held in by the rock lip at its mouth. Ice scoured the floor deeper than the lip, so water collects once the glacier has gone."
          occlude={false}
        />
      )}
    </group>
  );
}
