import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SOIL_PROFILES } from "@/lib/soil-profile-science";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { RockMaterial } from "../shared/rock-material";
import { RootNetwork, GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
export default function SoilProfile() {
  const { params } = useLabControls(),
    index = Math.round(params.profile ?? 0),
    profile = SOIL_PROFILES[index];
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1.6, 2, 1, 64, 120, 24);
    g.translate(0, -1, 0);
    const p = g.attributes.position,
      c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        z = p.getZ(i),
        depth = -p.getY(i) + 0.007 * Math.sin(x * 8 + z * 6),
        found = profile.horizons.findIndex((h) => depth <= h.bottom),
        j = found < 0 ? profile.horizons.length - 1 : found,
        h = profile.horizons[j],
        colour = new THREE.Color(h.colour);
      const above = profile.horizons[j - 1],
        width = index === 2 ? 0.1 : 0.012;
      if (above && depth - above.bottom < width)
        colour.lerp(new THREE.Color(above.colour), 0.5 * (1 - (depth - above.bottom) / width));
      const grain =
        1 + 0.055 * Math.sin(x * 51 + z * 29 + depth * 41) * Math.cos(x * 87 - depth * 71);
      colour.multiplyScalar(grain);
      c.set([colour.r, colour.g, colour.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    return g;
  }, [index]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <ScienceStudio
        slug="soil-profile"
        camera={[2, 1.4, 6]}
        scale="Illustrative 2 m profile · common geometric scale · no compulsory O–A–E–B–C sequence"
        trueScale="1 scene unit = 1 m · grains and roots enlarged for visibility"
      >
        <mesh geometry={geometry}>
          <RockMaterial
            map={null}
            color="#ffffff"
            vertexColors
            roughness={1}
            repeat={6}
            normalScale={new THREE.Vector2(0.15, 0.15)}
          />
        </mesh>
        <GrassPatch
          positions={Array.from({ length: 72 }, (_, i) => [
            -0.77 + random(i + 31) * 1.54,
            0.004,
            -0.46 + random(i + 301) * 0.92,
          ])}
          height={index === 1 ? 0.14 : 0.08}
        />
        {Array.from({ length: 11 }, (_, i) => (
          <RootNetwork
            key={i}
            x={-0.72 + random(i + 78) * 1.44}
            y={-0.008}
            z={0.515}
            depth={(index === 1 ? 0.65 : 0.32) * (0.55 + 0.45 * random(i + 710))}
            spread={0.07 + 0.035 * random(i + 128)}
            seed={i + index * 7}
          />
        ))}
        <DebrisField
          points={Array.from({ length: 90 }, (_, i) => [
            -0.76 + random(i + 29) * 1.52,
            -0.12 - random(i + 492) * 1.81,
            0.515,
          ])}
          size={0.02}
          color={profile.horizons[1].colour}
        />
        {index === 0 && (
          <DebrisField
            points={Array.from({ length: 28 }, (_, i) => [
              -0.74 + random(i + 701) * 1.48,
              0.013,
              -0.42 + random(i + 201) * 0.84,
            ])}
            size={0.034}
            color="#493b24"
          />
        )}
        {profile.horizons.map((h, i) => {
          const top = i ? profile.horizons[i - 1].bottom : 0,
            actualY = -(top + h.bottom) / 2,
            labelY = -0.05 - i * 0.58;
          return (
            <group key={h.code}>
              <Line
                points={[
                  [0.81, actualY, 0.51],
                  [1.18, labelY, 0.51],
                  [1.35, labelY, 0.51],
                ]}
                color="#a6b4a8"
              />
              <Tag
                pos={[1.85, labelY, 0.51]}
                text={`${h.code} · ${(top * 100).toFixed(0)}–${(h.bottom * 100).toFixed(0)} cm`}
                note={h.description}
                occlude={false}
              />
            </group>
          );
        })}
        <Line
          points={[
            [-0.95, 0, 0.55],
            [-0.95, -2, 0.55],
          ]}
          color="#d6c6a7"
        />
        {[0, 0.5, 1, 1.5, 2].map((d) => (
          <Line
            key={d}
            points={[
              [-1, -d, 0.55],
              [-0.9, -d, 0.55],
            ]}
            color="#d6c6a7"
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {profile.name}. {profile.context}
        <br />
        {
          "Depths are teaching examples, not a field survey. E (eluviated) and R (hard bedrock) are valid designations but are absent from these exposed examples. Select a horizon label for its meaning."
        }
      </ScienceReadout>
    </>
  );
}
