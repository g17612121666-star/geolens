/** Prescribed temperatures illustrate a thermal contrast; they are not forecast output. */
export function coastalContrast(hour:number,urban=false,coast=true){
  const cycle=Math.cos((hour-15)/24*Math.PI*2);
  const left=urban?20+4*cycle:coast?20+.7*cycle:20;
  const right=urban?left+3+1.5*(1-cycle)/2:coast?20+5*cycle:20;
  return {left,right,contrast:right-left};
}

/** A zonal-mean teaching cell; phase zero is the near-surface branch at the mid-latitude. */
export function circulationCell(inner:number,outer:number,phase:number,direct=true){
  const angle=phase*Math.PI*2*(direct?-1:1);
  return {latitude:(inner+outer)/2+(outer-inner)/2*Math.sin(angle),heightFraction:(1-Math.cos(angle))/2};
}
