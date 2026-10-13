import { useMemo, useEffect } from "react";
import { useTexture } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "./science-kit";
import { Tag } from "./kit";
import { projectedPosition, geographicCircle } from "../map-projections/projection";

/** Fictional contour base for the coordinate exercise, not a field photograph. */
function SurveyPaper() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#899276";
    c.fillRect(0, 0, 1024, 1024);
    const height = (x: number, z: number) =>
      1.1 * Math.exp(-((x - 0.68) ** 2 * 9 + (z - 0.35) ** 2 * 13)) +
      0.6 * Math.exp(-((x - 0.28) ** 2 * 18 + (z - 0.72) ** 2 * 9));
    c.strokeStyle = "#5c6953";
    c.lineWidth = 1.3;
    for (let level = 0.12; level < 1.1; level += 0.1) {
      c.beginPath();
      const n = 100;
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const corners = [
              [x / n, y / n],
              [(x + 1) / n, y / n],
              [(x + 1) / n, (y + 1) / n],
              [x / n, (y + 1) / n],
            ],
            cross: number[][] = [];
          for (let k = 0; k < 4; k++) {
            const a = corners[k],
              b = corners[(k + 1) % 4],
              ha = height(...(a as [number, number])),
              hb = height(...(b as [number, number]));
            if (ha < level !== hb < level) {
              const f = (level - ha) / (hb - ha);
              cross.push([(a[0] + (b[0] - a[0]) * f) * 1024, (a[1] + (b[1] - a[1]) * f) * 1024]);
            }
          }
          for (let k = 1; k < cross.length; k += 2) {
            c.moveTo(cross[k - 1][0], cross[k - 1][1]);
            c.lineTo(cross[k][0], cross[k][1]);
          }
        }
      c.stroke();
    }
    c.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = i / 200,
        y = 0.6 + 0.09 * Math.sin(x * 8) + 0.045 * Math.sin(x * 18);
      i ? c.lineTo(x * 1024, y * 1024) : c.moveTo(x * 1024, y * 1024);
    }
    c.strokeStyle = "#294f5b";
    c.lineWidth = 14;
    c.stroke();
    c.strokeStyle = "#71a7ab";
    c.lineWidth = 8;
    c.stroke();
    c.strokeStyle = "#dbca9d";
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(0, 180);
    c.bezierCurveTo(400, 150, 580, 420, 1024, 380);
    c.stroke();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <meshStandardMaterial map={texture} roughness={0.95} />;
}

export function GridReferenceScene() {
  const { params } = useLabControls(),
    e = Math.round(params.easting ?? 246),
    n = Math.round(params.northing ?? 513),
    x = -2 + (e / 1000) * 4,
    z = 2 - (n / 1000) * 4;
  return (
    <>
      <ScienceStudio
        slug="grid-references"
        scale="Local 100 km square · eastings first, then northings · 100 m precision"
        trueScale="Planar grid scale equal on both axes · fictional local square"
        camera={[0, 5.5, 3.8]}
      >
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[4, 4]} />
          <SurveyPaper />
        </mesh>
        {Array.from({ length: 11 }, (_, i) => (
          <group key={i}>
            <Line
              points={[
                [-2 + i * 0.4, 0.01, -2],
                [-2 + i * 0.4, 0.01, 2],
              ]}
              color="#c2c9ba"
            />
            <Line
              points={[
                [-2, 0.01, -2 + i * 0.4],
                [2, 0.01, -2 + i * 0.4],
              ]}
              color="#c2c9ba"
            />
            {i % 2 === 0 && (
              <>
                <Tag
                  pos={[-2 + i * 0.4, 0.03, 2.25]}
                  text={String(i * 10).padStart(2, "0")}
                  occlude={false}
                />
                {i > 0 && (
                  <Tag
                    pos={[-2.3, 0.03, 2 - i * 0.4]}
                    text={String(i * 10).padStart(2, "0")}
                    occlude={false}
                  />
                )}
              </>
            )}
          </group>
        ))}
        <Line
          points={[
            [-2, 0.03, 2],
            [x, 0.03, 2],
            [x, 0.03, z],
          ]}
          color="#edb77f"
          lineWidth={3}
        />
        <mesh position={[x, 0.055, z]}>
          <sphereGeometry args={[0.065, 24, 16]} />
          <meshStandardMaterial color="#f4dac0" />
        </mesh>
        <Tag
          pos={[x, 0.4, z]}
          text={`${String(e).padStart(3, "0")} ${String(n).padStart(3, "0")}`}
          note="Six figures identify a 100 m grid square. The marker shows its southwest corner; it is not a surveyed point accurate to one metre."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {"Along first: "}
        {(e * 0.1).toFixed(1)} {"km east. Then up: "}
        {(n * 0.1).toFixed(1)}{" "}
        {
          "km north. Each slider step is 100 m; grid lines are 10 km apart. Contours, river and road provide fictional landmarks; the planar grid retains equal scale. A British National Grid reference also needs its 100 km letter pair."
        }
      </ScienceReadout>
    </>
  );
}

