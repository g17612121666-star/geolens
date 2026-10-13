/** Distances and heights in km. Ideal slopes, not diagnosed from an observed sounding. */
export function frontSection(progress:number){
  const p=Math.max(0,Math.min(1,progress)),coldFront=-180+480*p,warmFront=100+80*p,ceiling=6.5;
  const cold=(x:number)=>Math.max(0,Math.min(ceiling,(coldFront-x)/50));
  const cool=(x:number)=>Math.max(0,Math.min(ceiling,(x-warmFront)/150));
  const warmBase=(x:number)=>Math.max(cold(x),cool(x));
  const meeting=(3*coldFront+warmFront)/4;
  return {coldFront,warmFront,ceiling,cold,cool,warmBase,meeting,liftAtMeeting:Math.max(0,(coldFront-warmFront)/200),occluded:coldFront>=warmFront};
}
