export const LIGHT_KM_S=299792.458;
export const AU_KM=149597870.7;
export const JULIAN_YEAR_S=365.25*86400;
export const LIGHT_YEAR_KM=LIGHT_KM_S*JULIAN_YEAR_S;
export const DISTANCE_STOPS=[
 {name:'Earth–Moon',distanceKm:384400,unit:'km',value:384400,origin:'Earth',target:'Moon',originRadiusKm:6371.0084,targetRadiusKm:1737.4},
 {name:'Sun–Earth reference',distanceKm:AU_KM,unit:'AU',value:1,origin:'Sun',target:'Earth',originRadiusKm:695700,targetRadiusKm:6371.0084},
 {name:'Nearest stellar neighbor',distanceKm:4.24*LIGHT_YEAR_KM,unit:'light-years',value:4.24,origin:'Sun',target:'Proxima Centauri',originRadiusKm:695700,targetRadiusKm:695700*.154},
];
export function distanceModel(stop:number,progress:number){const s=DISTANCE_STOPS[stop];return {...s,lightSeconds:s.distanceKm/LIGHT_KM_S,pulseKm:s.distanceKm*Math.max(0,Math.min(1,progress)),originRadius:6*s.originRadiusKm/s.distanceKm,targetRadius:6*s.targetRadiusKm/s.distanceKm};}
