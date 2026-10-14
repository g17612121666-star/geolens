import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { TerrainMaterial } from "../shared/natural-world";
import { GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { RockPrism } from "../shared/rock-prism";
import { RockMaterial } from "../shared/rock-material";
import { WaterPrism } from "../shared/water-prism";
import { Tag } from "../shared/kit";
const CELLS = [
  [0, 0],
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];
function PolygonGround({ x, z, growth }: { x: number; z: number; growth: number }) {
  const geometry = useMemo(() => {
    const points = Array.from({ length: 6 }, (_, j) => {
      const a = (j * Math.PI) / 3,
        px = x + 1.1 * Math.cos(a),
        pz = z + 1.1 * Math.sin(a),
        d = 0.035 * Math.sin(px * 4.1 + pz * 2.7);
      return new THREE.Vector2(
        (1.1 - 0.02 - 0.035 * growth) * Math.cos(a) + d,
        (1.1 - 0.02 - 0.035 * growth) * Math.sin(a) + d,
      );
    });
    const shape = new THREE.Shape(points),
      g = new THREE.ExtrudeGeometry(shape, {
        depth: 0.33,
        bevelEnabled: true,
        bevelSize: 0.045,
        bevelThickness: 0.04,
        bevelSegments: 3,
      });
    g.rotateX(Math.PI / 2);
    return g;
  }, [x, z, growth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <TerrainMaterial kind="soil" color="#968869" />
    </mesh>
  );
}
export default function Periglacial() {
  const { params, t } = useLabControls();
  useLabTick(1 / 50);
  const growth = params.cycles ?? 0.45,
    view = Math.round(params.view ?? 0),
    width = 0.1 + 0.8 * growth,
    thaw = 0.7 * Math.max(0, Math.sin(t * 2 * Math.PI)),
    winter = t > 0.55;
  return (
    <>
      <ScienceStudio
        slug="periglacial"
        camera={view === 0 ? [3.2, 3.4, 7.4] : [3.4, 5, 6]}
        scale={
          view === 0
            ? "10 m wide, 5 m deep · prescribed 0.7 m active layer · common scale"
            : "Ice-wedge polygon network · ideal topology, not a field survey"
        }
        trueScale={
          view === 0
            ? "1 scene unit = 1 m · no vertical exaggeration"
            : "Polygon spacing is illustrative · cracks enlarged for clarity"
        }
      >
        {view === 0 ? (
          <>
            <RockPrism
              points={[
                [-5, 0],
                [0, 0],
                [0, -0.75],
                [-width / 2, -0.75],
                [0, -3.8],
                [0, -5],
                [-5, -5],
              ]}
              depth={2}
              color="#9a8b72"
            />
            <RockPrism
              points={[
                [0, 0],
                [5, 0],
                [5, -5],
                [0, -5],
                [0, -3.8],
                [width / 2, -0.75],
                [0, -0.75],
              ]}
              depth={2}
              color="#9a8b72"
            />
            <WaterPrism
              points={[
                [-width / 2, -0.75],
                [width / 2, -0.75],
                [0, -3.8],
              ]}
              depth={2.02}
              colour="#9dcbdc"
              opacity={1}
            />
            {[0.18, 0.32, 0.48, 0.64, 0.8].map((f, i) => (
              <Line
                key={i}
                points={[
                  [(-width / 2) * f, -0.75, 1.025],
                  [0, -3.8 + (1 - f) * 2.6, 1.025],
                  [(width / 2) * f, -0.75, 1.025],
                ]}
                color={i % 2 ? "#739ead" : "#c5e0e4"}
                lineWidth={0.8}
              />
            ))}
            <GrassPatch
              positions={Array.from({ length: 50 }, (_, i) => [
                -4.8 + (i % 25) * 0.4,
                0,
                i < 25 ? -0.65 : 0.65,
              ])}
              height={0.045}
              color={winter ? "#a89c7b" : "#858b56"}
            />
            <DebrisField
              points={Array.from({ length: 72 }, (_, i) => [
                -4.8 + (i % 18) * 0.56,
                -0.12 - Math.floor(i / 18) * 0.45,
                1.025,
              ])}
              size={0.035}
            />
            {thaw > 0.002 && (
              <mesh position={[0, -thaw / 2, 1.012]}>
                <planeGeometry args={[10, thaw]} />
                <meshBasicMaterial color="#b89261" transparent opacity={0.4} depthWrite={false} />
              </mesh>
            )}
            <Line
              points={[
                [-5, -0.7, 1.03],
                [5, -0.7, 1.03],
              ]}
              color="#c6b693"
              dashed
              dashSize={0.1}
              gapSize={0.08}
            />
            {winter && (
              <Line
                points={[
                  [0, 0, 1.035],
                  [0.015, -0.4, 1.035],
                  [0, -1.9, 1.035],
                ]}
                color="#171d24"
                lineWidth={2}
              />
            )}
            <Tag
              pos={[-2.7, 0.65, 0]}
              text={thaw > 0.002 ? `Seasonal thaw · ${thaw.toFixed(2)} m` : "Seasonal layer frozen"}
              note="Seasonal thaw reaches the selected maximum depth of 0.7 m, marked by the dashed line."
              occlude={false}
            />
            <Tag
              pos={[2.7, -2, 1.2]}
              text="Permafrost"
              note="Permafrost is ground remaining at or below 0 °C for at least two consecutive years; it is not necessarily pure ice. This section assumes established permafrost below the active layer."
              occlude={false}
            />
            <Tag
              pos={[-2.6, -3.8, 1.2]}
              text={`Ice wedge · ${width.toFixed(2)} m at top`}
              note="Winter thermal contraction opens cracks. Water entering them can refreeze and add ice veins over repeated years. This differs from simply expanding all water by 9%, and from a glacier eroding a valley."
              occlude={false}
            />
          </>
        ) : (
          <>
            {CELLS.map(([q, r], i) => {
              const x = q * 1.65,
                z = (r + q / 2) * Math.sqrt(3) * 1.1;
              return (
                <group key={i} position={[x, 0, z]}>
                  <PolygonGround x={x} z={z} growth={growth} />
                  <GrassPatch
                    positions={Array.from({ length: 13 }, (_, j) => {
                      const a = j * 2.399,
                        r = 0.2 + 0.55 * Math.sin(j * 3) ** 2;
                      return [r * Math.cos(a), 0.047, r * Math.sin(a)];
                    })}
                    height={0.07}
                    color={winter ? "#9f9374" : "#788058"}
                  />
                  <Line
                    points={Array.from({ length: 7 }, (_, j): [number, number, number] => [
                      1.1 * Math.cos((j * Math.PI) / 3),
                      0.004,
                      1.1 * Math.sin((j * Math.PI) / 3),
                    ])}
                    color={winter ? "#344451" : "#80b8c6"}
                    lineWidth={1 + growth * 2}
                  />
                </group>
              );
            })}
            <Tag
              pos={[0, 1, 0]}
              text="Thermal-contraction polygon network"
              note="This seven-cell pattern with uneven margins shows the topology of an ice-wedge network. Natural polygons are irregular. Lines locate wedge margins below the surface; they are not a layer of exposed blue ice covering the ground."
              occlude={false}
            />
          </>
        )}
      </ScienceStudio>
      <ScienceReadout>
        {winter
          ? "Winter phase: frozen ground can contract and crack."
          : thaw > 0.002
            ? "Thaw-season phase: the active layer thaws above permafrost."
            : "Seasonal transition."}{" "}
        {"Long-term wedge development "}
        {(growth * 100).toFixed(0)}%.
        <br />
        {
          "Play follows a prescribed year; Wedge development compares accumulated growth without assigning a rate. Ice-wedge polygons differ from frost-sorted stone circles. Neither requires a glacier on the spot."
        }
      </ScienceReadout>
    </>
  );
}
