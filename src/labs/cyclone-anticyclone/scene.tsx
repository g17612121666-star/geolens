import { Line } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { pressureCentreFlow } from "@/lib/circulation-science";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { CloudVolume } from "../atmosphere-layers/weather-volumes";
import { TerrainMaterial } from "../shared/natural-world";
export default function PressureCentres() {
  const { params, t } = useLabControls();
  useLabTick(1 / 30);
  const high = params.anti > 0.5,
    south = params.sh > 0.5,
    spin = (high ? -1 : 1) * (south ? -1 : 1);
  return (
    <>
      <ScienceStudio
        slug="cyclone-anticyclone"
        camera={[1.4, 6.7, 6]}
        scale="Conceptual pressure centre · surface flow and vertical motion enlarged"
        trueScale="Kinematic illustration · arrow length is not a measured wind speed"
      >
        <mesh position={[0, -0.18, 0]}>
          <cylinderGeometry args={[3.4, 3.4, 0.3, 96]} />
          <TerrainMaterial kind="grass" color="#6f7e66" />
        </mesh>
        <PressureDisc high={high} />
        {[0.65, 1.25, 1.85, 2.45, 3.05].map((r, k) =>
          k % 2 ? null : (
            <Tag
              key={`p-${r}`}
              pos={[r * Math.cos(0.6 + k * 0.5), 0.05, -r * Math.sin(0.6 + k * 0.5)]}
              text={`${high ? 1036 - k * 6 : 976 + k * 8} hPa`}
              note={`Isobar: a line joining places with the same surface pressure (${high ? 1036 - k * 6 : 976 + k * 8} hPa in this illustrative pattern). ${high ? "Pressure is highest at the centre of the anticyclone." : "Pressure is lowest at the centre of the depression."}`}
              occlude={false}
            />
          ),
        )}
        {[0.65, 1.25, 1.85, 2.45, 3.05].map((r) => (
          <Line
            key={r}
            points={Array.from(
              { length: 129 },
              (_, i) =>
                [
                  r * Math.cos((i / 128) * Math.PI * 2),
                  0.01,
                  -r * Math.sin((i / 128) * Math.PI * 2),
                ] as [number, number, number],
            )}
            color={high ? "#c1b492" : "#829ea7"}
            lineWidth={1.3}
          />
        ))}
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2,
            r = 1.5 + (i % 2) * 1,
            e = r * Math.cos(a),
            n = r * Math.sin(a),
            v = pressureCentreFlow(e, n, high, south);
          return (
            <Arrow
              key={i}
              from={[e, 0.12, -n]}
              to={[e + v.east * 0.25, 0.12, -n - v.north * 0.25]}
              color={high ? "#dfbf85" : "#8ed0df"}
              width={1}
            />
          );
        })}
        {Array.from({ length: 30 }, (_, i) => {
          const u = (t + i / 30) % 1,
            r = high ? 0.4 + u * 2.6 : 3 - u * 2.6,
            a = spin * (u * 5 + i * 2.4);
          return (
            <mesh key={i} position={[r * Math.cos(a), 0.14, -r * Math.sin(a)]}>
              <sphereGeometry args={[0.035, 12, 8]} />
              <meshBasicMaterial color={high ? "#dfbf85" : "#8ed0df"} />
            </mesh>
          );
        })}
        {!high &&
          Array.from({ length: 14 }, (_, i) => {
            const u = (t + i / 14) % 1,
              r = 2.85 - u * 1.8,
              a = spin * (u * 5 + i * 2.4);
            return (
              <CloudVolume
                key={i}
                position={[r * Math.cos(a), 0.46 + 0.7 * u, -r * Math.sin(a)]}
                scale={[0.5, 0.25 + 0.35 * u, 0.48]}
                density={24}
                seed={i + 7}
                opacity={0.43}
              />
            );
          })}
        <Arrow
          from={[0, high ? 1.8 : 0.2, 0]}
          to={[0, high ? 0.2 : 1.8, 0]}
          color={high ? "#dfbf85" : "#8ed0df"}
          width={2}
        />
        {!high && (
          <>
            <Line
              points={[
                [0.2, 0.04, 0.3],
                [0.8, 0.04, 1.1],
                [0.9, 0.04, 2],
                [0.6, 0.04, 2.9],
              ]}
              color="#76bacd"
              lineWidth={3}
            />
            <Line
              points={[
                [0.2, 0.04, 0.3],
                [1, 0.04, 0.2],
                [1.9, 0.04, -0.05],
                [2.8, 0.04, -0.65],
              ]}
              color="#d59486"
              lineWidth={3}
            />
          </>
        )}
        <Tag
          pos={[0, 2.1, 0]}
          text={high ? "H · sinking" : "L · rising"}
          note="Surface convergence under a low is balanced by ascent and outflow aloft; surface divergence under a high is supplied by descent. The vertical arrow is exaggerated."
          occlude={false}
        />
        <Tag
          pos={[-2.5, 0.1, 2.6]}
          text={`${south ? "SH" : "NH"} · ${spin > 0 ? "anticlockwise" : "clockwise"}`}
          note="Viewed from above. Hemisphere reversal changes rotation, while a low still converges and a high still diverges near the surface."
          occlude={false}
        />
        {!high && (
          <Tag
            pos={[2.6, 0.1, 1.8]}
            text="Fronts · cold blue / warm coral"
            note="These two example surface traces identify a developing extratropical cyclone. They are not an eyewall, and real fronts are neither circular nor rigidly rotating spokes. Open Fronts for their vertical geometry."
            occlude={false}
          />
        )}
      </ScienceStudio>
      <ScienceReadout>
        {south ? "Southern" : "Northern"} {"hemisphere · "}
        {high
          ? "high pressure, surface divergence and subsidence"
          : "low pressure, surface convergence and ascent"}
        {". Spin is read from above."}
        <br />
        {high
          ? "Subsidence often suppresses deep cloud, but fog or low stratus may persist."
          : "Blue and coral traces mark example cold and warm fronts. This is an extratropical system, not a tropical eyewall."}{" "}
        {"Follow the parcels to connect surface convergence with rising air."}
      </ScienceReadout>
    </>
  );
}

/** Radial pressure shading: blue (low) or warm (high) at the centre, fading outwards. */
function PressureDisc({ high }: { high: boolean }) {
  const geometry = useMemo(() => {
    const g = new THREE.CircleGeometry(3.38, 96, 0, Math.PI * 2),
      p = g.attributes.position,
      colours = new Float32Array(p.count * 3),
      centre = new THREE.Color(high ? "#e5994f" : "#3f7fd0"),
      edge = new THREE.Color(high ? "#e8d3a6" : "#a9c8e2"),
      c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      c.copy(centre).lerp(edge, Math.min(1, Math.hypot(p.getX(i), p.getY(i)) / 3.38));
      colours.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(colours, 3));
    return g;
  }, [high]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
      <meshBasicMaterial vertexColors transparent opacity={0.45} depthWrite={false} />
    </mesh>
  );
}
