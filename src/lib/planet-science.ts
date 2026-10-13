import {AU_KM} from './distance-science.ts';
/** JPL J2000 orbit shapes held fixed; selected ideal experiment, not a dated ephemeris. */
export const PLANETS=[
 {name:'Mercury',a:.38709927,e:.20563593,i:7.00497902,peri:77.45779628,node:48.33076593,radius:2439.4,period:.2408467,color:'#bbb3a8'},
 {name:'Venus',a:.72333566,e:.00677672,i:3.39467605,peri:131.60246718,node:76.67984255,radius:6051.8,period:.61519726,color:'#dfd1ac'},
 {name:'Earth',a:1.00000261,e:.01671123,i:0,peri:102.93768193,node:0,radius:6371.0084,period:1.0000174,color:'#7ab8be'},
 {name:'Mars',a:1.52371034,e:.09339410,i:1.84969142,peri:-23.94362959,node:49.55953891,radius:3389.5,period:1.8808476,color:'#c98f70'},
 {name:'Jupiter',a:5.202887,e:.04838624,i:1.30439695,peri:14.72847983,node:100.47390909,radius:69911,period:11.862615,color:'#c6b08e'},
 {name:'Saturn',a:9.53667594,e:.05386179,i:2.48599187,peri:92.59887831,node:113.66242448,radius:58232,period:29.447498,color:'#e0ca94'},
 {name:'Uranus',a:19.18916464,e:.04725744,i:.77263783,peri:170.9542763,node:74.01692503,radius:25362,period:84.016846,color:'#a4c7c7'},
 {name:'Neptune',a:30.06992276,e:.00859048,i:1.77004347,peri:44.96476227,node:131.78422574,radius:24622,period:164.79132,color:'#8eafc6'},
];
export function planetPosition(index:number,years:number):[number,number,number]{const p=PLANETS[index],M=((years/p.period)%1)*Math.PI*2;let E=M;for(let k=0;k<12;k++)E-=(E-p.e*Math.sin(E)-M)/(1-p.e*Math.cos(E));const x=p.a*(Math.cos(E)-p.e),y=p.a*Math.sqrt(1-p.e*p.e)*Math.sin(E),d=Math.PI/180,w=(p.peri-p.node)*d,o=p.node*d,i=p.i*d;
 // Ecliptic north is scene +Y; ecliptic +Y maps to scene -Z (right-handed).
 return [(Math.cos(w)*Math.cos(o)-Math.sin(w)*Math.sin(o)*Math.cos(i))*x+(-Math.sin(w)*Math.cos(o)-Math.cos(w)*Math.sin(o)*Math.cos(i))*y,Math.sin(w)*Math.sin(i)*x+Math.cos(w)*Math.sin(i)*y,-((Math.cos(w)*Math.sin(o)+Math.sin(w)*Math.cos(o)*Math.cos(i))*x+(-Math.sin(w)*Math.sin(o)+Math.cos(w)*Math.cos(o)*Math.cos(i))*y)];
}
export function planetRadiusAtOrbitScale(index:number,auScale:number){return PLANETS[index].radius/AU_KM*auScale;}
