/** Local Airy loading, no flexure or ocean load. Densities kg/m³; thicknesses meters. */
export const AIRY={crustDensity:2800,mantleDensity:3300,iceDensity:917,crustThickness:35000};
export function isostaticColumn(iceMetres:number){
  const ice=Math.max(0,iceMetres),root=(AIRY.crustDensity*AIRY.crustThickness+AIRY.iceDensity*ice)/AIRY.mantleDensity;
  return {root,landElevation:AIRY.crustThickness-root,depression:AIRY.iceDensity*ice/AIRY.mantleDensity};
}
