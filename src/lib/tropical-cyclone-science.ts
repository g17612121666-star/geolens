/** Ideal Rankine vortex, steady gradient-wind balance at one level.
 * Constant air density 1.15 kg/m³, |f|=5e-5 /s, 30 km max-wind radius,
 * 101300 Pa at 300 km. Not a surface-wind or storm forecast. */
export function tropicalVortex(radiusM:number,maximumWind:number){
 const r=Math.max(0,Math.min(300000,radiusM)),rm=30000,ro=300000,v=maximumWind,f=5e-5,rho=1.15;
 const wind=r<=rm?v*r/rm:v*rm/r;
 const centrifugal=r<=rm?.5*v*v*(2-(r/rm)**2-(rm/ro)**2):.5*v*v*rm*rm*(1/(r*r)-1/(ro*ro));
 const coriolis=r<=rm?f*v*rm*(.5*(1-(r/rm)**2)+Math.log(ro/rm)):f*v*rm*Math.log(ro/r);
 return {wind,pressure:101300-rho*(centrifugal+coriolis)};
}
