import { useMemo, useEffect, useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { useIsCompact } from "@/hooks/use-media";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { RockPrism } from "../shared/rock-prism";
import { Tag } from "../shared/kit";
import { GraniteMaterial } from "./granite-material";
import { landscapeNoise } from "../shared/landscape-noise";
const NAMES = ["Igneous", "Sedimentary", "Metamorphic", "Sediment", "Magma"];
export const ROCK_ROUTES = [
  { from: 4, to: 0, name: "Cooling and crystallisation" },
  { from: 0, to: 3, name: "Weathering / erosion of igneous rock" },
  { from: 1, to: 3, name: "Weathering / erosion of sedimentary rock" },
  { from: 2, to: 3, name: "Weathering / erosion of metamorphic rock" },
  { from: 3, to: 1, name: "Deposition, burial and lithification" },
  { from: 0, to: 2, name: "Solid-state change of igneous rock" },
  { from: 1, to: 2, name: "Solid-state change of sedimentary rock" },
  { from: 0, to: 4, name: "Melting of igneous rock" },
  { from: 1, to: 4, name: "Melting of sedimentary rock" },
  { from: 2, to: 4, name: "Melting of metamorphic rock" },
];
function Crystalline() {
  const g = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.61, 5),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i),
        z = p.getZ(i),
        v =
          0.84 +
          0.17 * landscapeNoise(x * 5 + y * 3, z * 5 - y * 2) +
          0.035 * landscapeNoise(x * 24 - y * 13, z * 29 + y * 17);
      p.setXYZ(i, x * v, y * v, z * v);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g}>
      <GraniteMaterial />
    </mesh>
  );
}
function Grains() {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const o = new THREE.Object3D();
    for (let i = 0; i < 120; i++) {
      const r = 0.5 * Math.sqrt((i + 0.5) / 120),
        a = i * 2.399;
      o.position.set(
        r * Math.cos(a),
        0.2 * (1 - r / 0.5) + 0.03 * Math.sin(i * 7),
        r * Math.sin(a),
      );
      o.scale.setScalar(0.045 + 0.012 * Math.sin(i * 13) ** 2);
      o.rotation.set(i * 0.3, i * 0.4, i * 0.7);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
      ref.current.setColorAt(i, new THREE.Color(i % 3 === 0 ? "#c4b38b" : "#a58d69"));
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 120]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={0.94} />
    </instancedMesh>
  );
}
function Specimen({ kind }: { kind: number }) {
  if (kind === 0) return <Crystalline />;
  if (kind === 3) return <Grains />;
  if (kind === 4)
    return (
      <mesh scale={[1, 0.68, 1]}>
        <sphereGeometry args={[0.57, 72, 48]} />
        <meshStandardMaterial
          color="#7e382c"
          emissive="#a34524"
          emissiveIntensity={0.32}
          roughness={0.5}
        />
      </mesh>
    );
  return (
    <>
      {Array.from({ length: kind === 1 ? 5 : 10 }, (_, i) => {
        const dy = kind === 1 ? 0.19 : 0.095,
          b = -0.48 + i * dy,
          wave = (x: number) => (kind === 1 ? 0 : 0.095 * Math.sin(x * 5)),
          points = [
            ...Array.from({ length: 41 }, (_, j) => {
              const left = -0.56 + 0.08 * Math.sin(b * 5),
                right = 0.56 - 0.06 * Math.cos(b * 7),
                x = left + (j / 40) * (right - left);
              return [x, b + wave(x)] as [number, number];
            }),
            ...Array.from({ length: 41 }, (_, j) => {
              const left = -0.56 + 0.08 * Math.sin((b + dy) * 5),
                right = 0.56 - 0.06 * Math.cos((b + dy) * 7),
                x = right - (j / 40) * (right - left);
              return [x, b + dy + wave(x)] as [number, number];
            }),
          ];
        return (
          <RockPrism
            key={i}
            points={points}
            depth={0.72}
            color={kind === 1 ? (i % 2 ? "#b9a078" : "#998867") : i % 2 ? "#afa89d" : "#565d5b"}
          />
        );
      })}
    </>
  );
}
export default function RockCycle() {
  const { params, t } = useLabControls();
  useLabTick(1 / 40);
  const mobile = useIsCompact(),
    route = ROCK_ROUTES[Math.round(params.process ?? 0)],
    temp = params.temp ?? 500,
    pressure = params.pressure ?? 0.6,
    positions: [number, number, number][] = mobile
      ? [
          [-1.6, 2, 0],
          [1.6, 2, 0],
          [0, 0, 0],
          [-1.6, -2, 0],
          [1.6, -2, 0],
        ]
      : [
          [-3.6, 0.9, 0],
          [0, 1.9, 0],
          [3.6, 0.9, 0],
          [-2, -1.6, 0],
          [2, -1.6, 0],
        ],
    a = new THREE.Vector3(...positions[route.from]),
    b = new THREE.Vector3(...positions[route.to]),
    curve = new THREE.QuadraticBezierCurve3(
      a.clone(),
      a
        .clone()
        .add(b)
        .multiplyScalar(0.5)
        .add(new THREE.Vector3(0, 0, 1.2)),
      b.clone(),
    ),
    path = curve
      .getPoints(64)
      .slice(9, -9)
      .map((p) => p.toArray() as [number, number, number]);
  return (
    <>
      <ScienceStudio
        slug="rock-cycle"
        camera={[0, 0.4, 9]}
        scale="Rock and material examples · positions and specimen sizes are schematic"
        trueScale="No common sample mass, process rate or geographic scale is implied"
      >
        {positions.map((p, i) => (
          <group key={i} position={p}>
            <Specimen kind={i} />
            <Tag
              pos={[0, 0.85, 0]}
              text={NAMES[i]}
              note={
                i === 0
                  ? "Igneous rock forms by cooling and crystallisation of melt. This coarse-grained texture is illustrative, not a scan or a mineral identification."
                  : i === 1
                    ? "This clastic sedimentary example is bedded. Compaction and cementation can lithify sediment; chemical and biological sedimentary rocks have other pathways."
                    : i === 2
                      ? "This foliated example illustrates solid-state recrystallisation and deformation. Not all metamorphic rocks are foliated, and melting is a separate process."
                      : i === 3
                        ? "Loose sediment is material that can be transported and deposited. Grain sizes are enlarged. It is not yet a lithified sedimentary rock."
                        : "Magma is melt that may contain crystals and gas. It becomes igneous rock on cooling and solidification, not merely by becoming hotter."
              }
              occlude={false}
            />
          </group>
        ))}
        <Line points={path} color="#d8b989" lineWidth={2} />
        <Arrow
          from={path[path.length - 5]}
          to={path[path.length - 1]}
          color="#d8b989"
          width={0.9}
        />
        <group position={curve.getPoint(0.15 + t * 0.7)} scale={0.16}>
          <Specimen kind={t < 0.5 ? route.from : route.to} />
        </group>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} position={path[Math.floor(((t + i / 7) % 1) * (path.length - 1))]}>
            <sphereGeometry args={[0.035, 12, 8]} />
            <meshBasicMaterial color="#f0dcac" />
          </mesh>
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {route.name}: {NAMES[route.from]} → {NAMES[route.to]}
        {". Select another path; the cycle has branches and loops, with no compulsory order."}
        <br />
        {"Selected conditions: "}
        {temp.toFixed(0)} {"°C and "}
        {pressure.toFixed(2)} {"GPa. That pressure equals roughly "}
        {((pressure * 1e9) / (2800 * 9.81) / 1000).toFixed(1)}{" "}
        {
          "km of a uniform 2800 kg/m³ overburden. Temperature and pressure alone do not identify a rock or its melt fraction; composition, fluids, time and path matter. The moving specimen changes at the symbolic process midpoint; this is a route illustration, not a reaction-rate or melt-fraction model."
        }
      </ScienceReadout>
    </>
  );
}
