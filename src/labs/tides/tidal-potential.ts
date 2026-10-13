const MEAN_MOON_DISTANCE=384400;
/** Relative quadrupole potential. Direction is scale independent; lunar strength varies as r^-3. */
export function tidalPotential(direction:[number,number,number],moon:[number,number,number]){
 const r=Math.hypot(...moon),d=Math.hypot(...direction),mu=direction.reduce((sum,x,i)=>sum+x*moon[i],0)/(d*r),sun=direction[0]/d;
 return (MEAN_MOON_DISTANCE/r)**3*.5*(3*mu*mu-1)+.46*.5*(3*sun*sun-1);
}
