import { useMemo, useEffect } from "react";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { soilFractions, soilTexture, TEXTURE_COLOURS } from "@/lib/soil-science";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
const xyz = (sand: number, clay: number): [number, number, number] => [
  ((100 - sand - clay - sand) / 100) * 1.7,
  0.02,
  1 - (2.95 * clay) / 100,
];
export default function SoilTexture() {
  const { params } = useLabControls(),
    { sand, clay, silt } = soilFractions(params.sand ?? 40, params.clay ?? 20),
    name = soilTexture(sand, clay);
  const g = useMemo(() => {
    const p: number[] = [],
      colors: number[] = [],
      n = 80;
    function tri(points: [number, number][]) {
      const sa = points.reduce((s, p) => s + p[0], 0) / 3,
        cl = points.reduce((s, p) => s + p[1], 0) / 3,
        c = new THREE.Color(TEXTURE_COLOURS[soilTexture(sa, cl)]);
      for (const point of points) {
        p.push(...xyz(...point));
        colors.push(c.r, c.g, c.b);
      }
    }
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n - a; b++) {
        tri([
          [(a * 100) / n, (b * 100) / n],
          [((a + 1) * 100) / n, (b * 100) / n],
          [(a * 100) / n, ((b + 1) * 100) / n],
        ]);
        if (a + b < n - 1)
          tri([
            [((a + 1) * 100) / n, (b * 100) / n],
            [((a + 1) * 100) / n, ((b + 1) * 100) / n],
            [(a * 100) / n, ((b + 1) * 100) / n],
          ]);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);
  useEffect(() => () => g.dispose(), [g]);
  // Class boundaries: segments wherever neighbouring sample points fall in different classes.
  const borders = useMemo(() => {
    const out: number[] = [],
      n = 160,
      cls = (a: number, b: number) => soilTexture((a * 100) / n, (b * 100) / n);
    for (let a = 0; a < n; a++)
      for (let b = 0; a + b < n; b++) {
        const here = cls(a + 0.5, b + 0.5);
        if (a + b + 1 < n && cls(a + 1.5, b + 0.5) !== here)
          out.push(
            ...xyz(((a + 1) * 100) / n, (b * 100) / n),
            ...xyz(((a + 1) * 100) / n, ((b + 1) * 100) / n),
          );
        if (a + b + 1 < n && cls(a + 0.5, b + 1.5) !== here)
          out.push(
            ...xyz((a * 100) / n, ((b + 1) * 100) / n),
            ...xyz(((a + 1) * 100) / n, ((b + 1) * 100) / n),
          );
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    geo.translate(0, 0.004, 0);
    return geo;
  }, []);
  useEffect(() => () => borders.dispose(), [borders]);
  // A solid tile beneath the coloured face, so the triangle reads as an object.
  const tile = useMemo(() => {
    const corners = [xyz(100, 0), xyz(0, 0), xyz(0, 100)],
      shape = new THREE.Shape(corners.map(([x, , z]) => new THREE.Vector2(x, -z))),
      geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.08,
        bevelEnabled: true,
        bevelSize: 0.04,
        bevelThickness: 0.02,
        bevelSegments: 3,
      });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, -0.085, 0);
    return geo;
  }, []);
  useEffect(() => () => tile.dispose(), [tile]);
  return (
    <>
      <ScienceStudio
        slug="soil-texture"
        scale="USDA texture triangle · percentages sum to 100 · fine-earth fraction only"
        trueScale="Positions on the triangle are exact · the slab’s thickness is only for display"
        camera={[0, 5.4, 4.4]}
      >
        <mesh geometry={tile} castShadow receiveShadow>
          <meshStandardMaterial color="#e4ddcf" roughness={0.6} />
        </mesh>
        <mesh geometry={g} receiveShadow>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.7} />
        </mesh>
        <lineSegments geometry={borders}>
          <lineBasicMaterial color="#5d5547" transparent opacity={0.75} />
        </lineSegments>
        {/* Ticks every 10% along each edge. */}
        {Array.from({ length: 9 }, (_, i) => (i + 1) * 10).flatMap((v) => [
          <Line
            key={`s${v}`}
            points={[xyz(v, 0), [xyz(v, 0)[0], 0.02, xyz(v, 0)[2] + 0.1]]}
            color="#6b6355"
          />,
          <Line
            key={`c${v}`}
            points={[xyz(0, v), [xyz(0, v)[0] - 0.09, 0.02, xyz(0, v)[2] - 0.05]]}
            color="#6b6355"
          />,
          <Line
            key={`t${v}`}
            points={[xyz(100 - v, v), [xyz(100 - v, v)[0] + 0.09, 0.02, xyz(100 - v, v)[2] - 0.05]]}
            color="#6b6355"
          />,
        ])}
        {[20, 40, 60, 80].map((v) => (
          <group key={v}>
            <Line points={[xyz(0, v), xyz(100 - v, v)]} color="#f4efe6" transparent opacity={0.3} />
            <Line points={[xyz(v, 0), xyz(v, 100 - v)]} color="#f4efe6" transparent opacity={0.3} />
            <Line
              points={[xyz(100 - v, 0), xyz(0, 100 - v)]}
              color="#f4efe6"
              transparent
              opacity={0.3}
            />
          </group>
        ))}
        {/* Axis numbers: sand along the base, clay up the left edge, silt down the right edge. */}
        {[20, 40, 60, 80].flatMap((v) => [
          <AxisNumber key={`sn${v}`} pos={xyz(v, 0)} offset={[0, 0.2]} text={`${v}`} />,
          <AxisNumber key={`cn${v}`} pos={xyz(100 - v, v)} offset={[-0.2, -0.1]} text={`${v}`} />,
          <AxisNumber key={`tn${v}`} pos={xyz(0, 100 - v)} offset={[0.2, -0.1]} text={`${v}`} />,
        ])}
        <AxisNumber pos={xyz(50, 0)} offset={[0, 0.36]} text="← sand %" />
        <AxisNumber pos={xyz(50, 50)} offset={[-0.62, -0.3]} text="clay % ↑" />
        <AxisNumber pos={xyz(0, 50)} offset={[0.62, -0.3]} text="silt % ↓" />
        <mesh position={xyz(sand, clay)}>
          <sphereGeometry args={[0.055, 24, 16]} />
          <meshStandardMaterial color="#fff2d2" metalness={0.2} roughness={0.3} />
        </mesh>
        <group position={[0, 0, 2.0]}>
          {[
            { label: "sand", fraction: sand, x: -1.3 },
            { label: "silt", fraction: silt, x: 0 },
            { label: "clay", fraction: clay, x: 1.3 },
          ].map((sample, k) => (
            <group key={k} position={[sample.x, 0, 0]}>
              <mesh position={[0, -0.03, 0]} receiveShadow>
                <cylinderGeometry args={[0.38, 0.38, 0.02, 48]} />
                <meshStandardMaterial color="#f2efe8" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.02, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 0.09, 48, 1, true]} />
                <meshPhysicalMaterial
                  color="#e6f1f3"
                  transparent
                  opacity={0.3}
                  roughness={0.05}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                />
              </mesh>
              {k < 2 ? (
                <DebrisField
                  points={Array.from({ length: Math.round(sample.fraction * 0.8) }, (_, i) => {
                    const a = i * 2.399,
                      r = 0.31 * Math.sqrt((i + 0.5) / Math.max(1, sample.fraction * 0.8));
                    return [r * Math.cos(a), 0.018 + 0.02 * Math.sin(i * 3) ** 2, r * Math.sin(a)];
                  })}
                  size={k === 0 ? 0.034 : 0.016}
                  color={k === 0 ? "#d3c29b" : "#a8957a"}
                />
              ) : (
                Array.from({ length: Math.round(clay * 0.6) }, (_, i) => {
                  const a = i * 2.399,
                    r = 0.3 * Math.sqrt((i + 0.5) / Math.max(1, clay * 0.6));
                  return (
                    <mesh
                      key={i}
                      position={[
                        r * Math.cos(a),
                        0.023 + 0.015 * Math.sin(i * 3) ** 2,
                        r * Math.sin(a),
                      ]}
                      rotation={[0.08 * Math.sin(i), i * 0.6, 0.08 * Math.cos(i)]}
                    >
                      <cylinderGeometry args={[0.02, 0.02, 0.004, 6]} />
                      <meshStandardMaterial color="#aa8d70" roughness={0.85} />
                    </mesh>
                  );
                })
              )}
              <Tag
                pos={[0, 0.02, 0.55]}
                text={`${sample.fraction.toFixed(0)}% ${sample.label}`}
                note="Enlarged samples show angular sand and silt grains and flat clay plates, drawn in size order (sand largest, clay smallest). Real sand grains can be over 1,000 times wider than clay plates, so sizes are not to scale and grain counts are not measurements. The percentage is by mass of the fine earth."
                occlude={false}
              />
            </group>
          ))}
        </group>
        <SettlingJar sand={sand} silt={silt} clay={clay} />
        <Tag pos={[-1.9, 0.04, 1.1]} text="100% sand" occlude={false} />
        <Tag pos={[1.9, 0.04, 1.1]} text="100% silt" occlude={false} />
        <Tag pos={[0, 0.04, -2.15]} text="100% clay" occlude={false} />
        <Tag
          pos={[xyz(sand, clay)[0], 0.4, xyz(sand, clay)[2]]}
          text={name}
          note="The class depends on particle sizes, not colour, fertility or organic content. Silt is whatever remains after sand and clay, so the total stays at 100%."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        <span className="formula">
          {sand.toFixed(0)}
          {"% sand + "}
          {silt.toFixed(0)}
          {"% silt + "}
          {clay.toFixed(0)}
          {"% clay = 100%"}
        </span>{" "}
        · {name}
        {
          ". USDA size limits: sand 0.05–2 mm, silt 0.002–0.05 mm, clay <0.002 mm. The jar shows how the same mix settles in water. Class colours are a key, not soil photographs."
        }
      </ScienceReadout>
    </>
  );
}

