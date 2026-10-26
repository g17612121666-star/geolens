/** Invented periodic 100 km² catchments. Millimeters of catchment-equivalent water.
 * Daily buckets conserve precipitation between loss, snow, quick routing, slow groundwater
 * (baseflow), optional dam and outflow. */
export function annualRiverRegime(snowFed:boolean,dam:boolean){
 let snow=0,routing=0,ground=0,reservoir=0;const series=[] as {day:number;temperature:number;precipitation:number;snowfall:number;melt:number;snow:number;flow:number;loss:number;store:number}[];
 let initialStore=0,precipitationTotal=0,lossTotal=0,outflowTotal=0;
 for(let year=0;year<20;year++)for(let day=0;day<365;day++){
  if(year===19&&day===0)initialStore=snow+routing+ground+reservoir;
  const summer=Math.cos((day-200)/365*2*Math.PI),temperature=snowFed?10*summer:10+6*summer,precipitation=snowFed?2.2+.3*Math.cos((day-15)/365*2*Math.PI):2.5+1.4*Math.cos((day-20)/365*2*Math.PI),snowfall=temperature<0?precipitation:0;
  snow+=snowfall;const melt=Math.min(snow,Math.max(0,temperature)*3);snow-=melt;
  const liquid=precipitation-snowfall+melt,loss=liquid*(snowFed?.25:.4);routing+=.7*(liquid-loss);ground+=.3*(liquid-loss);
  const quick=routing*(1-Math.exp(-1/(snowFed?7:10))),base=ground*(1-Math.exp(-1/120));routing-=quick;ground-=base;
  const routed=quick+base;let outflow=routed;
  if(dam){reservoir+=routed;outflow=reservoir*(1-Math.exp(-1/60));reservoir-=outflow;}
  if(year===19){precipitationTotal+=precipitation;lossTotal+=loss;outflowTotal+=outflow;series.push({day,temperature,precipitation,snowfall,melt,snow,flow:outflow*1e5/86400,loss,store:snow+routing+ground+reservoir});}
 }
 return {series,initialStore,finalStore:snow+routing+ground+reservoir,precipitationTotal,lossTotal,outflowTotal};
}
/** Invented sloping catchment. Clamp the outlet so Float32 mesh edges stay finite. */
export function catchmentRelief(x:number,z:number){
 return .08+.7*Math.max(0,(1.6-x)/3.2)**1.2+.3*(z/1.6)**2;
}
