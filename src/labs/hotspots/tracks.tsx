import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { RockPrism } from "../shared/rock-prism";
import { RockMaterial } from "../shared/rock-material";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand } from "../shared/natural-world";
function Track({ continental, z, t }: { continental: boolean; z: number; t: number }) {
  const top = continental ? 0.45 : 0.1,
    base = continental ? -0.2 : -0.08;
  const height = useMemo(
    () => (x: number, z: number) => {
      let h = top;
      for (let i = 0; i < 5; i++) {
        const dx = x - (-1.8 + i * 0.88),
          r = Math.hypot(dx, z);
        h += continental
          ? 0.11 * Math.exp(-(((r - 0.3) / 0.13) ** 2)) - 0.045 * Math.exp(-((r / 0.25) ** 4))
          : (0.58 - 0.08 * i) * Math.exp(-((r / (0.55 + 0.03 * i)) ** 2));
      }
      return h;
    },
    [continental, top],
  );
  const colour = useMemo(
    () => (x: number, y: number) =>
      continental ? (y > top + 0.045 ? "#837362" : "#52674e") : y > 0.21 ? "#52624c" : "#726953",
    [continental, top],
  );
  return (
    <group position={[0, 0, z]}>
      <group position={[0, 0, -0.45]}>
        <RockPrism
          points={[
            [-3, -1.7],
            [3, -1.7],
            [3, base],
            [-3, base],
          ]}
          depth={1.1}
          color="#6b6454"
        />
      </group>
      <mesh position={[-1.8, -0.8, 0]} scale={[0.48, 0.82, 0.48]}>
        <sphereGeometry args={[1, 64, 48]} />
        <RockMaterial color="#99785f" emissive="#725441" emissiveIntensity={0.06} />
      </mesh>
      <group position={[t * 0.65, 0, 0]}>
        <GeomorphicTerrain
          height={height}
          colour={colour}
          width={6}
          depth={2}
          base={base}
          material={continental ? "grass" : "rock"}
        />
        {continental && (
          <PlantStand
            kind="conifer"
            scale={0.16}
            positions={Array.from({ length: 12 }, (_, i) => {
              const x = -2.4 + (i % 6) * 0.8,
                z = i < 6 ? -0.76 : 0.76;
              return [x, height(x, z), z] as [number, number, number];
            })}
            seed={39}
          />
        )}
      </group>
      {!continental && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.18, 0]}>
          <planeGeometry args={[6, 2]} />
          <FlowWaterMaterial color="#376779" opacity={0.55} flow={[0.3, 0.15]} speed={0.4} />
        </mesh>
      )}
      <Line
        points={[
          [-1.8, -0.18, 1.01],
          [-1.8, top + 0.15, 1.01],
        ]}
        color="#cb8e59"
        lineWidth={2}
      />
      <Arrow from={[-1.6, top + 0.85, 0]} to={[1.6, top + 0.85, 0]} color="#d7bc88" />
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[-2.7 + ((t + i / 9) % 1) * 5.4, base + 0.025, 1.025]}>
          <sphereGeometry args={[0.027, 12, 8]} />
          <meshBasicMaterial color="#e5c993" />
        </mesh>
      ))}
      <Tag
        pos={[-2.1, top + 1.2, -0.9]}
        text={continental ? "Yellowstone · NE" : "Hawaiʻi · SE"}
        note={
          continental
            ? "Young end of the Yellowstone volcanic track. Its older volcanic centres extend southwest along the Snake River Plain. The three large caldera-forming eruptions at Yellowstone are not the entire hotspot history."
            : "The southeastern end includes active Hawaiian volcanism. Kauaʻi, to the northwest, preserves rocks about 5–5.5 million years old. Not every volcano at a given island is the same age."
        }
        occlude={false}
      />
      <Tag
        pos={[2, top + 0.8, 0.6]}
        text={continental ? "Older · SW" : "Older · NW"}
        note={
          continental
            ? "The southwest end of the recognised Yellowstone track reaches roughly 17 Ma. These five illustrated depressions are symbols, not surveyed caldera outlines or an eruption sequence."
            : "Kauaʻi provides an approximately 5.5 Ma reference at the northwestern end of the main island comparison. The full Hawaiian–Emperor chain is much longer and older. These volcanic shapes are not island coastlines."
        }
        occlude={false}
      />
      <Tag
        pos={[-1.8, -1.25, 1.05]}
        text="Hot, mostly solid mantle"
        note="A plume hypothesis involves an upwelling thermal anomaly in mostly solid mantle. Partial melting can occur during ascent; this is not a hollow pipe or a column of liquid magma. Geometry and thermal colour are schematic."
        occlude={false}
      />
    </group>
  );
}
export default function Hotspots() {
  const { params, t } = useLabControls();
  useLabTick(1 / 30);
  const hawaii = params.hawaii > 0.5,
    yellowstone = params.yellowstone > 0.5,
    both = hawaii && yellowstone;
  return (
    <>
      <ScienceStudio
        slug="hotspots"
        camera={[5, 4, 8]}
        scale="Independent hotspot sections · age direction is geographic · geometry not to scale"
        trueScale="No surveyed depth or distance scale · plate thickness and thermal anomalies are schematic"
      >
        {hawaii && <Track continental={false} z={both ? -1.7 : 0} t={t} />}{" "}
        {yellowstone && <Track continental z={both ? 1.7 : 0} t={t} />}
        {!hawaii && !yellowstone && (
          <Tag
            pos={[0, 0, 0]}
            text="Choose a hotspot"
            note="Enable Hawaiʻi or Yellowstone in the controls to compare an oceanic and a continental setting."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {hawaii
          ? "Hawaiʻi's volcanic islands become older towards the northwest; Kauaʻi is about 5.5 Ma old. "
          : ""}
        {yellowstone
          ? "Yellowstone's volcanic track extends about 17 Ma into the past, with older sites towards the southwest. "
          : ""}
        {!hawaii && !yellowstone
          ? "Select Hawaiʻi, Yellowstone or both to compare their volcanic tracks."
          : "Press Play to follow plate motion above each hotspot."}
        <br />
        {
          "Each section shows the plate moving over a fixed thermal anomaly, without an assigned travel rate. Right is northwest for Hawaiʻi and southwest for Yellowstone."
        }
      </ScienceReadout>
    </>
  );
}
