import { useMemo } from "react";
import * as THREE from "three";
import { useLabControls } from "@/lib/store/lab-controls";
import { catenaProfile } from "@/lib/soil-profile-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import {
  GeomorphicTerrain,
  GrassPatch,
  RootNetwork,
  WaterRibbon,
} from "../shared/geomorphic-terrain";
import { PlantStand } from "../shared/natural-world";
import { useSectionUniforms } from "../shared/section-utils";
import { Tag } from "../shared/kit";
import { landscapeNoise as noise, landscapeRandom as random } from "../shared/landscape-noise";

const SAMPLES = 81;

/** Hillslope surface (scene units): the shared catena profile's smoothstep hill. */
function hillSurface(x: number, slope: number) {
  return catenaProfile(x, slope).surface;
}

/**
 * Catena cut faces. Soil thickness along the slope comes from the model (uThick), so the soil
 * thins on the backslope and thickens at the toe. The lower slope is wetter: its subsoil is
 * gray with rusty mottles (gleying). Below the soil lies weathered and then solid sandstone.
 */
const CATENA_GLSL = `uniform float uThick[${SAMPLES}];
vec3 sectionColour(vec3 p,vec3 w){
  float u=clamp((p.x+3.)/6.,0.,1.),k=u*${SAMPLES - 1}.;
  int i=int(floor(k));
  float t=mix(uThick[i],uThick[min(i+1,${SAMPLES - 1})],fract(k));
  float d=sectionDepth+.015*(sNoise(vec2(p.x*6.+p.z*3.,1.))-.5);
  float g=grain(vec2(p.x+p.z,p.y));
  float wet=smoothstep(.62,.9,u);
  vec3 c;
  if(d<.012)c=vec3(.30,.36,.20);
  else if(d<t*.32){
    c=mix(vec3(.30,.23,.16),vec3(.24,.20,.16),wet)*mix(.85,1.12,sNoise(vec2(p.x+p.z,p.y)*60.));
  }else if(d<t){
    vec3 brown=vec3(.58,.42,.28),gley=vec3(.50,.52,.50);
    c=mix(brown,gley,wet)*mix(.9,1.07,g);
    float mottle=smoothstep(.7,.76,sNoise(vec2(p.x+p.z,p.y)*vec2(28.,40.)))*wet;
    c=mix(c,vec3(.72,.42,.20),mottle*.85);
  }else if(d<t+.14){
    float st=smoothstep(.6,.68,sNoise(vec2(p.x+p.z,p.y)*vec2(16.,22.)));
    c=mix(vec3(.66,.58,.46),vec3(.76,.68,.54),st)*mix(.92,1.06,g);
  }else{
    float y=p.y*6.+.1*sNoise(vec2(p.x+p.z,1.)*2.),f=fract(y),h=sHash(vec2(floor(y),3.));
    c=mix(vec3(.76,.64,.47),vec3(.66,.55,.40),h)*mix(.7,1.,smoothstep(0.,.07,f))*mix(.9,1.06,g);
  }
  // Horizon boundaries are drawn faintly so the changing thickness reads clearly.
  float e=min(abs(d-t*.32),abs(d-t));
  return c*mix(.8,1.,smoothstep(0.,.006,e));
}
vec3 sectionGlow(vec3 p,vec3 w){return vec3(0.);}`;

const CREST = new THREE.Color("#8b8a55"),
  SLOPE = new THREE.Color("#86a052"),
  WET = new THREE.Color("#5d7a45");

