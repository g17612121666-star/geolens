/** Selected ICS boundaries, chart 2026/06. Numbers date boundaries; they are not all definitions. */
export const GEOLOGIC_UNITS=[
 {name:'Hadean',old:4567,young:4031,color:'#8c668b'},
 {name:'Archean',old:4031,young:2500,color:'#aa817c'},
 {name:'Proterozoic',old:2500,young:538.8,color:'#be9d75'},
 {name:'Paleozoic',old:538.8,young:251.902,color:'#789f90'},
 {name:'Mesozoic',old:251.902,young:66,color:'#75a8b4'},
 {name:'Cenozoic',old:66,young:0,color:'#dbca90'},
];
export const TIME_WINDOWS=[4540,538.8,2.58];
export function timeUnit(age:number){return GEOLOGIC_UNITS.find(u=>age<=u.old&&age>=u.young)??GEOLOGIC_UNITS[0];}
/** Constant-radius helix: equal parameter increments have equal arc length. */
export function timeHelix(fraction:number):[number,number,number]{const a=fraction*6*Math.PI;return [1.8*Math.cos(a),-1.05+2.1*fraction,1.8*Math.sin(a)];}
