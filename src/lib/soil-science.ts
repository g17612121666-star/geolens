/** USDA fine-earth texture classes. Fractions are mass %, excluding fragments >2 mm. */
export function soilFractions(sand:number,clay:number){
  const sa=Math.max(0,Math.min(100,sand)),cl=Math.max(0,Math.min(100-sa,clay));return {sand:sa,clay:cl,silt:100-sa-cl};
}
export function soilTexture(sand:number,clay:number):string{
  const {sand:sa,clay:cl,silt:si}=soilFractions(sand,clay);
  if(si+1.5*cl<15)return 'Sand';
  if(si+2*cl<30)return 'Loamy sand';
  if((cl>=7&&cl<20&&sa>52)||(cl<7&&si<50))return 'Sandy loam';
  if(cl>=7&&cl<27&&si>=28&&si<50&&sa<=52)return 'Loam';
  if((si>=50&&cl>=12&&cl<27)||(si>=50&&si<80&&cl<12))return 'Silt loam';
  if(si>=80&&cl<12)return 'Silt';
  if(cl>=20&&cl<35&&si<28&&sa>45)return 'Sandy clay loam';
  if(cl>=27&&cl<40&&sa>20&&sa<=45)return 'Clay loam';
  if(cl>=27&&cl<40&&sa<=20)return 'Silty clay loam';
  if(cl>=35&&sa>45)return 'Sandy clay';
  if(cl>=40&&si>=40)return 'Silty clay';
  return 'Clay';
}
export const TEXTURE_COLOURS:Record<string,string>={'Sand':'#d8bd86','Loamy sand':'#baa479','Sandy loam':'#ad9c6c','Loam':'#789571','Silt loam':'#649e95','Silt':'#91bcc2','Sandy clay loam':'#ad8061','Clay loam':'#a890a4','Silty clay loam':'#788ca8','Sandy clay':'#b57b66','Silty clay':'#81758c','Clay':'#996c75'};
