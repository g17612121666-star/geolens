/** Invented 20 × 10 m plot, top 20 mm active layer, dry bulk density 1500 kg/m³.
 * First-order detachment and a linear suspended store, not RUSLE/WEPP or a forecast. */
export function soilExport(minutes:number,covered:boolean,wind=false){
 const initial=6000,k=(wind?.002:.004)*(covered?.15:1),b=wind?.3:.15,t=Math.max(0,minutes),remaining=initial*Math.exp(-k*t),moving=initial*k/(b-k)*(Math.exp(-k*t)-Math.exp(-b*t)),exported=initial-remaining-moving;
 return {initial,remaining,moving,exported,detached:initial-remaining,meanLossMm:(initial-remaining)/(1500*200)*1000};
}
