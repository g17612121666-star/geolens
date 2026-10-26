/** Prescribed landform sequences. Meters are relative to an arbitrary local datum. */
export function waterfallLip(progress:number){return 1.2-2.5*Math.max(0,Math.min(1,progress));}
export function waterfallBed(x:number,progress:number){const lip=waterfallLip(progress);return x<lip?1.6-.015*(x+3):.38-.012*(x-lip)-.12*Math.exp(-(((x-lip-.27)/.32)**2));}
export function waterfallLand(x:number,z:number,progress:number){const bed=waterfallBed(x,progress),bank=1.8-.015*(x+3);return bed+(bank-bed)*Math.min(1,(Math.abs(z)/.42)**6);}
/** Stokes settling for small isolated spherical quartz particles in still 20 °C fresh water.
 * Excludes turbulent suspension, flocculation and non-Stokes coarse grains. SI inputs. */
export function settlingVelocity(diameter:number){return (2650-998)*9.81*diameter**2/(18*1.002e-3);}
export function settlingDistance(diameter:number,depth=2,speed=.1){return speed*depth/settlingVelocity(diameter);}
