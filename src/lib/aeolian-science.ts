/** Analytic comparison dune. Wind is +x; centre slip-face slope is tan(32°).
 * Shape is prescribed, not an aeolian transport solution. Scene units are 10 m. */
export function duneHeight(x:number,z:number){
 const q=Math.abs(z)/1.35;if(q>=1)return 0;
 const crest=-.5+1.75*q*q,h=.52*(1-q*q),stoss=4*h,lee=h/Math.tan(32*Math.PI/180),d=x-crest;
 if(d< -stoss||d>lee)return 0;
 return d<0?h*(1+d/stoss):h*(1-d/lee);
}
/** Upturned-hull profile along the wind (a = 0 upwind, 1 downwind): blunt steep head, long tapering tail. */
export function yardangProfile(a:number){return a<=0||a>=1?0:a<.25?(a/.25)**.5:((1-a)/.75)**1.2;}
export function yardangHeight(x:number,z:number){
 let h=0;for(const centre of [-.95,0,.95]){const a=(x+1.9)/4.4;if(a<=0||a>=1)continue;const halfWidth=.34*(1-a)**.6;h=Math.max(h,.72*yardangProfile(a)*Math.exp(-(((z-centre)/halfWidth)**4)));}return h;
}
