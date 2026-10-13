/** Prescribed temperatures illustrate a thermal contrast; they are not forecast output. */
export function coastalContrast(hour:number,urban=false,coast=true){
  const cycle=Math.cos((hour-15)/24*Math.PI*2);
  const left=urban?20+4*cycle:coast?20+.7*cycle:20;
  const right=urban?left+3+1.5*(1-cycle)/2:coast?20+5*cycle:20;
  return {left,right,contrast:right-left};
}
/** Local kinematic surface circulation, in east/north coordinates; radial sign gives divergence. */
export function pressureCentreFlow(east:number,north:number,high=false,southern=false){
  const radius=Math.hypot(east,north),spin=(high?-1:1)*(southern?-1:1),radial=high?.22:-.22;
  const decay=Math.exp(-radius*radius/20);
  return {east:(-spin*north+radial*east)*decay,north:(spin*east+radial*north)*decay,vertical:high?-1:1};
}

/** A zonal-mean teaching cell; phase zero is the near-surface branch at the mid-latitude. */
export function circulationCell(inner:number,outer:number,phase:number,direct=true){
  const angle=phase*Math.PI*2*(direct?-1:1);
  return {latitude:(inner+outer)/2+(outer-inner)/2*Math.sin(angle),heightFraction:(1-Math.cos(angle))/2};
}
