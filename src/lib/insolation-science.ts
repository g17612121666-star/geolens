const D=Math.PI/180;
/** Beam-normal TSI fixed at 1 AU. Horizontal top-of-atmosphere geometry only. */
export function noonIrradiance(latitude:number,declinationDeg:number){return 1361*Math.max(0,Math.cos((latitude-declinationDeg)*D));}
export function dailyMeanIrradiance(latitude:number,declinationDeg:number){
 const p=latitude*D,d=declinationDeg*D,a=Math.sin(p)*Math.sin(d),b=Math.cos(p)*Math.cos(d);
 let h:number;if(Math.abs(b)<1e-12)return 1361*Math.max(0,a);
 const x=-a/b;h=x<=-1?Math.PI:x>=1?0:Math.acos(x);
 return 1361/Math.PI*(h*a+b*Math.sin(h));
}
