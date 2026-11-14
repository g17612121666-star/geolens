/** Local linear density approximation, not TEOS-10. Common reference pressure;
 * Absolute Salinity in g/kg, temperature in °C, density in kg/m³. */
export function classroomDensity(temperature:number,salinity:number){
  return 1027*(1-2e-4*(temperature-10)+7.6e-4*(salinity-35));
}
/** Prescribed teaching states, not ENSO-index regressions. */
export function ensoSection(phase:number){
  const p=Math.max(-1,Math.min(1,phase));
  return {westDepth:180-60*p,eastDepth:60+(p>0?50:40)*p,westTemperature:29-.5*p,eastTemperature:24+3*p,
    tradeStrength:1-.65*p,upwelling:1-.7*p,ascentX:-1.7+1.4*Math.max(0,p)+.2*Math.min(0,p),
    phase:p<-.3?'La Niña':p>.3?'El Niño':'Neutral'};
}
/**
 * Surface routes of the five subtropical gyres, as closed lists of waypoints:
 * [latitude, longitude east (may run past 180), relative speed, warmth].
 * Speed is on one scale for every basin (1 ≈ 2 m/s, the fastest Gulf Stream and Agulhas cores);
 * warmth runs from −1 (cool water carried toward the equator) to +1 (warm water carried poleward).
 * Western boundary currents are narrow and fast, eastern ones broad and slow (westward
 * intensification). Routes follow the continental margins schematically, not survey tracks.
 */
export const SUBTROPICAL_GYRES = [
  {name:'North Atlantic',center:[28,-45],western:'Gulf Stream',eastern:'Canary Current',route:[
    [14,-27,.15,.1],[14,-40,.17,.2],[15,-52,.2,.3],[19,-62,.22,.45],[22,-68,.25,.55],[25.5,-74.5,.35,.7],
    [28.5,-79.6,.7,.9],[31,-79.2,.85,1],[33,-77.3,.95,1],[35.3,-74.8,1,1],[37.5,-70,.9,.95],[39.5,-62,.7,.9],
    [41,-52,.5,.7],[40.5,-42,.3,.45],[37.5,-31,.2,.2],[35,-21,.15,0],[31.5,-14,.13,-.5],[28.5,-13,.12,-.9],
    [24,-17.5,.12,-1],[20,-19,.12,-1],[16,-21,.13,-.6],[14,-27,.15,.1]]},
  {name:'South Atlantic',center:[-25,-15],western:'Brazil Current',eastern:'Benguela Current',route:[
    [-5,5,.18,.1],[-6,-12,.2,.25],[-8,-28,.22,.4],[-10,-33.5,.25,.6],[-14,-37.5,.3,.85],[-19,-38.3,.35,1],
    [-23.5,-41.2,.4,1],[-28,-46.5,.4,.95],[-33,-50.5,.35,.85],[-38,-54,.3,.6],[-40,-45,.2,.3],[-40,-30,.15,.1],
    [-39,-15,.14,-.1],[-37,0,.13,-.3],[-34,13,.13,-.7],[-30,14.5,.13,-1],[-25,12.5,.13,-1],[-20,10.5,.13,-.9],
    [-14,8,.15,-.5],[-8,5.5,.17,-.1],[-5,5,.18,.1]]},
  {name:'North Pacific',center:[28,185],western:'Kuroshio',eastern:'California Current',route:[
    [17,236,.15,-.2],[15,205,.17,.1],[13,170,.2,.25],[14,140,.22,.45],[16,127,.3,.6],[19.5,123.5,.5,.85],
    [23.5,122.6,.7,1],[27,126.5,.75,1],[29.5,130.5,.8,1],[32.5,134.2,.85,1],[33.5,137.8,.9,1],[35.2,141.8,.9,1],
    [36.5,147,.75,.95],[38,155,.55,.85],[40,170,.3,.5],[41.5,190,.2,.2],[42,210,.15,0],[40,226,.13,-.4],
    [37,234.5,.12,-.85],[33,238.2,.12,-1],[28,243.3,.12,-1],[23,246,.12,-.8],[19.5,242,.13,-.5],[17,236,.15,-.2]]},
  {name:'South Pacific',center:[-25,220],western:'East Australian Current',eastern:'Peru / Humboldt Current',route:[
    [-6,272,.18,0],[-9,235,.2,.15],[-11,195,.2,.3],[-12.5,172,.22,.4],[-15,158,.28,.6],[-21,154,.45,.85],
    [-25.5,154.3,.6,1],[-28.7,154.4,.7,1],[-31.8,153.8,.7,1],[-33.8,157,.45,.8],[-33,165,.3,.6],[-32.5,172.8,.25,.5],
    [-37.5,183,.2,.3],[-42,205,.15,.1],[-43,235,.14,-.1],[-42,262,.13,-.4],[-40,281,.13,-.7],[-35,284.3,.12,-.95],
    [-28,286.2,.12,-1],[-20,287.3,.12,-1],[-15,283.3,.13,-.9],[-10,279.8,.15,-.6],[-6,272,.18,0]]},
  {name:'Indian Ocean',center:[-25,75],western:'Agulhas Current',eastern:'West Australian Current',route:[
    [-12,105,.18,.25],[-14,90,.2,.3],[-15,72,.2,.4],[-15.5,58,.25,.5],[-18,51.5,.35,.65],[-22,49.8,.4,.75],
    [-26.3,46.3,.45,.85],[-28.5,40,.55,.9],[-30,32.2,.8,1],[-32.8,29.2,1,1],[-35,26,.95,1],[-37,22,.8,.95],
    [-39.5,19.5,.6,.8],[-40.3,24.5,.45,.6],[-40,32,.3,.45],[-40,50,.2,.25],[-39,75,.15,0],[-37,95,.13,-.3],
    [-33.5,109,.12,-.7],[-28,110.5,.12,-1],[-22,109.5,.12,-1],[-16,107.5,.14,-.6],[-12,105,.18,.25]]},
] as const;
/** Waypoints of a western boundary current (warm, carried poleward) and of an eastern one. */
export const WARM_BRANCH=.85,COOL_BRANCH=-.85;
