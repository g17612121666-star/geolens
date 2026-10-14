import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { spreadingCrust } from "@/lib/spreading-science";
import { terrainBlockGeometry } from "../shared/science-geometry";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
export default function SeafloorSpreading() {
  const { t, params, trueScale } = useLabControls();
  useLabTick(1 / 40);
  const rate = params.rate ?? 25,
    age = 4 + t,
    exaggeration = trueScale ? 1 : 12,
    half = rate / 2;
  const geometry = useMemo(() => {
    const g = terrainBlockGeometry(
      (x) => (-spreadingCrust(x * 20, rate, 0).subsidenceM / 20000) * exaggeration,
      5,
      2.8,
      128,
      (-(1000 + 350 * Math.sqrt(50 / half)) / 20000) * exaggeration,
    );
    g.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3),
    );
    return g;
  }, [rate, exaggeration, half]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    const p = geometry.attributes.position,
      c = geometry.attributes.color,
      palette = [new THREE.Color("#b5a382"), new THREE.Color("#7bacab")];
    for (let i = 0; i < p.count; i++) {
      const colour = palette[spreadingCrust(p.getX(i) * 20, rate, age).polarity];
      c.setXYZ(i, colour.r, colour.g, colour.b);
    }
    c.needsUpdate = true;
  }, [geometry, rate, age]);
  return (
    <>
      <ScienceStudio
        slug="seafloor-spreading"
        camera={[2.2, 3.4, 6]}
        scale="Vertical dimensions ×12 · ocean removed · magnetic colours symbolic"
        trueScale="1 scene unit = 20 km · only an upper slice of crust is exposed"
      >
        <mesh geometry={geometry}>
          <RockMaterial
            attach="material-0"
            color="#ffffff"
            vertexColors
            roughness={1}
            envMapIntensity={0.1}
          />
          <RockMaterial attach="material-1" color="#746958" roughness={1} />
        </mesh>
        {[-1, 1].flatMap((side) =>
          Array.from({ length: 6 }, (_, i) => {
            const x = side * (0.35 + i * 0.35),
              y = (-spreadingCrust(x * 20, rate, 0).subsidenceM / 20000) * exaggeration + 0.008;
            return (
              <Line
                key={`${side}-${i}`}
                points={Array.from(
                  { length: 49 },
                  (_, j) =>
                    [x + 0.008 * Math.sin(j * 0.9 + i), y, -1.4 + (j / 48) * 2.8] as [
                      number,
                      number,
                      number,
                    ],
                )}
                color="#423f37"
                transparent
                opacity={0.65}
                lineWidth={1.5}
              />
            );
          }),
        )}
        <Line
          points={[
            [0, 0.006, -1.4],
            [0, 0.006, 1.4],
          ]}
          color="#daa079"
          lineWidth={3}
        />
        <Arrow from={[-0.2, 0.35, 0]} to={[-1, 0.35, 0]} color="#96d0cd" width={1.3} />
        <Arrow from={[0.2, 0.35, 0]} to={[1, 0.35, 0]} color="#96d0cd" width={1.3} />
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[
              (side * (0.2 + t) * half) / 20,
              (-spreadingCrust((0.2 + t) * half, rate, age).subsidenceM / 20000) * exaggeration +
                0.045,
              0,
            ]}
          >
            <sphereGeometry args={[0.045, 20, 16]} />
            <meshBasicMaterial color="#e9c885" />
          </mesh>
        ))}
        <mesh position={[0, (-0.09 * exaggeration) / 12, 0]}>
          <boxGeometry args={[0.035, (0.2 * exaggeration) / 12, 2.78]} />
          <RockMaterial color="#ac714a" emissive="#8d381d" emissiveIntensity={0.12} />
        </mesh>
        <FrontSection rate={rate} exaggeration={exaggeration} />
        <Tag
          pos={[0, 0.75, 0]}
          text="Ridge axis · age 0"
          note="Basalt forms at the spreading centre and moves away with each flank. Decompression generates partial melt below; it does not turn the whole mantle into a magma ocean."
          occlude={false}
        />
        <Tag
          pos={[-2.35, 0.25, 1.6]}
          text={`${(50 / half).toFixed(1)} Ma`}
          note="Age increases with distance from the axis: age = distance / half spreading rate. This ideal experiment has equal rates on both flanks."
          occlude={false}
        />
        <Tag
          pos={[2.35, 0.25, 1.6]}
          text={`${(50 / half).toFixed(1)} Ma`}
          note="A stripe of the same age is found at the same distance on the opposite flank. Its width depends on both reversal duration and spreading rate."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Full spreading rate "}
        {rate} {"mm/year · each flank "}
        {half.toFixed(1)} {"mm/year. Teal / sandstone: opposite remanent magnetic polarities."}
        <br />
        {
          "Play advances an invented reversal record through 1 Ma. It illustrates symmetry, not the real geomagnetic chronology. Subsidence follows an illustrative √age curve; relief is not a bathymetric survey."
        }
      </ScienceReadout>
    </>
  );
}

