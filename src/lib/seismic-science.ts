/** Uniform, isotropic solid experiment. Velocities km/s, length km, time s. */
export const SEISMIC_SPEEDS={p:6,s:3.5,surface:3.2};
export function waveExperiment(seconds:number,depthKm:number,stationKm=50){
  const depth=Math.max(0,depthKm),distance=Math.hypot(depth,stationKm);
  const pRadius=Math.max(0,seconds)*SEISMIC_SPEEDS.p,sRadius=Math.max(0,seconds)*SEISMIC_SPEEDS.s;
  return {pRadius,sRadius,pArrival:distance/SEISMIC_SPEEDS.p,sArrival:distance/SEISMIC_SPEEDS.s,
    pSurfaceRadius:Math.sqrt(Math.max(0,pRadius*pRadius-depth*depth)),
    sSurfaceRadius:Math.sqrt(Math.max(0,sRadius*sRadius-depth*depth)),
    surfaceRadius:Math.max(0,seconds-depth/SEISMIC_SPEEDS.s)*SEISMIC_SPEEDS.surface};
}
