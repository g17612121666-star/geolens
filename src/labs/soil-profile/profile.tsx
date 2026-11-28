import { useMemo, useEffect } from "react";
import * as THREE from "three";
import { Html, Line } from "@react-three/drei";
import { SOIL_PROFILES } from "@/lib/soil-profile-science";
import { useLabControls, useLabState } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { SectionMaterial } from "../shared/section-material";
import { GrassPatch, DebrisField } from "../shared/geomorphic-terrain";
import { Tag } from "../shared/kit";
import { landscapeRandom as random } from "../shared/landscape-noise";
import { useT } from "@/lib/i18n";
const hex = (h: string) => {
  const c = new THREE.Color(h);
  // Work in sRGB like CSS hex; SectionMaterial converts to linear.
  const [r, g, b] = [c.r, c.g, c.b].map((v) => Math.pow(v, 1 / 2.2));
  return `vec3(${r.toFixed(3)},${g.toFixed(3)},${b.toFixed(3)})`;
};
/** Structure drawn for each horizon type: litter, crumb, blocky peds or stony parent material. */
const kindOf = (code: string) =>
  code[0] === "O" ? 0 : code[0] === "A" ? 1 : code[0] === "B" ? 2 : 3;

/** How sharply one horizon passes into the next: O to A is abrupt, B to C gradual. */
function boundaryWidth(index: number, upper: string) {
  if (index === 2) return upper[0] === "A" ? 0.06 : 0.14;
  return upper[0] === "O" ? 0.008 : upper[0] === "A" ? 0.025 : 0.07;
}

/**
 * A section shader for one profile, as a freshly cut soil pit face looks: wavy boundaries with
 * tongues of darker topsoil reaching down, crumbly topsoil full of fine roots, subsoil broken into
 * small blocky peds, and weathered parent material with stones that grow larger and commoner with
 * depth. The Oxisol's subsoil is almost structureless, and its parent material is mottled
 * saprolite: rock rotted in place, not loose stones.
 */
