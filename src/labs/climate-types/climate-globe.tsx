import { useMemo } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { EarthMesh, Graticule } from "@/components/globe/earth";
import { latLonToXYZ } from "@/lib/geo";
import { useLabControls } from "@/lib/store/lab-controls";
import { ScienceStudio, ScienceReadout } from "../shared/science-kit";
import { Tag } from "../shared/kit";

const FAMILIES = [
  {
    code: "A",
    name: "Tropical",
    color: "#449d80",
    description:
      "Warm throughout the year; rainfall separates rainforest, monsoon and savanna climates.",
  },
  {
    code: "B",
    name: "Dry",
    color: "#d5ac6a",
    description:
      "Rainfall is below a dryness threshold that rises with temperature; dry climates can be hot or cold.",
  },
  {
    code: "C",
    name: "Temperate",
    color: "#93ba74",
    description:
      "Mild winters and warm or hot summers; subclasses describe summer warmth and when rain falls.",
  },
  {
    code: "D",
    name: "Cold continental",
    color: "#859fc9",
    description: "Cold winters and warm summers create a marked annual temperature range.",
  },
  {
    code: "E",
    name: "Polar",
    color: "#dddce3",
    description:
      "Even the warmest month averages below 10 °C; tundra and ice-cap climates belong to this family.",
  },
];
const EXAMPLES = [
  { name: "Singapore", lat: 1.35, lon: 103.82, code: "Af", atlas: "sg" },
  { name: "Cairo", lat: 30.04, lon: 31.24, code: "BWh", atlas: "eg" },
  { name: "Washington, DC", lat: 38.91, lon: -77.04, code: "Cfa", atlas: "us" },
  { name: "Saint Paul", lat: 44.95, lon: -93.09, code: "Dfa", atlas: "us-mn" },
  { name: "Nuuk", lat: 64.18, lon: -51.72, code: "ET", atlas: null },
];

/**
 * Köppen families over the globe. Every family keeps its own color so the map reads as a whole;
 * the chosen family is solid with a light outline, the others lighter and translucent. Classes
 * are sampled several times across each screen pixel, so coasts and borders stay smooth instead
 * of sparkling where many texels fall in one pixel.
 */
const CLASSIFICATION_FRAGMENT = /* glsl */ `
uniform sampler2D grid; uniform float family; varying vec2 vUv;
vec3 familyColor(float k){
  return k<1.5?vec3(.267,.616,.502):k<2.5?vec3(.835,.675,.416):k<3.5?vec3(.576,.729,.455)
    :k<4.5?vec3(.522,.624,.788):vec3(.867,.863,.89);
}
void main(){
  vec2 dx=dFdx(vUv),dy=dFdy(vUv);
  // The texture wraps at the date line: ignore the jump in u there.
  if(abs(dx.x)>.25)dx.x=0.;
  if(abs(dy.x)>.25)dy.x=0.;
  vec3 sum=vec3(0.);float alpha=0.,chosen=0.,land=0.;
  for(int i=0;i<3;i++)for(int j=0;j<3;j++){
    vec2 o=(float(i)-1.)/3.*dx+(float(j)-1.)/3.*dy;
    float k=floor(texture2D(grid,vUv+o).r*255.+.5);
    if(k<.5)continue;
    vec3 c=familyColor(k);
    bool pick=abs(k-family)<.1;
    float grey=dot(c,vec3(.299,.587,.114));
    sum+=pick?c:mix(c,vec3(grey),.35)*1.05;
    alpha+=pick?.97:.6;
    chosen+=pick?1.:0.;
    land+=1.;
  }
  if(land<.5)discard;
  vec3 color=sum/land;
  // A light outline, about two pixels wide, inside the edge of the chosen family's regions.
  float edge=0.;
  if(chosen>4.5)for(int a=0;a<8;a++){
    float t=float(a)*.7853982;
    float k=floor(texture2D(grid,vUv+(cos(t)*dx+sin(t)*dy)*2.2).r*255.+.5);
    if(abs(k-family)>.1)edge=1.;
  }
  color=mix(color,vec3(1.),edge*.65);
  gl_FragColor=vec4(color,alpha/9.);
}`;

