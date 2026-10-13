/** NASA planetary fact sheet; fixed reference spin, not a cloud-weather model.
 * https://nssdc.gsfc.nasa.gov/planetary/factsheet/
 * Positive spin about the physical north axis; >90° obliquity produces retrograde
 * Venus/Uranus relative to ecliptic north, avoiding a second sign reversal. */
export const SPIN_HOURS=[1407.6,5832.5,23.9345,24.6229,9.925,10.7,17.2,16.1];
export const AXIAL_TILT=[.034,177.36,23.44,25.19,3.13,26.73,97.77,28.32];
export function spinAngle(index:number,years:number){return ((years*365.25*24/SPIN_HOURS[index])%1)*Math.PI*2;}