function profileGlsl(index: number) {
  const { horizons } = SOIL_PROFILES[index],
    rootDepth = index === 1 ? 0.75 : 0.4;
  const color = horizons
    .map((h, i) => {
      if (i === 0) return `vec3 c=${hex(h.color)};int kind=${kindOf(h.code)};`;
      const top = horizons[i - 1].bottom,
        w = boundaryWidth(index, horizons[i - 1].code);
      return `{float t=smoothstep(${(top - w).toFixed(3)},${(top + w).toFixed(3)},d);c=mix(c,${hex(h.color)},t);if(t>.5)kind=${kindOf(h.code)};}`;
    })
    .join("\n");
  return `
/** Nearest Voronoi cell: x = distance to its edge, y = a random id, zw = offset from its center. */
vec4 cell(vec2 q){
  vec2 i=floor(q),f=fract(q);float a=9.,b=9.;vec2 id=vec2(0.),to=vec2(0.);
  for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
    vec2 n=vec2(float(x),float(y)),o=vec2(sHash(i+n),sHash(i+n+7.3));
    vec2 r=n+o-f;float e=length(r);
    if(e<a){b=a;a=e;id=i+n;to=r;}else b=min(b,e);}
  return vec4(b-a,sHash(id+3.1),to);
}
vec3 sectionColour(vec3 p,vec3 w){
  float h=p.x+p.z;
  // Wavy boundaries, with tongues where worms and roots have carried topsoil down.
  float tongue=.07*smoothstep(.72,.95,sNoise(vec2(h*7.,3.)));
  float d=-p.y+.03*(sNoise(vec2(h*4.,1.))-.5)-tongue*smoothstep(.1,.35,-p.y);
  ${color}
  vec2 q=vec2(h,-p.y);
  float g=grain(q);
  c*=mix(.92,1.06,g);
  if(kind==0){
    // Leaf litter: flattened, pale fragments in dark humus.
    c=mix(c,vec3(.52,.4,.25),smoothstep(.68,.76,sNoise(q*vec2(45.,160.)))*.65);
    c*=.9+.15*sNoise(q*vec2(30.,240.));
  }else if(kind==1){
    // Crumb structure: small rounded aggregates with dark pores between them.
    float crumb=sFbm(q*90.);
    c*=.82+.32*crumb;
    c*=1.-.45*smoothstep(.82,.9,sNoise(q*170.+2.));
  }else if(kind==2){
    ${
      index === 2
        ? `// Oxic subsoil: almost no visible structure, fine pores and a few dark iron nodules.
    c*=.94+.1*sFbm(q*60.);
    c=mix(c,vec3(.32,.14,.09),smoothstep(.86,.9,sNoise(q*52.))*.7);`
        : `// Small subangular blocky peds; each catches the light on one side, with darker clay films
    // and fine cracks between them.
    vec4 pd=cell(q*vec2(30.,22.)+.25*vec2(sNoise(q*12.),sNoise(q*12.+5.)));
    float shade=.97+.05*dot(normalize(pd.zw+.0001),vec2(.6,.8))*smoothstep(0.,.3,length(pd.zw));
    c*=shade*mix(.86,1.,smoothstep(0.,.07,pd.x));
    c*=.93+.12*sFbm(q*70.);`
    }
  }else{
    ${
      index === 2
        ? `// Saprolite: rock rotted in place, mottled red, yellow and pale, with ghosts of its fabric.
    float m=sFbm(q*vec2(9.,14.));
    c=mix(c,vec3(.78,.62,.42),smoothstep(.55,.7,m)*.7);
    c=mix(c,vec3(.86,.8,.7),smoothstep(.7,.8,sNoise(q*vec2(6.,40.)+1.))*.5);`
        : `// Weathered parent material: stones, larger and commoner with depth, set in a paler matrix.
    float deep=clamp((d-1.)/1.,0.,1.);
    c*=.95+.1*sNoise(q*80.);
    for(int k=0;k<2;k++){
      vec2 sc=k==0?vec2(9.-2.*deep,10.-2.*deep):vec2(26.,30.);
      vec4 st=cell(q*sc+float(k)*13.7);
      float present=step(st.y,(k==0?.16:.22)+.25*deep);
      float inside=smoothstep(.04,.09,st.x);
      vec3 stone=mix(vec3(.58,.56,.52),vec3(.74,.7,.63),sHash(vec2(st.y,2.)))*mix(.86,1.06,sNoise(q*90.));
      // Rounded by weathering: lit on top, shadowed underneath.
      stone*=.88+.2*st.w*smoothstep(0.,.35,length(st.zw))+.12*smoothstep(.05,.3,st.x);
      c=mix(c,stone,present*inside);
      c*=1.-.25*present*(1.-inside)*smoothstep(0.,.04,st.x);
    }`
    }
  }
  // Fine roots: pale wandering threads, most in the topsoil, thinning out with depth.
  float col=floor(h*34.),wander=.01*sin(-p.y*28.+col*1.7),rf=fract((h+wander)*34.);
  float reach=${rootDepth.toFixed(2)}*(.4+.8*sHash(vec2(col,5.)));
  float root=(1.-smoothstep(.05,.09,abs(rf-.5)))*step(.6,sHash(vec2(col,3.)))*(1.-smoothstep(reach*.5,reach,-p.y));
  c=mix(c,vec3(.78,.7,.56),root*.6);
  // Old burrows back-filled with darker topsoil.
  float burrow=smoothstep(.87,.9,sNoise(q*vec2(20.,10.)+3.))*step(-p.y,${index === 1 ? "1.3" : "0.8"})*step(.2,-p.y);
  c=mix(c,${hex(horizons[Math.min(1, horizons.length - 1)].color)}*.85,burrow*.75);
  return c;
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;
}

export default function SoilProfile() {
  const tr = useT();
  const { params } = useLabState("params"),
    index = Math.round(params.profile ?? 0),
    profile = SOIL_PROFILES[index],
    labels = useLabControls((s) => s.labels);
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
        scale={tr(
          "Example 2 m profile, drawn to scale · not every soil has every O–A–E–B–C horizon",
        )}
        trueScale={tr("1 scene unit = 1 m · grains and roots enlarged for visibility")}
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
              {labels && (
                <Line
                  points={[
                    [0.81, actualY, 0.51],
                    [1.18, labelY, 0.51],
                    [1.35, labelY, 0.51],
                  ]}
                  color="#a6b4a8"
                />
              )}
              <Tag
                pos={[1.85, labelY, 0.51]}
                text={tr("{h} · {top}–{h2} cm", {
                  h: h.code,
                  top: (top * 100).toFixed(0),
                  h2: (h.bottom * 100).toFixed(0),
                })}
                note={tr(h.description)}
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
        {/* Keeps the depth scale's numbers, drawn left of the line, inside the camera's framing. */}
        <mesh position={[-1.45, -1, 0.55]} visible={false} userData={{ fitProxy: true }}>
          <boxGeometry args={[0.05, 2, 0.05]} />
        </mesh>
        {[0, 0.5, 1, 1.5, 2].map((d) => (
          <group key={d}>
            <Line
              points={[
                [-1, -d, 0.55],
                [-0.9, -d, 0.55],
              ]}
              color="#d6c6a7"
            />
            <Html position={[-1.04, -d, 0.55]}>
              <span
                className="block whitespace-nowrap font-mono text-xs text-mist"
                style={{ transform: "translate(-100%, -50%)" }}
              >
                {`${d} m`}
              </span>
            </Html>
          </group>
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {tr(profile.name)}. {tr(profile.context)} <br />
        {tr(
          "Depths are teaching examples, not field measurements. These examples have no E (leached) or R (bedrock) horizon, though other soils do. Select a horizon label to read what it means.",
        )}
      </ScienceReadout>
    </>
  );
}
