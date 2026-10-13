export const GRAVITY=9.80665,WATER_DENSITY=1025;
/** Gradually shoaling long wave: travel-time integration and Green's-law amplitude.
 * This approximation excludes reflection, breaking, run-up and two-dimensional spreading. */
export function longWaveTransect(){
  const length=500000,n=250,dx=length/n,points=[];
  let travel=0,previousSpeed=0;
  for(let i=0;i<=n;i++){
    const x=i*dx,q=Math.max(0,Math.min(1,(x-180000)/320000)),smooth=q*q*(3-2*q),depth=4000*Math.exp(Math.log(100/4000)*smooth),speed=Math.sqrt(GRAVITY*depth);
    if(i>0)travel+=dx*(1/previousSpeed+1/speed)/2;
    points.push({x,depth,speed,travel,amplitude:.5*(4000/depth)**.25});previousSpeed=speed;
  }
  return {points,totalTravel:travel,length};
}
export function longWaveElevation(point:{travel:number;amplitude:number},seconds:number){
  const phase=seconds-point.travel;
  return point.amplitude*Math.exp(-phase*phase/(2*600*600))*Math.cos(2*Math.PI*phase/1200);
}
/** Steady closed-coast setup over a flat shelf. Ocean end held at eta=0.
 * Integrates (h+eta)deta/dx=tau/(rho*g) plus a prescribed pressure gradient.
 * Includes no tide, Coriolis, time-dependent surge, wave setup or inundation. */
export function shelfSetup(windMS:number,depthM:number,pressureDropPa:number,lengthM=100000){
  const wind=Math.max(0,windMS),depth=Math.max(1,depthM),drop=Math.max(0,pressureDropPa);
  const stress=1.225*.0015*wind*wind,n=200,dx=lengthM/n,pressureGradient=drop/(WATER_DENSITY*GRAVITY*lengthM);
  const derivative=(eta:number)=>stress/(WATER_DENSITY*GRAVITY*(depth+eta))+pressureGradient;
  const points=[{x:0,eta:0}];let eta=0;
  for(let i=1;i<=n;i++){const k1=derivative(eta),k2=derivative(eta+dx*k1/2),k3=derivative(eta+dx*k2/2),k4=derivative(eta+dx*k3);eta+=dx*(k1+2*k2+2*k3+k4)/6;points.push({x:i*dx,eta});}
  return {points,coastalSetup:eta,stress,inverseBarometer:drop/(WATER_DENSITY*GRAVITY),depth,length:lengthM};
}
