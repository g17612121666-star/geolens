/** Invented closed classroom budget. Pg C; NOT measured global reservoir sizes. */
export const CARBON_INITIAL=[600,1200,3000,6000,1200] as const;
export const CARBON_STORES=['Atmosphere','Biosphere','Ocean','Sediment / rock','Fossil fuel'] as const;
/** Extra CO₂ only partly speeds uptake: plants respond weakly (CO₂ fertilization) and seawater
 * chemistry limits how much more the ocean dissolves (buffer factor), so near half of emissions stay airborne. */
export function carbonFluxes(s:readonly number[],tap:number){return [
  {name:'Photosynthesis',from:0,to:1,rate:60*(1+.3*(s[0]-600)/600)},
  {name:'Respiration / decay',from:1,to:0,rate:60*s[1]/1200},
  {name:'Air to ocean',from:0,to:2,rate:40*(1+.25*(s[0]-600)/600)},
  {name:'Ocean to air',from:2,to:0,rate:40*s[2]/3000},
  {name:'Silicate-weathering pathway',from:0,to:2,rate:.2*s[0]/600},
  {name:'Burial / sedimentation',from:2,to:3,rate:.2*s[2]/3000},
  {name:'Geological degassing',from:3,to:0,rate:.2*s[3]/6000},
  {name:'Fossil-fuel combustion',from:4,to:0,rate:10*Math.max(0,Math.min(1,tap))},
];}
function derivative(s:readonly number[],tap:number){const change=[0,0,0,0,0];for(const f of carbonFluxes(s,tap)){change[f.from]-=f.rate;change[f.to]+=f.rate;}return change;}
export function carbonBudget(years:number,tap:number){
 let state:number[]=[...CARBON_INITIAL],time=0;years=Math.max(0,Math.min(100,years));
 while(time<years-1e-12){const h=Math.min(.25,years-time),a=derivative(state,tap),b=derivative(state.map((v,i)=>v+h*a[i]/2),tap),c=derivative(state.map((v,i)=>v+h*b[i]/2),tap),d=derivative(state.map((v,i)=>v+h*c[i]),tap);state=state.map((v,i)=>v+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);time+=h;}
 return {stores:state,total:state.reduce((a,b)=>a+b,0),fluxes:carbonFluxes(state,tap),emitted:CARBON_INITIAL[4]-state[4]};
}
