import { useMemo, useEffect } from "react";
import { Line } from "@react-three/drei";
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
  return (
    <>
      <ScienceStudio
        slug="soil-texture"
        scale="USDA texture triangle · percentages sum to 100 · fine-earth fraction only"
        trueScale="Barycentric percentages are exact · slab thickness is a display aid"
        camera={[0, 5.4, 4.4]}
      >
        <mesh geometry={g}>
          <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.88} />
        </mesh>
        {[20, 40, 60, 80].map((v) => (
          <group key={v}>
            <Line points={[xyz(0, v), xyz(100 - v, v)]} color="#f4efe6" transparent opacity={0.3} />
            <Line points={[xyz(v, 0), xyz(v, 100 - v)]} color="#f4efe6" transparent opacity={0.3} />
          </group>
        ))}
        <mesh position={xyz(sand, clay)}>
          <sphereGeometry args={[0.055, 24, 16]} />
          <meshStandardMaterial color="#fff2d2" metalness={0.2} roughness={0.3} />
        </mesh>
        <group position={[0, 0, 1.75]}>
          {[
            { label: "Sand · grains", fraction: sand, x: -1.15 },
            { label: "Silt · grains", fraction: silt, x: 0 },
            { label: "Clay · plates", fraction: clay, x: 1.15 },
          ].map((sample, k) => (
            <group key={k} position={[sample.x, 0, 0]}>
              <mesh position={[0, -0.06, 0]}>
                <cylinderGeometry args={[0.39, 0.35, 0.1, 40]} />
                <meshStandardMaterial color="#6c695d" roughness={0.85} />
              </mesh>
              {k < 2 ? (
                <DebrisField
                  points={Array.from({ length: Math.round(sample.fraction * 0.8) }, (_, i) => {
                    const a = i * 2.399,
                      r = 0.31 * Math.sqrt((i + 0.5) / Math.max(1, sample.fraction * 0.8));
                    return [r * Math.cos(a), 0.018 + 0.02 * Math.sin(i * 3) ** 2, r * Math.sin(a)];
                  })}
                  size={k === 0 ? 0.038 : 0.021}
                  color={k === 0 ? "#c6b590" : "#b8a386"}
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
                      <cylinderGeometry args={[0.038, 0.038, 0.006, 6]} />
                      <meshStandardMaterial color="#aa8d70" roughness={0.85} />
                    </mesh>
                  );
                })
              )}
              <Tag
                pos={[0, 0.25, 0.4]}
                text={`${sample.fraction.toFixed(0)}% ${sample.label}`}
                note="Separate enlarged material samples show angular grains and platy clay particles. The trays use different magnifications; neither particle count nor displayed size is a measured soil sample. The percentage is the fine-earth mass fraction."
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
          note="Classifies particle sizes, not colour, fertility or organic content. Changing a fraction may reduce the other to keep the total at 100%."
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
      <mesh position={[0, y + (height - y) / 2, 0]}>
        <cylinderGeometry args={[radius * 0.96, radius * 0.96, height - y, 40]} />
        <meshStandardMaterial color="#9cc8d4" transparent opacity={0.35} roughness={0.1} />
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