function Classification({ family }: { family: number }) {
  const map = useTexture("/textures/climate-families.png");
  useMemo(() => {
    map.colorSpace = THREE.NoColorSpace;
    map.minFilter = THREE.NearestFilter;
    map.magFilter = THREE.NearestFilter;
    map.generateMipmaps = false;
  }, [map]);
  const uniforms = useMemo(
    () => ({ grid: { value: map }, family: { value: family + 1 } }),
    [map, family],
  );
  return (
    <mesh rotation={[0, Math.PI / 2, 0]}>
      <sphereGeometry args={[1.213, 160, 112]} />
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`}
        fragmentShader={CLASSIFICATION_FRAGMENT}
      />
    </mesh>
  );
}

export default function ClimateTypes() {
  const params = useLabControls((s) => s.params),
    setParam = useLabControls((s) => s.setParam);
  const family = Math.min(4, Math.max(0, Math.round(params.biome ?? 0))),
    sample = EXAMPLES[family],
    selected = FAMILIES[family],
    d = Math.PI / 180;
  const point = latLonToXYZ(sample.lat, sample.lon, 1.23);
  // The tag sits a few degrees north so it does not hide the city marker or its color.
  const tagPoint = latLonToXYZ(sample.lat + 7, sample.lon, 1.23);
  return (
    <>
      <ScienceStudio
        slug="climate-types"
        camera={[0, 0.15, 5]}
        scale="Globe to scale · colors show 1991–2020 climate averages"
        trueScale="The globe uses the same geographic scale in both views"
      >
        <group rotation={[sample.lat * d, Math.PI - sample.lon * d, 0]}>
          <EarthMesh radius={1.2} lighting="viewer" />
          <Classification family={family} />
          <Graticule radius={1.222} />
          {/* Dark rim keeps the white marker visible on the near-white polar class. */}
          <mesh position={point}>
            <sphereGeometry args={[0.034, 24, 20]} />
            <meshBasicMaterial color="#10161a" />
          </mesh>
          <mesh position={point.map((v) => v * 1.012) as [number, number, number]}>
            <sphereGeometry args={[0.022, 24, 20]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Tag
            pos={tagPoint}
            text={`${sample.name} (${sample.code})`}
            note={`${sample.name} is a reference point for ${selected.name.toLowerCase()} climate. The code describes long-term temperature and rainfall at this location; nearby highlands and coasts may differ.`}
            occlude={false}
          />
        </group>
      </ScienceStudio>
      <ScienceReadout>
        <div
          className="grid grid-cols-5 gap-1"
          role="group"
          aria-label="Highlight a climate family"
        >
          {FAMILIES.map((item, index) => (
            <button
              key={item.code}
              type="button"
              aria-pressed={family === index}
              onClick={() => setParam("biome", index)}
              className={`min-h-11 rounded-lg border px-1 py-2 text-center ${family === index ? "border-glacier bg-glacier/15 text-chalk" : "border-white/15 text-mist hover:text-chalk"}`}
            >
              <span
                className="mx-auto mb-1 block size-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="font-semibold">{item.code}</span>
              <span className="mt-1 hidden text-xs sm:block">{item.name}</span>
            </button>
          ))}
        </div>
        <p className="mt-3">
          <strong>{selected.name} climate.</strong> {selected.description}
        </p>
        {sample.atlas && (
          <a
            className="mt-2 inline-block text-glacier underline underline-offset-4"
            href={`/atlas?place=${sample.atlas}`}
          >
            Explore {sample.name} in Atlas
          </a>
        )}
      </ScienceReadout>
    </>
  );
}
