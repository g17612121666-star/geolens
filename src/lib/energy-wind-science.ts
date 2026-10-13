export const STEFAN_BOLTZMANN=5.670374419e-8;
/** Globally averaged, shortwave-transparent, grey single-layer radiative equilibrium. */
export function radiationBudget(albedo:number,emissivity:number){
  const a=Math.max(0,Math.min(1,albedo)),e=Math.max(0,Math.min(1,emissivity));
  const incoming=1361/4,reflected=incoming*a,absorbed=incoming-reflected;
  const surfaceUp=absorbed/(1-e/2),atmosphereUp=e*surfaceUp/2,window=(1-e)*surfaceUp;
  return {incoming,reflected,absorbed,surfaceUp,atmosphereUp,backRadiation:atmosphereUp,window,outgoing:window+atmosphereUp,
    surfaceK:(surfaceUp/STEFAN_BOLTZMANN)**.25,atmosphereK:e>0?(surfaceUp/(2*STEFAN_BOLTZMANN))**.25:null};
}
/** East/north velocities under a constant northward pressure-gradient acceleration.
 * du/dt=fv-ru; dv/dt=G-fu-rv. Exact solution from rest, on an f plane. */
export function pressureWind(seconds:number,coriolis=true,friction=false,southern=false,equilibrium=true){
  const f=coriolis?(southern?-1:1)*1e-4:0,r=friction?5e-5:0,G=.001,denominator=f*f+r*r;
  let u=0,v=0;
  if(denominator===0)v=G*seconds;
  else{
    const us=G*f/denominator,vs=G*r/denominator;
    if(equilibrium){u=us;v=vs;}else{
      const decay=Math.exp(-r*seconds),c=Math.cos(f*seconds),s=Math.sin(f*seconds);
      u=us-decay*(us*c+vs*s);v=vs-decay*(vs*c-us*s);
    }
  }
  const pressure:[number,number]=[0,G],coriolisForce:[number,number]=[f*v,-f*u],drag:[number,number]=[-r*u,-r*v];
  return {u,v,speed:Math.hypot(u,v),pressure,coriolis:coriolisForce,drag,f,r,
    acceleration:[pressure[0]+coriolisForce[0]+drag[0],pressure[1]+coriolisForce[1]+drag[1]],
    steady:equilibrium&&denominator>0};
}
