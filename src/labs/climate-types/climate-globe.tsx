import {useMemo} from 'react';
import * as THREE from 'three';
import {useTexture} from '@react-three/drei';
import {EarthMesh,Graticule} from '@/components/globe/earth';
import {latLonToXYZ} from '@/lib/geo';
import {useLabControls} from '@/lib/store/lab-controls';
import {ScienceStudio,ScienceReadout} from '../shared/science-kit';
import {Tag} from '../shared/kit';

const FAMILIES = [
  {code:'A',name:'Tropical',colour:'#449d80',description:'Warm throughout the year; rainfall separates rainforest, monsoon and savannah climates.'},
  {code:'B',name:'Dry',colour:'#d5ac6a',description:'Rainfall is low relative to the classification’s aridity threshold; dry climates can be hot or cold.'},
  {code:'C',name:'Temperate',colour:'#93ba74',description:'Mild winters and seasonal temperatures; subclasses describe summer warmth and rainfall patterns.'},
  {code:'D',name:'Continental',colour:'#859fc9',description:'Cold winters and warm summers create a marked annual temperature range.'},
  {code:'E',name:'Polar',colour:'#dddce3',description:'Even the warmest month averages below 10 °C; tundra and ice-cap climates belong to this family.'},
];
const EXAMPLES=[{name:'Singapore',lat:1.35,lon:103.82,code:'Af',atlas:'sg'},{name:'Cairo',lat:30.04,lon:31.24,code:'BWh',atlas:'eg'},{name:'London',lat:51.51,lon:-.13,code:'Cfb',atlas:'uk'},{name:'Helsinki',lat:60.17,lon:24.94,code:'Dfb',atlas:'fi'},{name:'Nuuk',lat:64.18,lon:-51.72,code:'ET',atlas:null}];

function Classification({family}:{family:number}){
  const map=useTexture('/textures/climate-families.png');
  useMemo(()=>{map.colorSpace=THREE.NoColorSpace;map.minFilter=THREE.NearestFilter;map.magFilter=THREE.NearestFilter;map.generateMipmaps=false;},[map]);
  const uniforms=useMemo(()=>({grid:{value:map},family:{value:family+1}}),[map,family]);
  return <mesh rotation={[0,Math.PI/2,0]}><sphereGeometry args={[1.213,160,112]}/><shaderMaterial uniforms={uniforms} transparent depthWrite={false} vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`} fragmentShader={`uniform sampler2D grid;uniform float family;varying vec2 vUv;void main(){float k=floor(texture2D(grid,vUv).r*255.+.5);if(k<.5)discard;vec3 c=k<1.5?vec3(.267,.616,.502):k<2.5?vec3(.835,.675,.416):k<3.5?vec3(.576,.729,.455):k<4.5?vec3(.522,.624,.788):vec3(.867,.863,.89);bool chosen=abs(k-family)<.1;gl_FragColor=vec4(chosen?c:mix(c,vec3(.14,.2,.23),.68),chosen?.96:.78);}`}/></mesh>;
}

export default function ClimateTypes(){
  const params=useLabControls(s=>s.params),setParam=useLabControls(s=>s.setParam);
  const family=Math.min(4,Math.max(0,Math.round(params.biome??0))),sample=EXAMPLES[family],selected=FAMILIES[family],d=Math.PI/180;
  const point=latLonToXYZ(sample.lat,sample.lon,1.23);
  return <>
    <ScienceStudio slug="climate-types" camera={[0,.15,5]} scale="The globe preserves geographic proportions. Climate colours summarise the 1991–2020 reference period" trueScale="The globe uses the same geographic scale in both views">
      <group rotation={[sample.lat*d,Math.PI-sample.lon*d,0]}>
        <EarthMesh radius={1.2} sunDirection={new THREE.Vector3(-1,1,3)}/>
        <Classification family={family}/><Graticule radius={1.222}/>
        <mesh position={point}><sphereGeometry args={[.025,24,20]}/><meshBasicMaterial color="#ffffff"/></mesh>
        <Tag pos={point} text={`${sample.name} (${sample.code})`} note={`${sample.name} is a reference point for ${selected.name.toLowerCase()} climate. The code describes long-term temperature and rainfall at this location; nearby highlands and coasts may differ.`} occlude={false}/>
      </group>
    </ScienceStudio>
    <ScienceReadout>
      <div className="grid grid-cols-5 gap-1" role="group" aria-label="Highlight a climate family">{FAMILIES.map((item,index)=><button key={item.code} type="button" aria-pressed={family===index} onClick={()=>setParam('biome',index)} className={`min-h-11 rounded-lg border px-1 py-2 text-center ${family===index?'border-glacier bg-glacier/15 text-chalk':'border-white/15 text-mist hover:text-chalk'}`}><span className="mx-auto mb-1 block size-2 rounded-full" style={{backgroundColor:item.colour}}/><span className="font-semibold">{item.code}</span><span className="mt-1 hidden text-xs sm:block">{item.name}</span></button>)}</div>
      <p className="mt-3"><strong>{selected.name} climate.</strong> {selected.description}</p>
      {sample.atlas&&<a className="mt-2 inline-block text-glacier underline underline-offset-4" href={`/atlas?place=${sample.atlas}`}>Explore {sample.name} in Atlas</a>}
    </ScienceReadout>
  </>;
}
