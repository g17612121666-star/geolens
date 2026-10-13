export function hillHeight(x:number,z:number) {
  const main=100*Math.exp(-((x+.35)**2/1.9+z*z/1.1));
  const spur=35*Math.exp(-((x-1.05)**2/.85+(z+.8)**2/.16));
  const valley=23*Math.exp(-((x+.2)**2/.11+(z-1.0)**2/.8));
  return Math.max(0, main+spur-valley);
}
/** Marching triangles: interpolation follows the exact same sampled terrain vertices. */
export function contours(interval:number,n=128) {
  const out:{height:number;points:[number,number][]}[]=[];
  for(let level=interval;level<=100;level+=interval){
    const points:[number,number][]=[];
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){
      const x=-3+i*6/n,z=-2+j*4/n;
      const corners:[[number,number],[number,number],[number,number],[number,number]]=[[x,z],[x+6/n,z],[x+6/n,z+4/n],[x,z+4/n]];
      for(const tri of [[0,1,2],[0,2,3]]){
        const hit:[number,number][]=[];
        for(let k=0;k<3;k++){
          const a=corners[tri[k]],b=corners[tri[(k+1)%3]],ha=hillHeight(...a),hb=hillHeight(...b);
          if((ha<level)===(hb<level))continue;
          const f=(level-ha)/(hb-ha);hit.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);
        }
        if(hit.length===2)points.push(...hit);
      }
    }
    out.push({height:level,points});
  }
  return out;
}
