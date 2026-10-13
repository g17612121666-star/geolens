import {riverLand,riverZ,riverBanks} from '../shared/river-terrain.ts';
type Point=[number,number,number];
/** An illustrative temperate catchment, not a habitat map or a fixed river-bank planting rule. */
export function riverVegetation(verticalScale=1){
 let state=48271;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const patches=[[-2.2,-1.25,.8,.62],[-1.5,1.1,.92,.7],[-.1,-1.05,.78,.6],[.75,1.45,.7,.38],[2.05,-1.22,.85,.63],[2.45,1.1,.55,.62]];
 const density=(x:number,z:number)=>Math.max(...patches.map(([a,b,sx,sz])=>Math.exp(-(((x-a)/sx)**2)-((z-b)/sz)**2)));
 const trees:{p:Point;size:number;kind:'conifer'|'broadleaf'}[]=[],shrubs:Point[]=[],grass:Point[]=[];
 for(let i=0;i<1300;i++){
  const x=-2.83+random()*5.66,z=-1.83+random()*3.66;
  // Clear the largest displayed channel and its active gravel margin at every discharge setting.
  const banks=riverBanks(x,1.6);
  if(z>banks[0]-.14&&z<banks[1]+.14)continue;
  const slope=Math.hypot((riverLand(x+.025,z)-riverLand(x-.025,z))/.05,(riverLand(x,z+.025)-riverLand(x,z-.025))/.05);
  if(slope>.83)continue;
  const patch=density(x,z),p:Point=[x,riverLand(x,z)*verticalScale,z],size=.13+random()*.11;
  if(random()<patch*.66+.018&&trees.every(t=>Math.hypot(x-t.p[0],z-t.p[2])>.19+(size+t.size)*.32)){
   // Both types overlap. This chosen montane example is not a universal upstream/downstream sequence.
   trees.push({p,size,kind:random()<.2+.5*(3-x)/6?'conifer':'broadleaf'});
  }else if(random()<.1&&shrubs.every(q=>Math.hypot(x-q[0],z-q[2])>.25))shrubs.push(p);
  else if(random()<.35)grass.push(p);
 }
 return {conifers:trees.filter(t=>t.kind==='conifer'),broadleaf:trees.filter(t=>t.kind==='broadleaf'),shrubs:shrubs.slice(0,40),grass:grass.slice(0,160)};
}
