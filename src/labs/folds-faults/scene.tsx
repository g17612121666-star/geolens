import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { foldedBed, faultBed, faultSlip } from "./geometry";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { SectionMaterial } from "../shared/section-material";
import { useSectionUniforms } from "../shared/section-utils";

const LITHOLOGY = [
  "Conglomerate",
  "Cross-bedded sandstone",
  "Shale",
  "Jointed limestone",
  "Red siltstone",
];

/** Five lithologies, oldest at the base. Laminae follow the restored bedding, so they fold. */
const BED_GLSL = `uniform float uBed,uAmp,uShort,uSign,uFold;
float level(vec3 p){
  if(uFold>.5){float u=p.x/uShort;return (p.y-uSign*uAmp*exp(-u*u/1.9))*uShort+1.1;}
  return p.y+1.1;
}
vec3 sectionColour(vec3 p,vec3 w){
  float L=level(p),b=L-uBed*.35;
  vec2 q=vec2(p.x+p.z*.7,L);
  float g=grain(q);
  int bed=int(uBed+.5);
  vec3 c;
  if(bed==0){
    vec2 cell=floor(q*22.),f=fract(q*22.)-.5;
    vec2 jit=vec2(sHash(cell+3.),sHash(cell+7.))-.5;
    float peb=smoothstep(.42,.3,length(f+.25*jit))*step(.3,sHash(cell));
    c=mix(vec3(.56,.47,.38),mix(vec3(.80,.77,.70),vec3(.42,.38,.37),sHash(cell+1.)),peb)*(.9+.2*g);
  }else if(bed==1){
    float set_=floor(b*8.),lam=fract((b+.06*fract(q.x*1.3+set_*.37))*70.);
    c=mix(vec3(.88,.76,.52),vec3(.74,.60,.38),smoothstep(.35,.65,lam))*(.9+.2*g);
    c*=mix(.82,1.,smoothstep(0.,.02,fract(b*8.)));
  }else if(bed==2){
    c=mix(vec3(.40,.44,.41),vec3(.30,.33,.31),step(.5,fract(b*140.)))*(.92+.16*g);
  }else if(bed==3){
    c=mix(vec3(.80,.80,.76),vec3(.68,.69,.67),g);
    c*=mix(.72,1.,smoothstep(0.,.012,abs(fract(b*14.)-.5)*2.));
    c*=mix(.7,1.,smoothstep(0.,.025,abs(fract(q.x*3.+.4*floor(b*14.))-.5)));
    float fossil=step(.985,sHash(floor(q*90.)));c=mix(c,vec3(.93,.92,.86),fossil);
  }else{
    c=mix(vec3(.68,.38,.29),vec3(.56,.30,.23),step(.5,fract(b*36.)))*(.9+.2*g);
    if(b>.325)c=mix(vec3(.40,.50,.24),vec3(.30,.40,.18),sNoise(q*30.));
    else if(b>.3)c=mix(vec3(.45,.33,.23),vec3(.36,.26,.18),g);
  }
  return c*mix(.6,1.,smoothstep(0.,.006,min(b,.35-b)));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

function Bed({
  geometry,
  index,
  fold,
  amplitude,
  syncline,
  position,
}: {
  geometry: THREE.BufferGeometry;
  index: number;
  fold: boolean;
  amplitude: number;
  syncline: boolean;
  position: [number, number, number];
}) {
  const uniforms = useSectionUniforms({
    uBed: index,
    uAmp: amplitude,
    uShort: 1 - 0.25 * amplitude,
    uSign: syncline ? -1 : 1,
    uFold: fold ? 1 : 0,
  });
  return (
    <mesh geometry={geometry} position={position} castShadow receiveShadow>
      <SectionMaterial
        glsl={BED_GLSL}
        uniforms={uniforms}
        cacheKey="folds-beds-v1"
        roughness={0.95}
      />
    </mesh>
  );
}

/** A road across the block: continuous before deformation, so its offset shows the slip. */
function Road({
  from,
  to,
  y,
  z,
  offset,
}: {
  from: number;
  to: number;
  y: (x: number) => number;
  z: number;
  offset: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const n = 40,
      pos: number[] = [],
      idx: number[] = [];
    for (let i = 0; i <= n; i++) {
      const x = from + ((to - from) * i) / n;
      pos.push(x, y(x) + 0.006, z - 0.07, x, y(x) + 0.006, z + 0.07);
      if (i < n) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [from, to, y, z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <group position={offset}>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#4b4b4d" roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <Line
        points={Array.from({ length: 21 }, (_, i) => {
          const x = from + ((to - from) * i) / 20;
          return [x, y(x) + 0.009, z] as [number, number, number];
        })}
        color="#f2e7c4"
        lineWidth={1.2}
        dashed
        dashSize={0.06}
        gapSize={0.05}
      />
    </group>
  );
}

export default function FoldsFaults() {
  const { params, explode, t } = useLabControls();
  useLabTick(1 / 40);
  const kind = params.structure ?? 0,
    amount = t,
    fold = kind < 2,
    syncline = kind === 1,
    slip = faultSlip(kind, amount * 0.7),
    separation = explode * 0.6,
    shortening = 1 - 0.25 * amount;
  const foldAmount = fold ? amount : 0;
  const beds = useMemo(
    () =>
      fold
        ? Array.from({ length: 5 }, (_, i) => foldedBed(i, foldAmount, syncline))
        : Array.from({ length: 10 }, (_, i) => faultBed(i % 5, i >= 5, kind === 4)),
    [fold, kind, syncline, foldAmount],
  );
  useEffect(() => () => beds.forEach((g) => g.dispose()), [beds]);
  const foldTop = useMemo(
    () => (x: number) =>
      0.65 / shortening +
      (syncline ? -1 : 1) * amount * Math.exp(-((x / shortening) ** 2) / 1.9) +
      4 * separation * 0.2,
    [shortening, syncline, amount, separation],
  );
  const flat = useMemo(() => () => 0.65, []);
  const [slipX, slipY, slipZ] = slip;
  const trees = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 26; i++) {
      const x = -2.4 + ((i * 0.618034) % 1) * 4.8,
        z = (i % 2 ? 1 : -1) * (0.55 + 0.4 * ((i * 0.7548777) % 1));
      if (fold) out.push([x * shortening, foldTop(x * shortening) - 0.004, z]);
      else if (x < -0.15) out.push([x - separation, 0.646, z]);
      else if (x > 0.25) out.push([x + separation + slipX, 0.646 + slipY, z + slipZ]);
    }
    return out;
  }, [fold, shortening, foldTop, separation, slipX, slipY, slipZ]);
  // Centre of the conglomerate at the left edge of the front face, so its label stays on it.
  const oldestTag: [number, number, number] = fold
    ? [
        -2.6 * shortening - 0.35,
        -0.925 / shortening + (syncline ? -1 : 1) * amount * Math.exp(-6.76 / 1.9),
        1.15,
      ]
    : [-2.95 - separation, -0.925, 1.15];
  const faultX = (y: number) => (kind === 4 ? 0 : (0.65 - y) / Math.tan(Math.PI / 3));
  return (
    <>
      <ScienceStudio
        slug="folds-faults"
        camera={[3.2, 2.6, 7]}
        scale="Equal geometric scales · five lithologies mark relative ages · trees and road not to scale"
        trueScale="1 scene unit = 1 km · any exploded gaps are for inspection only"
      >
        {beds.map((g, i) => {
          const right = !fold && i >= 5,
            index = i % 5,
            offset: [number, number, number] = fold
              ? [0, index * separation * 0.2, 0]
              : right
                ? [slip[0] + separation, slip[1], slip[2]]
                : [-separation, 0, 0];
          return (
            <Bed
              key={i}
              geometry={g}
              index={index}
              fold={fold}
              amplitude={amount}
              syncline={syncline}
              position={offset}
            />
          );
        })}
        <PlantStand kind="broadleaf" positions={trees} scale={0.12} seed={8} />
        {fold ? (
          <Road
            from={-2.55 * shortening}
            to={2.55 * shortening}
            y={foldTop}
            z={0.15}
            offset={[0, 0, 0]}
          />
        ) : (
          <>
            <Road
              from={-2.6}
              to={faultX(0.65) - 0.004}
              y={flat}
              z={0.15}
              offset={[-separation, 0, 0]}
            />
            <Road
              from={faultX(0.65) + 0.004}
              to={2.6}
              y={flat}
              z={0.15}
              offset={[slip[0] + separation, slip[1], slip[2]]}
            />
            <mesh
              position={[
                (faultX(-1.1) + faultX(0.65)) / 2 - separation + 0.004,
                (-1.1 + 0.65) / 2,
                0,
              ]}
              rotation={[0, 0, kind === 4 ? 0 : Math.PI / 6]}
            >
              <planeGeometry
                args={[0.012, kind === 4 ? 1.75 : 1.75 / Math.sin(Math.PI / 3), 1, 1]}
              />
              <meshBasicMaterial
                color="#5a2a1d"
                transparent
                opacity={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>
          </>
        )}
        {fold ? (
          <>
            <Line
              points={[
                [0, -1.2, 1.13],
                [0, 1.9, 1.13],
              ]}
              color="#acbab1"
              dashed
              dashSize={0.07}
              gapSize={0.06}
            />
            <Tag
              pos={[0, 2.25 + separation, 0]}
              text={kind === 0 ? "Anticline · older core" : "Syncline · younger core"}
              note="These beds are the right way up, so the oldest (conglomerate) is at the bottom. The age of the beds in the core decides anticline or syncline; an overturned fold cannot be named from its shape alone."
              occlude={false}
            />
          </>
        ) : (
          <>
            <Arrow
              from={[0.8 + separation, 1.2, 0]}
              to={[0.8 + separation + slip[0], 1.2 + slip[1], slip[2]]}
              color="#ddac83"
              width={1.4}
            />
            {kind === 4 ? (
              <Tag
                pos={[0, 1.5, 0]}
                text="Strike-slip · lateral offset"
                note="The road was straight before faulting. The right block moves along a vertical fault, so the road is offset sideways with no vertical step."
                occlude={false}
              />
            ) : (
              <>
                <Tag
                  pos={[-1.7 - separation, 1.15, 0]}
                  text="Footwall"
                  note="The footwall lies below the inclined fault plane. It is held fixed here so the hanging-wall displacement is easy to compare."
                  occlude={false}
                />
                <Tag
                  pos={[2.2 + separation + slipX, 1.15 + slipY, 0]}
                  text={kind === 2 ? "Hanging wall · down" : "Hanging wall · up"}
                  note="The hanging wall lies above the 60° dipping fault. Motion is parallel to that plane: down for normal faulting, up for reverse faulting. Match the beds across the fault to measure the throw."
                  occlude={false}
                />
              </>
            )}
          </>
        )}
        <Tag
          pos={oldestTag}
          text="Oldest · conglomerate"
          note={`Beds from oldest to youngest: ${LITHOLOGY.join(", ")}. Soil and grass cap the top. Patterns are illustrative textures, not mapped rock units.`}
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {
          [
            "Upright anticline",
            "Upright syncline",
            "Normal fault · extension",
            "Reverse fault · shortening",
            "Strike-slip fault",
          ][kind]
        }
        .{" "}
        {fold
          ? `Fold amplitude ${(amount * 1000).toFixed(0)} m; shortening ${(amount * 25).toFixed(0)}%, with bed volume preserved.`
          : `Relative slip ${(amount * 0.7 * 1000).toFixed(0)} m${kind === 4 ? "" : `; vertical throw ${Math.abs(slip[1] * 1000).toFixed(0)} m`}.`}
        <br />
        {
          "Press Play or drag Process to deform the section. Explode pulls beds or blocks apart for inspection; the gap is not a real canyon. The model shows structure, not stress or earthquake timing."
        }
      </ScienceReadout>
    </>
  );
}
