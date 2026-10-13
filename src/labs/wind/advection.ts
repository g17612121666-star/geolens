import {pressureWind} from '../../lib/energy-wind-science.ts';

/** Integrate the existing acceleration solution; coordinates are metres east/north. */
export function airDisplacement(seconds:number,coriolis:boolean,friction:boolean,south:boolean,steady:boolean):[number,number]{
 const duration=Math.max(0,seconds),steps=256,dt=duration/steps;let east=0,north=0;
 for(let i=0;i<=steps;i++){const wind=pressureWind(i*dt,coriolis,friction,south,steady),weight=i===0||i===steps?.5:1;east+=wind.u*dt*weight;north+=wind.v*dt*weight;}
 return[east,north];
}
/** Periodic boundaries retain continuous parcels in the finite demonstration window. */
export function wrapParcel(value:number,halfWidth=2.7){return ((value+halfWidth)%(2*halfWidth)+2*halfWidth)%(2*halfWidth)-halfWidth;}
