/** Y is up, +Z is north, -X is east (a right-handed local sky frame). */
export function skyPosition(latitude:number,declination:number,solarHour:number,radius=1.8):[number,number,number]{
 const p=latitude*Math.PI/180,d=declination,h=(solarHour/24-.5)*Math.PI*2;
 return [Math.cos(d)*Math.sin(h)*radius,(Math.sin(p)*Math.sin(d)+Math.cos(p)*Math.cos(d)*Math.cos(h))*radius,(Math.cos(p)*Math.sin(d)-Math.sin(p)*Math.cos(d)*Math.cos(h))*radius];
}
