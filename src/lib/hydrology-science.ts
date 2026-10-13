/** Illustrative 1 km² catchment. Explicit losses + delay + a mass-conserving linear reservoir. */
export function stormHydrograph(urban:number,rainMultiplier:number){
  const c=.25+.6*Math.max(0,Math.min(1,urban)),tau=6-4.8*urban,delay=2-1.7*urban,dt=.05,area=1e6;
  const rain=(h:number)=>h>=0&&h<4?Math.max(0,20*(1-Math.abs(h-2)/2))*rainMultiplier:0;
  const rows=[];let storage=0,outflow=0,precipitation=0,loss=0,translated=0;
  for(let i=0;i<960;i++){
    const h=(i+.5)*dt,precip=rain(h)*dt*area/1000,input=rain(h-delay)*c*area/1000;
    precipitation+=precip;loss+=precip*(1-c);translated+=input*dt;
    const next=storage*Math.exp(-dt/tau)+input*tau*(1-Math.exp(-dt/tau));
    const volume=storage+input*dt-next;outflow+=volume;storage=next;
    rows.push({hour:(i+1)*dt,rain:rain(h),q:volume/(dt*3600),storage,outflow,precipitation,loss});
  }
  const peak=rows.reduce((a,b)=>a.q>b.q?a:b),queued=precipitation*c-translated;
  return {rows,peak,lag:peak.hour-2,tau,delay,coefficient:c,precipitation,loss,outflow,storage,queued};
}

/** Steady radial well: homogeneous aquifer, fixed head at R, fully penetrating well. */
export function wellHead(radius:number,pump:number,boundaryHead:number,confined:boolean){
  const K=10,R=500,rw=.2,b=12,r=Math.max(rw,Math.min(R,radius)),Q=Math.max(0,pump)*800;
  const logarithm=Math.log(R/r);
  return confined?boundaryHead-Q/(2*Math.PI*K*b)*logarithm:Math.sqrt(Math.max(0,boundaryHead**2-Q/(Math.PI*K)*logarithm));
}
