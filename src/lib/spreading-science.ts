/** Deliberately invented reversal history (experiment Ma), not the geomagnetic time scale. */
export const EXPERIMENT_REVERSALS=[0,.35,.9,1.15,1.9,2.2,2.9,3.4,4,4.15,4.7,5.1,5.5,6];
export function spreadingCrust(distanceKm:number,fullRateMmYr:number,timeMa:number){
  // 1 mm/year = 1 km/Ma; the half rate applies to one ridge flank.
  const halfRate=fullRateMmYr/2,ageMa=Math.abs(distanceKm)/halfRate,formationMa=timeMa-ageMa;
  const polarity=EXPERIMENT_REVERSALS.filter(t=>t<=formationMa).length%2;
  return {ageMa,formationMa,polarity,subsidenceM:350*Math.sqrt(ageMa),halfRate};
}
