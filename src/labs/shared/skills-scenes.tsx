import { useMemo, useEffect } from "react";
import { useTexture } from "@react-three/drei";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "./science-kit";
import { Tag } from "./kit";
import { projectedPosition, geographicCircle } from "../map-projections/projection";

/** Fictional relief for the coordinate exercise (u east, v south, both 0–1). */
function surveyHeight(u: number, v: number) {
  return (
    1.1 * Math.exp(-((u - 0.68) ** 2 * 9 + (v - 0.35) ** 2 * 13)) +
    0.6 * Math.exp(-((u - 0.28) ** 2 * 18 + (v - 0.72) ** 2 * 9))
  );
}
const RELIEF = 0.5;
/** World height of the relief map at a grid position (x east, z south, ±2). */
function mapHeight(x: number, z: number) {
  return surveyHeight((x + 2) / 4, (z + 2) / 4) * RELIEF;
}

/** Fictional map sheet in Ordnance Survey style, not a field photograph. */
function SurveyPaper() {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1024;
    const c = canvas.getContext("2d")!;
    c.fillStyle = "#e4dfc4";
    c.fillRect(0, 0, 1024, 1024);
    // Woodland
    c.fillStyle = "#a9cc85";
    for (const [x, y, rx, ry, a] of [
      [180, 300, 120, 70, 0.4],
      [820, 760, 140, 90, -0.3],
      [520, 880, 90, 50, 0.1],
      [880, 180, 70, 110, 0.6],
    ]) {
      c.beginPath();
      c.ellipse(x, y, rx, ry, a, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = "#9c5a26";
    for (let level = 0.12, k = 0; level < 1.1; level += 0.1, k++) {
      c.lineWidth = k % 5 === 4 ? 4 : 2.2;
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
          for (let k2 = 0; k2 < 4; k2++) {
            const a = corners[k2],
              b = corners[(k2 + 1) % 4],
              ha = surveyHeight(a[0], a[1]),
              hb = surveyHeight(b[0], b[1]);
            if (ha < level !== hb < level) {
              const f = (level - ha) / (hb - ha);
              cross.push([(a[0] + (b[0] - a[0]) * f) * 1024, (a[1] + (b[1] - a[1]) * f) * 1024]);
            }
          }
          for (let k2 = 1; k2 < cross.length; k2 += 2) {
            c.moveTo(cross[k2 - 1][0], cross[k2 - 1][1]);
            c.lineTo(cross[k2][0], cross[k2][1]);
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
    c.strokeStyle = "#2f7fae";
    c.lineWidth = 9;
    c.stroke();
    c.strokeStyle = "#8fc3df";
    c.lineWidth = 5;
    c.stroke();
    // A-road with casing
    c.beginPath();
    c.moveTo(0, 180);
    c.bezierCurveTo(400, 150, 580, 420, 1024, 380);
    c.strokeStyle = "#7b5a2e";
    c.lineWidth = 10;
    c.stroke();
    c.strokeStyle = "#f2b13c";
    c.lineWidth = 6;
    c.stroke();
    // Settlements
    c.fillStyle = "#4a4440";
    for (const [x, y] of [
      [300, 175],
      [318, 190],
      [290, 196],
      [640, 330],
      [655, 345],
      [470, 640],
      [455, 655],
      [488, 652],
    ])
      c.fillRect(x, y, 11, 9);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <meshStandardMaterial map={texture} roughness={0.95} />;
}

/** Map sheet raised into a relief model: same contours, now visible as landforms. */
function ReliefSheet() {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(4, 4, 160, 160),
      p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      // Plane local +y becomes world −z (north) after the −90° rotation about X.
      p.setZ(i, mapHeight(p.getX(i), -p.getY(i)));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <SurveyPaper />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <boxGeometry args={[4, 0.1, 4]} />
        <meshStandardMaterial color="#d9d3bb" roughness={0.9} />
      </mesh>
    </>
  );
}

function drape(a: [number, number], b: [number, number], lift = 0.012, n = 48) {
  return Array.from({ length: n + 1 }, (_, i): [number, number, number] => {
    const x = a[0] + ((b[0] - a[0]) * i) / n,
      z = a[1] + ((b[1] - a[1]) * i) / n;
    return [x, mapHeight(x, z) + lift, z];
  });
}

export function GridReferenceScene() {
  const { params } = useLabControls(),
    e = Math.round(params.easting ?? 246),
    n = Math.round(params.northing ?? 513),
    x = -2 + (e / 1000) * 4,
    z = 2 - (n / 1000) * 4,
    y = mapHeight(x, z);
  return (
    <>
      <ScienceStudio
        slug="grid-references"
        scale="Local 100 km square · eastings first, then northings · relief exaggerated"
        trueScale="Planar grid scale equal on both axes · fictional local square"
        camera={[0, 5.5, 3.8]}
        horizon
      >
        <ReliefSheet />
        {Array.from({ length: 11 }, (_, i) => (
          <group key={i}>
            <Line
              points={drape([-2 + i * 0.4, -2], [-2 + i * 0.4, 2])}
              color="#3d6fa1"
              transparent
              opacity={0.55}
            />
            <Line
              points={drape([-2, -2 + i * 0.4], [2, -2 + i * 0.4])}
              color="#3d6fa1"
              transparent
              opacity={0.55}
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
          points={[...drape([-2, 2], [x, 2], 0.03), ...drape([x, 2], [x, z], 0.03)]}
          color="#e8613a"
          lineWidth={3}
        />
        <mesh position={[x, y + 0.06, z]}>
          <sphereGeometry args={[0.065, 24, 16]} />
          <meshStandardMaterial color="#e8613a" />
        </mesh>
        {/* North arrow and 10 km scale bar beside the sheet */}
        <group position={[2.45, 0.02, -1.6]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.12, 0.42, 3]} />
            <meshStandardMaterial color="#2d2a26" />
          </mesh>
          <Tag pos={[0, 0.05, -0.42]} text="N" occlude={false} />
        </group>
        <Line
          points={[
            [0.8, 0.02, 2.5],
            [1.2, 0.02, 2.5],
          ]}
          color="#2d2a26"
          lineWidth={4}
        />
        <Line
          points={[
            [1.2, 0.02, 2.5],
            [1.6, 0.02, 2.5],
          ]}
          color="#9b958b"
          lineWidth={4}
        />
        <Tag pos={[1.2, 0.02, 2.75]} text="10 km" occlude={false} />
        <Tag
          pos={[x, y + 0.42, z]}
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
          "km north. Each slider step is 100 m; grid lines are 10 km apart. Brown contours, woodland, river, road and villages are fictional landmarks; the relief is exaggerated so the contours read as hills. A British National Grid reference also needs its 100 km letter pair."
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
        {/* The mapped surface stops at ±85°; close the poles while it is still a globe. */}
        {morph < 0.02 &&
          [1, -1].map((pole) => (
            <mesh
              key={pole}
              position={[0, pole * 1.4 * Math.sin((85 * Math.PI) / 180), 0]}
              rotation={[(-pole * Math.PI) / 2, 0, 0]}
            >
              <circleGeometry args={[1.4 * Math.cos((85 * Math.PI) / 180) * 1.02, 48]} />
              <meshBasicMaterial color={pole > 0 ? "#dfe7ea" : "#eef2f3"} side={THREE.DoubleSide} />
            </mesh>
          ))}
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
