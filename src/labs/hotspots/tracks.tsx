import { useMemo } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { GeomorphicTerrain } from "../shared/geomorphic-terrain";
import { RockPrism } from "../shared/rock-prism";
import { Tag } from "../shared/kit";
import { FlowWaterMaterial } from "../shared/flow-water";
import { PlantStand } from "../shared/natural-world";
/** Thermal plume: a hot head and stem in mostly solid mantle, with sparse melt rising. */
function Plume({ base, t }: { base: number; t: number }) {
  return (
    <group position={[-1.8, 0, 0]}>
      <mesh position={[0, -0.95, 0]} scale={[0.5, 0.42, 0.5]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial
          color="#c9622c"
          emissive="#ff6a1f"
          emissiveIntensity={0.55}
          roughness={0.6}
          transparent
          opacity={0.88}
        />
      </mesh>
      <mesh position={[0, (base - 0.75) / 2, 0]}>
        <cylinderGeometry args={[0.13, 0.26, base + 0.75, 32, 1, true]} />
        <meshStandardMaterial
          color="#d97a38"
          emissive="#ff7a2a"
          emissiveIntensity={0.45}
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => {
        const f = (t * 2 + i / 6) % 1;
        return (
          <mesh
            key={i}
            position={[0.05 * Math.sin(i * 2.4), -0.9 + f * (base + 0.9), 0.05 * Math.cos(i * 1.7)]}
          >
            <sphereGeometry args={[0.03, 12, 8]} />
            <meshBasicMaterial color="#ffd27a" toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function Track({ continental, z, t }: { continental: boolean; z: number; t: number }) {
  const top = continental ? 0.45 : 0.1,
    base = continental ? -0.2 : -0.08;
  const height = useMemo(
    () => (x: number, z: number) => {
      let h = top;
      for (let i = 0; i < 5; i++) {
        const dx = x - (-1.8 + i * 0.88),
          r = Math.hypot(dx, z);
        // Oceanic: separate shield islands that subside and erode as they ride away from the
        // plume (youngest, tallest at the left); the oldest has sunk to a seamount.
        h += continental
          ? 0.11 * Math.exp(-(((r - 0.3) / 0.13) ** 2)) - 0.045 * Math.exp(-((r / 0.25) ** 4))
          : [0.66, 0.48, 0.32, 0.17, 0.06][i] *
            Math.exp(-((r / (0.3 + 0.035 * i)) ** 2)) *
            (1 - 0.18 * i * Math.max(0, Math.sin(Math.atan2(z, dx) * 3 + i)) ** 2);
      }
      return h;
    },
    [continental, top],
  );
  const colour = useMemo(
    () => (x: number, y: number) =>
      continental
        ? y > top + 0.045
          ? "#837362"
          : "#52674e"
        : y < 0.17
          ? "#6f6a5e"
          : y < 0.215
            ? "#d9c99a"
            : x < -1.25
              ? "#2f2c2a"
              : x < -0.4
                ? "#4f5f43"
                : "#5d7a45",
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
      <Plume base={base} t={t} />
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
          <FlowWaterMaterial color="#2f7590" opacity={0.62} flow={[0.3, 0.15]} speed={0.4} />
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