/** A small number or axis name beside the triangle, pushed outwards by `offset` (x, z). */
function AxisNumber({
  pos,
  offset,
  text,
}: {
  pos: [number, number, number];
  offset: [number, number];
  text: string;
}) {
  return (
    <Html position={[pos[0] + offset[0], 0.03, pos[2] + offset[1]]} center>
      <span className="pointer-events-none block whitespace-nowrap font-mono text-[11px] text-mist">
        {text}
      </span>
    </Html>
  );
}

/**
 * The classroom jar test: shaken soil settles with sand first, then silt, then clay,
 * so layer thicknesses follow the selected fractions. Water and glass are schematic.
 */
function SettlingJar({ sand, silt, clay }: { sand: number; silt: number; clay: number }) {
  const height = 1.2,
    radius = 0.32,
    layers = [
      { f: sand, colour: "#d2b27a", name: "Sand" },
      { f: silt, colour: "#a8906e", name: "Silt" },
      { f: clay, colour: "#7d6a5c", name: "Clay" },
    ];
  let y = 0;
  return (
    <group position={[2.6, 0, -0.4]}>
      {layers.map((l) => {
        const h = (l.f / 100) * height * 0.62,
          centre = y + h / 2;
        y += h;
        return h > 0.002 ? (
          <mesh key={l.name} position={[0, centre, 0]}>
            <cylinderGeometry args={[radius * 0.96, radius * 0.96, h, 40]} />
            <meshStandardMaterial color={l.colour} roughness={0.95} />
          </mesh>
        ) : null;
      })}
      <mesh position={[0, y + (height * 0.92 - y) / 2, 0]}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, height * 0.92 - y, 40]} />
        <meshStandardMaterial color="#a9b9a6" transparent opacity={0.42} roughness={0.1} />
      </mesh>
      {/* The finest clay can stay suspended for days, clouding the water just above it. */}
      <mesh position={[0, y + 0.06, 0]}>
        <cylinderGeometry args={[radius * 0.955, radius * 0.955, 0.12, 40]} />
        <meshStandardMaterial color="#8b7d69" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh position={[0, height + 0.04, 0]} castShadow>
        <cylinderGeometry args={[radius + 0.02, radius + 0.02, 0.07, 40]} />
        <meshStandardMaterial color="#c9a24b" metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius, radius, height + 0.02, 40, 1, true]} />
        <meshPhysicalMaterial
          color="#e8f2f4"
          transparent
          opacity={0.22}
          roughness={0.05}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <Tag
        pos={[0, height + 0.25, 0]}
        text="Jar test"
        note="Shake a soil sample with water and let it stand: sand settles within a minute, silt within hours, and clay can take a day or more. Measuring each layer estimates the texture you can then read on the triangle."
        occlude={false}
      />
    </group>
  );
}
