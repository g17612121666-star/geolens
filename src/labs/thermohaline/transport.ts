/** A finite illustrative release from the centre of the tank, not a calculated settling speed. */
export function densityParcelHeight(t:number,densityDifference:number){
 const direction=Math.abs(densityDifference)<.005?0:Math.sign(densityDifference);
 return -1-direction*.76*Math.max(0,Math.min(1,t));
}