function ProjectionSurface({ morph, kind }: { morph: number; kind: number }) {
  const map = useTexture("/textures/earth-day.jpg");
  map.colorSpace = THREE.SRGBColorSpace;
  const g = useMemo(() => {
    const p: number[] = [],
      uv: number[] = [],
      idx: number[] = [],
      nx = 144,
      ny = 72;
    for (let j = 0; j <= ny; j++)
      for (let i = 0; i <= nx; i++) {
        const lon = -180 + (i / nx) * 360,
          lat = -85 + (j / ny) * 170;
        p.push(...projectedPosition(lat, lon, morph, kind));
        uv.push(i / nx, (lat + 90) / 180);
        if (i < nx && j < ny) {
          const a = j * (nx + 1) + i;
          idx.push(a, a + 1, a + nx + 1, a + 1, a + nx + 2, a + nx + 1);
        }
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }, [morph, kind]);
  useEffect(() => () => g.dispose(), [g]);
  return (
    <mesh geometry={g}>
      <meshBasicMaterial map={map} side={THREE.DoubleSide} />
    </mesh>
  );
}
export function ProjectionScene() {
  const { params } = useLabControls(),
    morph = params.morph ?? 0,
    kind = Math.round(params.projection ?? 0),
    names = ["Mercator", "Lambert cylindrical equal-area", "Winkel I compromise"];
  return (
    <>
      <ScienceStudio
        slug="map-projections"
        scale="Globe → flat map · ±85° latitude · projection distorts length, shape or area"
        trueScale="No flat world map preserves all distances, shapes and areas"
        camera={[0, 1, 6]}
      >
        <ProjectionSurface morph={morph} kind={kind} />
        {[-60, -30, 0, 30, 60].map((lat) => (
          <Line
            key={`lat-${lat}`}
            points={Array.from({ length: 181 }, (_, i) => {
              const p = projectedPosition(lat, -180 + i * 2, morph, kind);
              return [
                p[0] * (1.003 - morph * 0.003),
                p[1] * (1.003 - morph * 0.003),
                p[2] * 1.003 + 0.004 * morph,
              ] as [number, number, number];
            })}
            color="#d8d6bc"
            transparent
            opacity={0.55}
            lineWidth={0.8}
          />
        ))}
        {[-120, -60, 0, 60, 120].map((lon) => (
          <Line
            key={`lon-${lon}`}
            points={Array.from({ length: 86 }, (_, i) => {
              const p = projectedPosition(-85 + i * 2, lon, morph, kind);
              return [p[0] * 1.003, p[1] * 1.003, p[2] * 1.003 + 0.004 * morph] as [
                number,
                number,
                number,
              ];
            })}
            color="#d8d6bc"
            transparent
            opacity={0.55}
            lineWidth={0.8}
          />
        ))}
        {[-60, 0, 60].flatMap((lat) =>
          [-120, 0, 120].map((lon) => (
            <Line
              key={`${lat}-${lon}`}
              points={geographicCircle(lat, lon).map(([p, l]) => {
                const v = projectedPosition(p, l, morph, kind);
                return [v[0] * 1.005, v[1] * 1.005, v[2] * 1.005 + 0.008 * morph] as [
                  number,
                  number,
                  number,
                ];
              })}
              color="#f1c784"
              lineWidth={2}
            />
          )),
        )}
      </ScienceStudio>
      <ScienceReadout>
        {names[kind]} · {Math.round(morph * 100)}
        {"% unfolded. "}
        {kind === 0
          ? "Mercator is conformal locally; area grows strongly towards the poles."
          : kind === 1
            ? "Equal area is preserved in the fully flat view; shapes are distorted."
            : "This compromise balances several distortions; it is not equal-area or conformal."}{" "}
        {
          "Gold circles start with the same angular radius on the globe; compare their shape and area on the flat map. Intermediate shapes are a visual interpolation."
        }
      </ScienceReadout>
    </>
  );
}
