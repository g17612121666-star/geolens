/** Fixed water mass, density ratio approximately 1 / 0.917 near freezing. */
export function freezingJoint(fraction:number){const f=Math.max(0,Math.min(1,fraction)),initialVolume=.02*.7*.5;return {liquidVolume:initialVolume*(1-f),iceVolume:initialVolume*f/0.917,jointWidth:.02*((1-f)+f/0.917),initialVolume};}
/** Prescribed dissolution of a spherical calcite clast; not a kinetic law. */
export function calciteDissolution(progress:number){const radius=.3*(1-.65*Math.max(0,Math.min(1,progress))),volume=4*Math.PI*radius**3/3,initial=4*Math.PI*.3**3/3;return {radius,remainingMass:volume*2710,dissolvedMass:(initial-volume)*2710};}