/**
 * Front cut face as an ocean-crust section: sediment thickening away from the axis
 * (older floor has had longer to collect it), pillow basalt over sheeted dykes over
 * gabbro, and a melt lens beneath the ridge. Thicknesses are schematic.
 */
function FrontSection({ rate, exaggeration }: { rate: number; exaggeration: number }) {
  const half = rate / 2,
    z = 1.403,
    surface = (x: number) => (-spreadingCrust(x * 20, rate, 0).subsidenceM / 20000) * exaggeration;
  const k = exaggeration / 12;
  const xs = useMemo(() => Array.from({ length: 101 }, (_, i) => -2.5 + (i / 100) * 5), []);
  const sediment = useMemo(() => {
    const shape = new THREE.Shape();
    const thick = (x: number) => Math.min(0.16, (Math.abs(x) * 20) / half / 28) * Math.max(k, 0.25);
    shape.moveTo(xs[0], surface(xs[0]));
    xs.forEach((x) => shape.lineTo(x, surface(x) + thick(x)));
    [...xs].reverse().forEach((x) => shape.lineTo(x, surface(x)));
    return new THREE.ShapeGeometry(shape);
  }, [xs, half, k, rate, exaggeration]);
  useEffect(() => () => sediment.dispose(), [sediment]);
  const band = (offset: number) =>
    xs.map((x) => [x, surface(x) - offset * Math.max(k, 0.25), z] as [number, number, number]);
  return (
    <group>
      <mesh geometry={sediment} position={[0, 0, z]}>
        <meshStandardMaterial color="#cdbb94" roughness={1} side={THREE.DoubleSide} />
      </mesh>
      {[0.035, 0.085].map((o, i) => (
        <Line
          key={o}
          points={band(o)}
          color={i ? "#c9b48c" : "#d8c7a2"}
          lineWidth={1.2}
          dashed={i === 1}
          dashSize={0.05}
          gapSize={0.03}
        />
      ))}
      <mesh
        position={[0, surface(0) - 0.12 * Math.max(k, 0.25), z + 0.001]}
        scale={[0.32, 0.05 * Math.max(k, 0.4), 1]}
      >
        <circleGeometry args={[1, 48]} />
        <meshBasicMaterial color="#ff8a3d" toneMapped={false} />
      </mesh>
      <Tag
        pos={[1.45, surface(1.45) - 0.32, z + 0.05]}
        text="Sediment thickens with age"
        note="Fine particles settle slowly onto the seafloor. Crust far from the ridge is older, so it carries a thicker blanket; at the axis there is almost none. Thickness is exaggerated."
        occlude={false}
      />
      <Tag
        pos={[0.55, surface(0) - 0.16 * Math.max(k, 0.25), z]}
        text="Melt lens"
        note="A thin, partly molten lens sits a few kilometres below many ridge axes and feeds the dykes and lava above it. Beneath it, the mantle is mostly solid."
        occlude={false}
      />
    </group>
  );
}