export default function SoilCatena() {
  const { params, trueScale } = useLabControls(),
    slope = params.slope ?? 0.55,
    thicknessScale = (trueScale ? 1 : 20) / 20;
  const height = useMemo(
    () => (x: number, z: number) => hillSurface(x, slope) + 0.02 * (noise(x * 2 + 1, z * 2) - 0.5),
    [slope],
  );
  const color = useMemo(
    () => (x: number, y: number, z: number) => {
      const u = (x + 3) / 6,
        c = CREST.clone()
          .lerp(SLOPE, THREE.MathUtils.smoothstep(u, 0.15, 0.35))
          .lerp(WET, THREE.MathUtils.smoothstep(u, 0.68, 0.88));
      // Thin soil on the steepest ground shows bare, eroded patches.
      const bare = Math.exp(-(((u - 0.4) / 0.12) ** 2)) * slope * noise(x * 6, z * 6);
      return c
        .lerp(new THREE.Color("#8e7558"), THREE.MathUtils.smoothstep(bare, 0.3, 0.6))
        .getStyle();
    },
    [slope],
  );
  const uniforms = useSectionUniforms({
    uThick: Array.from(
      { length: SAMPLES },
      (_, i) => catenaProfile(-3 + (6 * i) / (SAMPLES - 1), slope).thicknessM * thicknessScale,
    ),
  });
  const plants = useMemo(() => {
    const trees: [number, number, number][] = [],
      grass: [number, number, number][] = [],
      rushes: [number, number, number][] = [];
    for (let i = 0; i < 700; i++) {
      const x = -2.92 + random(i + 120) * 5.84,
        z = -0.94 + random(i + 430) * 1.88,
        y = height(x, z),
        u = (x + 3) / 6;
      if (u < 0.2 && random(i + 7) < 0.06 && trees.length < 9) trees.push([x, y - 0.01, z]);
      else if (u > 0.72 && rushes.length < 160) rushes.push([x, y, z]);
      else if (grass.length < 160) grass.push([x, y, z]);
    }
    return { trees, grass, rushes };
  }, [height]);
  const stream = useMemo(
    () =>
      Array.from({ length: 41 }, (_, i) => {
        const z = -1 + (2 * i) / 40,
          x = 2.82 + 0.05 * Math.sin(z * 3);
        return [x, height(x, z) + 0.006, z] as [number, number, number];
      }),
    [height],
  );
  const names = ["Crest", "Backslope", "Footslope / toe"],
    positions = [-2.5, -0.7, 2.4];
  return (
    <>
      <ScienceStudio
        horizon
        slug="soil-catena"
        camera={[1.3, 2.1, 7]}
        scale="Soil thickness ×20 · 120 m hillslope · topographic slope to scale"
        trueScale="1 scene unit = 20 m · soil and relief use a common scale · grass and roots enlarged"
      >
        <GeomorphicTerrain
          height={height}
          color={color}
          width={6}
          depth={2}
          base={-1.5}
          resolution={180}
          cliff={0.3}
          mottle={0.06}
          sideGlsl={CATENA_GLSL}
          sideUniforms={uniforms}
        />
        <GrassPatch positions={plants.grass} height={0.1} color="#7f9150" />
        <GrassPatch positions={plants.rushes} height={0.16} color="#4f6a3a" />
        <PlantStand kind="broadleaf" positions={plants.trees} scale={0.16} seed={5} />
        <WaterRibbon path={stream} width={0.05} color="#5b8f9c" />
        {positions.map((x, i) => (
          <RootNetwork
            key={i}
            x={x}
            y={hillSurface(x, slope) - 0.015}
            z={1.008}
            depth={Math.min(0.45, catenaProfile(x, slope).thicknessM * thicknessScale * 0.8)}
            spread={0.15}
            seed={i}
          />
        ))}
        {positions.map((x, i) => {
          const c = catenaProfile(x, slope),
            end: [number, number, number] = [x, hillSurface(x, slope) + 0.35, 1.1];
          return (
            <Tag
              key={i}
              pos={end}
              text={`${names[i]} · ${c.thicknessM.toFixed(2)} m soil`}
              note={
                i === 0
                  ? "A crest can export water and sediment, but soil thickness also depends on parent material, time, climate and land use. This sequence is one example."
                  : i === 1
                    ? "In this model, a steeper slope gives a thinner backslope soil; bare patches show where soil is thinnest. It is not an erosion-rate law, and not every steep slope has thin soil."
                    : "The lower slope receives water and sediment, so the soil is thicker. It is often waterlogged: the gray subsoil with rusty mottles shows gleying, where iron is reduced and moved by standing water."
              }
              occlude={false}
            />
          );
        })}
        {[-1.8, 0, 1.5].map((x) => (
          <Arrow
            key={x}
            from={[x, hillSurface(x, slope) + 0.45, 0]}
            to={[x + 0.65, hillSurface(x + 0.65, slope) + 0.45, 0]}
            color="#87c9d7"
            width={1}
          />
        ))}
      </ScienceStudio>
      <ScienceReadout>
        {`Soil thickness: ${positions
          .map(
            (x, i) =>
              `${names[i].toLowerCase()} ${catenaProfile(x, slope).thicknessM.toFixed(2)} m`,
          )
          .join(" · ")}. `}
        {
          "Soils share the same parent material, but their position on the slope changes drainage and sediment movement: the crest and backslope lose material, while the toe receives water and sediment."
        }
        <br />
        {
          "Pale blue arrows show water and sediment moving downslope. Change Slope to compare the soil thicknesses. Only soil thickness is exaggerated in the teaching view, and the model does not calculate rates of soil formation, erosion or deposition."
        }
      </ScienceReadout>
    </>
  );
}
