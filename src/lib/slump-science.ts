/** Selected circular slip surface in an invented uniform 2-D slope.
 * Geometry units = 10 m. Strength is effective-stress c'=2 kPa, phi'=15°.
 * Simplified Bishop method; interslice shear, seismic/external loading excluded. */
export const SLUMP={radius:2.8,centreY:2.8,left:(-.9-Math.sqrt(.9**2+4*1.0625*4.6))/(2*1.0625),right:(-.9+Math.sqrt(.9**2+4*1.0625*4.6))/(2*1.0625)};
export const slumpSurface=(x:number)=>1-.25*x;
export const slumpBase=(x:number)=>SLUMP.centreY-Math.sqrt(Math.max(0,SLUMP.radius**2-x*x));
export function rotateSlump(x:number,y:number,angle:number):[number,number]{return [x*Math.cos(angle)-(y-SLUMP.centreY)*Math.sin(angle),SLUMP.centreY+x*Math.sin(angle)+(y-SLUMP.centreY)*Math.cos(angle)];}
export function slumpStability(pressureFraction:number,frictionDeg=15,cohesion=2,count=160){
 const r=Math.max(0,Math.min(1,pressureFraction)),b=(SLUMP.right-SLUMP.left)*10/count,tan=Math.tan(frictionDeg*Math.PI/180);
 const slices=Array.from({length:count},(_,i)=>{const x=SLUMP.left+(i+.5)*b/10,h=(slumpSurface(x)-slumpBase(x))*10,alpha=Math.atan(-x/Math.sqrt(SLUMP.radius**2-x*x));return {x,h,b,alpha,weight:20*h*b,porePressure:r*9.81*h};});
 const driving=slices.reduce((sum,s)=>sum+s.weight*Math.sin(s.alpha),0);
 const next=(f:number)=>slices.reduce((sum,s)=>sum+(cohesion*s.b+(s.weight-s.porePressure*s.b)*tan)/(Math.cos(s.alpha)+Math.sin(s.alpha)*tan/f),0)/driving;
 let factor=1.5;for(let i=0;i<150;i++){const f=next(factor);if(Math.abs(f-factor)<1e-11){factor=f;break;}factor=f;}
 return {factor,residual:next(factor)-factor,slices,maxPressure:Math.max(...slices.map(s=>s.porePressure)),driving};
}
