import {useLabControls} from '@/lib/store/lab-controls';
import {Line} from '@react-three/drei';
import {Arrow} from './science-kit';
import {Tag} from './kit';
import {RockPrism} from './rock-prism';
import {FlowWaterMaterial} from './flow-water';

function Slab({points,color='#898079'}:{points:[number,number][];color?:string}){return <RockPrism points={points} depth={1.25} color={color}/>;}
/** Geometry is a section, not a surveyed landscape. Every kinematic tracer uses t. */
export function PlateSection({kind=0}:{kind?:number}){
 const t=useLabControls(s=>s.t),opening=.04+.22*t,slip=(t-.5)*.65;
 return <group position={[0,-.2,0]}>
  <Slab points={[[-2.8,-1.5],[2.8,-1.5],[2.8,-.48],[-2.8,-.48]]} color="#635d4f"/>
  {kind===0?<>
   {[-1,1].map(side=><group key={side} position={[side*opening,0,0]}><Slab points={side<0?[[-2.5,.02],[-.05,.19],[-.05,-.32],[-2.5,-.52]]:[[.05,.19],[2.5,.02],[2.5,-.52],[.05,-.32]]} color="#656862"/><Slab points={side<0?[[-2.5,.05],[-.12,.2],[-.12,.145],[-2.5,-.01]]:[[.12,.2],[2.5,.05],[2.5,-.01],[.12,.145]]} color="#989083"/>{Array.from({length:7},(_,i)=><Line key={i} points={[[side*(.18+i*.33),.18-i*.018,-.59],[side*(.18+i*.33),.18-i*.018,.59]]} color="#c1aa84" transparent opacity={.5} lineWidth={1}/>)}</group>)}
   <Slab points={[[-opening-.05,.19],[opening+.05,.19],[opening+.05,-.38],[-opening-.05,-.38]]} color="#514c47"/>
   <mesh position={[0,-.3,0]}><cylinderGeometry args={[.045,.08,.48,24]}/><meshStandardMaterial color="#b86438" emissive="#c75121" emissiveIntensity={.22}/></mesh>
   {[-1,1].map(side=><group key={side}><Arrow from={[side*.35,.65,0]} to={[side*1.25,.65,0]}/><mesh position={[side*(.06+.95*t),.23,0]}><sphereGeometry args={[.045,20,16]}/><meshBasicMaterial color="#e6c98d"/></mesh></group>)}
   <Tag pos={[0,1.02,0]} text="Divergent · new basalt" note="The crustal flanks separate while new basalt fills the ridge. Gold markers travel with each flank. Partial melt is local; the mantle volume below stays mostly solid." occlude={false}/>
  </>:kind===1?<>
   <group position={[t*.28,-t*.14,0]}><Slab points={[[-2.8,.12],[-.4,.12],[1.5,-.85],[1.34,-1.15],[-.48,-.2],[-2.8,-.2]]} color="#62665f"/><Slab points={[[-2.8,.15],[-.4,.15],[.6,-.4],[.58,-.47],[-.42,.09],[-2.8,.09]]} color="#a9987e"/>
    {Array.from({length:8},(_,i)=>{const x=-2.55+i*.32;return <Line key={i} points={[[x,.165,-.6],[x,.165,.6]]} color="#beb08b" lineWidth={1}/>;})}
   </group>
   <Slab points={[[.13,.34],[.5,.5],[.77,.72],[.92,.63],[1.08,.39],[1.4,.49],[1.8,.35],[2.6,.38],[2.6,-.42],[.75,-.42],[.13,-.05]]} color="#aa9877"/>
   <mesh rotation={[-Math.PI/2,0,0]} position={[-1.5,.23,0]}><planeGeometry args={[2.2,1.28]}/><FlowWaterMaterial opacity={.5} flow={[1,0]} speed={.3}/></mesh>
   {Array.from({length:8},(_,i)=>{const f=(t+i/8)%1;return <mesh key={i} position={[-.35+f*1.7,.1-f*.95,.64]}><sphereGeometry args={[.026,12,8]}/><meshBasicMaterial color="#ebbf89"/></mesh>;})}
   <Arrow from={[-1.6,.65,0]} to={[-.65,.65,0]}/><Arrow from={[1.8,1,0]} to={[.95,1,0]}/>
   <Tag pos={[0,1.35,0]} text="Convergent · descending slab" note="Oceanic lithosphere descends below the overriding continent. Gold markers follow the descending path; the upper surface has a trench and volcanic-arc relief. Geometry and speed are schematic." occlude={false}/>
  </>:<>
   {[-1,1].map(side=><group key={side} position={[0,0,side*slip]}><Slab points={side<0?[[-2.5,.15],[-.045,.15],[-.045,-.48],[-2.5,-.48]]:[[.045,.15],[2.5,.15],[2.5,-.48],[.045,-.48]]}/><Line points={side<0?[[-2.5,.17,0],[-.045,.17,0]]:[[.045,.17,0],[2.5,.17,0]]} color="#e8d4a5" lineWidth={3}/><Arrow from={[side*.7,.55,-side*.45]} to={[side*.7,.55,side*.45]}/></group>)}
   <Tag pos={[0,1,0]} text="Transform · offset marker" note="The two halves of one cream surface marker separate along the fault. Crust slides laterally; it is neither created nor consumed. Play and the time slider move the same blocks." occlude={false}/>
  </>}
  <Tag pos={[0,-1.55,.8]} text="Mantle · mostly solid" note="Rock texture distinguishes material. The section has no measured speed or length scale and does not depict a global magma ocean." occlude={false}/>
 </group>;
}
