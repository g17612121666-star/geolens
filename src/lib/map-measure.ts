type Point = {lat:number;lon:number};
const R=6371, D=Math.PI/180;
const dot=(a:number[],b:number[])=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a:number[],b:number[])=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=(p:Point)=>[Math.cos(p.lat*D)*Math.cos(p.lon*D),Math.cos(p.lat*D)*Math.sin(p.lon*D),Math.sin(p.lat*D)];
/** Smaller spherical polygon bounded by great-circle edges; simple polygons only. */
export function sphericalAreaKm2(points:Point[]) {
  if(points.length<3)return 0;
  const a=unit(points[0]);let sum=0;
  for(let i=1;i<points.length-1;i++) {
    const b=unit(points[i]),c=unit(points[i+1]);
    sum+=2*Math.atan2(dot(a,cross(b,c)),1+dot(a,b)+dot(b,c)+dot(c,a));
  }
  const area=Math.abs(sum)%(4*Math.PI);
  return Math.min(area,4*Math.PI-area)*R*R;
}
/** Densified geodesic path with continuous longitude for crossing the dateline. */
export function geodesicCoordinates(points:Point[],close=false) {
  const path=close&&points.length>2?[...points,points[0]]:points;
  const result:number[][]=[];
  function add(p:Point){let lon=p.lon;const last=result.at(-1);if(last){while(lon-last[0]>180)lon-=360;while(lon-last[0]<-180)lon+=360;}result.push([lon,p.lat]);}
  path.forEach((p,i)=>{
    if(!i){add(p);return;}
    const a=unit(path[i-1]),b=unit(p),angle=Math.acos(Math.max(-1,Math.min(1,dot(a,b)))),n=Math.max(1,Math.ceil(angle/D/2));
    if(Math.abs(Math.sin(angle))<1e-8){add(p);return;}
    for(let j=1;j<=n;j++){const t=j/n,v=a.map((x,k)=>(x*Math.sin((1-t)*angle)+b[k]*Math.sin(t*angle))/Math.sin(angle));add({lat:Math.atan2(v[2],Math.hypot(v[0],v[1]))/D,lon:Math.atan2(v[1],v[0])/D});}
  });
  return result;
}
