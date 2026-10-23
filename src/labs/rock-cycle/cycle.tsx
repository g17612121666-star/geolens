import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { useIsCompact } from "@/hooks/use-media";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { Specimen } from "./specimens";
const NAMES = ["Igneous", "Sedimentary", "Metamorphic", "Sediment", "Magma"];
const ROCK_ROUTES = [
  { from: 4, to: 0, name: "Cooling and crystallisation" },
  { from: 0, to: 3, name: "Weathering / erosion of igneous rock" },
  { from: 1, to: 3, name: "Weathering / erosion of sedimentary rock" },
  { from: 2, to: 3, name: "Weathering / erosion of metamorphic rock" },
  { from: 3, to: 1, name: "Deposition, burial and lithification" },
  { from: 0, to: 2, name: "Metamorphism of igneous rock" },
  { from: 1, to: 2, name: "Metamorphism of sedimentary rock" },
  { from: 0, to: 4, name: "Melting of igneous rock" },
  { from: 1, to: 4, name: "Melting of sedimentary rock" },
  { from: 2, to: 4, name: "Melting of metamorphic rock" },
];

/**
 * Broad, rounded condition bands. Melting starts near 650 °C only for water-bearing granitic
 * rock; dry basalt needs about 1100 °C or more, so these are guides, not boundaries.
 */
const REGIMES = [
  "surface conditions, where weathering, erosion and deposition happen",
  "shallow burial, where sediment can compact and cement but most rock is too cool to metamorphose",
  "metamorphic conditions, where rock can recrystallise while staying solid but is too cool for crustal rock to melt",
  "the range where some rocks are partly molten, especially granitic rock containing water; drier rock stays solid",
  "hot enough for many crustal rocks, including dry basalt, to be partly or largely molten",
];
function regimeFor(temp: number, pressure: number) {
  if (temp >= 1100) return 4;
  if (temp >= 650) return 3;
  if (temp <= 60 && pressure <= 0.05) return 0;
  if (temp < 200 && pressure < 0.3) return 1;
  return 2;
}
/** Condition bands in which each route in ROCK_ROUTES normally happens. */
const ROUTE_REGIMES = [[3, 4], [0], [0], [0], [0, 1], [2], [2], [3, 4], [3, 4], [3, 4]];
export default function RockCycle() {
  const { params, t, setParam } = useLabControls();
  useLabTick(1 / 40);
  const selectedRoute = Math.round(params.process ?? 0);
  const mobile = useIsCompact(),
    route = ROCK_ROUTES[selectedRoute],
    temp = params.temp ?? 500,
    pressure = params.pressure ?? 0.6,
    regime = regimeFor(temp, pressure),
    suits = ROUTE_REGIMES[selectedRoute].includes(regime),
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
        horizon
        slug="rock-cycle"
        camera={[0, 0.4, 9]}
        scale="Rock and material examples · positions and specimen sizes are schematic"
        trueScale="Not to scale · no sample size, process rate or distance is implied"
      >
        {positions.map((p, i) => (
          <group key={i} position={p}>
            <Specimen kind={i} plinth />
            <Tag
              pos={[0, i === 3 ? 0.15 : 0.85, 0]}
              text={NAMES[i]}
              note={
                i === 0
                  ? "Igneous rock forms by cooling and crystallisation of melt. The coarse-grained texture is drawn, not scanned from a real specimen."
                  : i === 1
                    ? "This clastic sedimentary example is bedded. Compaction and cementation can lithify sediment; chemical and biological sedimentary rocks have other pathways."
                    : i === 2
                      ? "This foliated example shows minerals recrystallised and aligned while the rock stayed solid. Not all metamorphic rocks are foliated, and melting is a separate process."
                      : i === 3
                        ? "Loose sediment is material that can be transported and deposited. Grain sizes are enlarged. It is not yet a lithified sedimentary rock."
                        : "Magma is melt that may contain crystals and gas. It becomes igneous rock on cooling and solidification, not merely by becoming hotter."
              }
              occlude={false}
            />
          </group>
        ))}
        {/* Every pathway as a faint arc with a clickable bead; the selected one is bold. */}
        {ROCK_ROUTES.map((r, k) => {
          if (k === selectedRoute) return null;
          const ra = new THREE.Vector3(...positions[r.from]),
            rb = new THREE.Vector3(...positions[r.to]),
            c = new THREE.QuadraticBezierCurve3(
              ra,
              ra
                .clone()
                .add(rb)
                .multiplyScalar(0.5)
                .add(new THREE.Vector3(0, 0, 0.8 + 0.15 * (k % 3))),
              rb,
            ),
            pts = c.getPoints(40).slice(6, -6);
          return (
            <group key={k}>
              <Line points={pts} color="#a7a294" transparent opacity={0.35} lineWidth={1} />
              {/* Arrowhead just past the bead, clear of the labels at each end. */}
              <Arrow
                from={c.getPoint(0.6).toArray()}
                to={c.getPoint(0.68).toArray()}
                color="#9a958a"
                width={1.6}
              />
              <mesh
                position={c.getPoint(0.5)}
                onClick={(e) => {
                  e.stopPropagation();
                  setParam("process", k);
                }}
                onPointerOver={() => (document.body.style.cursor = "pointer")}
                onPointerOut={() => (document.body.style.cursor = "auto")}
              >
                <sphereGeometry args={[0.08, 16, 12]} />
                <meshStandardMaterial color="#d8b989" roughness={0.5} />
              </mesh>
            </group>
          );
        })}
        <Line points={path} color="#d8b989" lineWidth={2} />
        {/* Arrowheads at the middle and end make the direction readable without animation. */}
        {[Math.floor(path.length / 2) + 4, path.length - 1].map((end) => (
          <Arrow key={end} from={path[end - 8]} to={path[end]} color="#d8b989" width={2.4} />
        ))}
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
        {route.name}: {NAMES[route.from]} → {NAMES[route.to]}.{" At "}
        {temp.toFixed(0)} {"°C and "}
        {pressure.toFixed(2)} {"GPa (about "}
        {((pressure * 1e9) / (2800 * 9.81) / 1000).toFixed(1)}
        {" km deep): "}
        {REGIMES[regime]}.{" "}
        {suits
          ? "These conditions suit this pathway."
          : "This pathway does not normally happen under these conditions."}
        <br />
        {
          "Select another path; the cycle has branches and loops, with no compulsory order. Depth assumes a uniform rock density of 2800 kg/m³. The condition bands are broad guides: temperature and pressure alone do not identify a rock or how much of it melts; composition, fluids, time and history also matter. Melting begins near 650 °C only for granitic rock containing water, while dry basalt needs about 1100 °C or more. The moving specimen changes type halfway along the route; it shows the route, not a reaction rate."
        }
      </ScienceReadout>
    </>
  );
}
