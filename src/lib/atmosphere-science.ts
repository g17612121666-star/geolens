export function saturationPressure(celsius:number){return 6.112*Math.exp(17.67*celsius/(celsius+243.5));}
/** Parcel experiment: fixed dry (9.8) and approximate saturated (6) lapse rates, °C/km. */
export function mountainParcel(heightM:number,crestM:number,rh:number,leeward=false){
  const start=20,humidity=Math.max(.2,Math.min(1,rh)),gamma=Math.log(humidity)+17.625*start/(243.04+start),dew=243.04*gamma/(17.625-gamma);
  const lcl=125*(start-dew),cloudDepth=Math.max(0,crestM-lcl),crestTemperature=start-9.8*Math.min(lcl,crestM)/1000-6*cloudDepth/1000;
  const height=Math.max(0,Math.min(crestM,heightM));
  const temperature=leeward?crestTemperature+9.8*(crestM-height)/1000:start-9.8*Math.min(lcl,height)/1000-6*Math.max(0,height-lcl)/1000;
  const pressure=(h:number)=>1013.25*Math.exp(-h/8430),initialVapour=humidity*saturationPressure(start),initialMixing=.622*initialVapour/(1013.25-initialVapour);
  const saturatedMixing=(h:number,temp:number)=>.622*saturationPressure(temp)/(pressure(h)-saturationPressure(temp));
  const mixing=leeward?Math.min(initialMixing,saturatedMixing(crestM,crestTemperature)):Math.min(initialMixing,saturatedMixing(height,temperature));
  const vapour=mixing*pressure(height)/(.622+mixing);
  return {temperature,relativeHumidity:Math.min(1,vapour/saturationPressure(temperature)),lcl,crestTemperature,condensedGrams:Math.max(0,(initialMixing-mixing)*1000)};
}
