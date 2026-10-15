import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Line } from "@react-three/drei";
import { SOIL_PROFILES } from "@/lib/soil-profile-science";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { SectionMaterial } from "../shared/section-material";
import { RootNetwork, GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
const hex = (h: string) => {
  const c = new THREE.Color(h);
  // Work in sRGB like CSS hex; SectionMaterial converts to linear.
  const [r, g, b] = [c.r, c.g, c.b].map((v) => Math.pow(v, 1 / 2.2));
  return `vec3(${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)})`;
};
/** Structure drawn for each horizon type: litter, crumb, blocky peds or stony parent material. */
const kindOf = (code: string) =>
  code[0] === "O" ? 0 : code[0] === "A" ? 1 : code[0] === "B" ? 2 : 3;

/** A section shader for one profile: wavy horizon boundaries, structure, roots and burrows. */
function profileGlsl(index: number) {
  const { horizons } = SOIL_PROFILES[index],
    blend = index === 2 ? 0.08 : 0.018,
    rootDepth = index === 1 ? 0.65 : 0.35;
  const colour = horizons
    .map((h, i) =>
      i === 0
        ? `vec3 c=${hex(h.colour)};int kind=${kindOf(h.code)};`
        : `{float t=smoothstep(${(horizons[i - 1].bottom - blend).toFixed(3)},${(horizons[i - 1].bottom + blend).toFixed(3)},d);c=mix(c,${hex(h.colour)},t);if(t>.5)kind=${kindOf(h.code)};}`,
    )
    .join("\n");
  return `
float cellEdge(vec2 q){
  vec2 i=floor(q),f=fract(q);float a=9.,b=9.;
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 n=vec2(float(x),float(y)),o=vec2(sHash(i+n),sHash(i+n+7.3));
    float e=length(n+o-f);if(e<a){b=a;a=e;}else b=min(b,e);}
  return b-a;
}
/** Nearest Voronoi cell: x = distance to its edge, y = a random id for the cell. */
vec2 cellStone(vec2 q){
  vec2 i=floor(q),f=fract(q);float a=9.,b=9.;vec2 id=vec2(0.);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 n=vec2(float(x),float(y)),o=vec2(sHash(i+n),sHash(i+n+7.3));
    float e=length(n+o-f);if(e<a){b=a;a=e;id=i+n;}else b=min(b,e);}
  return vec2(b-a,sHash(id+3.1));
}
vec3 sectionColour(vec3 p,vec3 w){
  float h=p.x+p.z,d=-p.y+.025*(sNoise(vec2(h*5.,1.))-.5);
  ${colour}
  vec2 q=vec2(h,d);
  float g=grain(q);
  c*=mix(.9,1.08,g);
  if(kind==0){
    // Leaf litter: pale fragments in dark humus.
    c=mix(c,vec3(.55,.42,.26),smoothstep(.7,.78,sNoise(q*vec2(40.,90.)))*.7);
  }else if(kind==1){
    // Crumb structure.
    c*=.84+.3*sNoise(q*55.);
  }else if(kind==2){
    // Blocky peds separated by darker cracks and clay coatings.
    float e=cellEdge(q*vec2(8.,6.));
    c*=mix(.74,1.,smoothstep(0.,.06,e));
    ${index === 2 ? "c=mix(c,vec3(.36,.16,.10),smoothstep(.84,.9,sNoise(q*44.))*.6);" : ""}
  }else{
    // Weathered parent material: angular stones that become larger and commoner with depth.
    float deep=clamp(d-1.,0.,1.);
    vec2 cs=cellStone(q*vec2(11.-3.*deep,13.-4.*deep));
    float st=step(cs.y,.22+.25*deep)*smoothstep(.03,.07,cs.x);
    vec3 stone=mix(vec3(.66,.64,.60),vec3(.76,.73,.67),sHash(vec2(cs.y,2.)))*mix(.85,1.06,sNoise(q*70.));
    c=mix(c,stone,st);
    c*=1.-.3*step(cs.y,.22+.25*deep)*(1.-smoothstep(.0,.04,cs.x))*smoothstep(.02,.03,cs.x+.02);
  }
  // Roots: fine pale threads, thinning out with depth.
  float col=floor(h*28.),rf=fract((h+.012*sin(d*25.+col))*28.);
  float root=(1.-smoothstep(.0,.06,abs(rf-.5)-.42))*step(.55,sHash(vec2(col,3.)))*(1.-smoothstep(${(rootDepth * 0.5).toFixed(2)},${rootDepth.toFixed(2)},d*(1.+sHash(vec2(col,5.)))));
  c=mix(c,vec3(.80,.72,.58),root*.7);
  // Earthworm and animal burrows, back-filled with darker topsoil.
  float burrow=smoothstep(.86,.89,sNoise(q*vec2(26.,12.)+3.))*step(d,${index === 1 ? "1.2" : "0.8"});
  c=mix(c,${hex(horizons[Math.min(1, horizons.length - 1)].colour)},burrow*.7);
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
}

export default function SoilProfile() {
  const { params } = useLabControls(),
    index = Math.round(params.profile ?? 0),
    profile = SOIL_PROFILES[index];
  const geometry = useMemo(() => {
    const g = new THREE.BoxGeometry(1.6, 2, 1, 2, 2, 2);
    g.translate(0, -1, 0);
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const glsl = useMemo(() => profileGlsl(index), [index]);
  return (
    <>
      <ScienceStudio
        horizon
        slug="soil-profile"
        camera={[2, 1.4, 6]}
        scale="Illustrative 2 m profile · common geometric scale · no compulsory O–A–E–B–C sequence"
        trueScale="1 scene unit = 1 m · grains and roots enlarged for visibility"
      >
        <mesh geometry={geometry}>
          <SectionMaterial
            glsl={glsl}
            cliff={0.7}
            cacheKey={`soil-profile-${index}`}
            color={index === 0 ? "#3b2e20" : "#5a6a39"}
            roughness={0.98}
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
