import test from 'node:test';
import assert from 'node:assert/strict';
import {radiationBudget,pressureWind} from '../src/lib/energy-wind-science.ts';
const close=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} != ${b}`);
test('radiative fluxes balance independently at surface, atmosphere and space',()=>{
  for(const a of [.1,.3,.9])for(const e of [0,.78,1]){const b=radiationBudget(a,e);close(b.incoming,b.reflected+b.outgoing);close(b.absorbed+b.backRadiation,b.surfaceUp);close(e*b.surfaceUp,2*b.atmosphereUp);}
  const bare=radiationBudget(.3,0),grey=radiationBudget(.3,.78);assert.ok(bare.surfaceK>254&&bare.surfaceK<255);assert.ok(grey.surfaceK>287&&grey.surfaceK<289);assert.ok(radiationBudget(.9,.78).surfaceK<grey.surfaceK);
});
test('NH/SH geostrophic winds balance the same pressure gradient with reversed zonal velocities',()=>{
  const nh=pressureWind(0,true,false,false),sh=pressureWind(0,true,false,true);close(nh.u,10);close(sh.u,-10);close(nh.v,0);close(sh.v,0);for(const w of [nh,sh])for(const a of w.acceleration)close(a,0);
});
test('friction turns steady flow towards lower pressure and slows it',()=>{
  for(const sh of [false,true]){const w=pressureWind(0,true,true,sh);assert.ok(w.v>0);assert.ok(w.speed<10);for(const a of w.acceleration)close(a,0);}
  const dragOnly=pressureWind(0,false,true);close(dragOnly.u,0);close(dragOnly.v,20);
});
test('transient solution starts at rest, satisfies equations, and undamped motion does not settle',()=>{
  for(const f of [true,false])for(const r of [true,false])for(const sh of [true,false]){
    const zero=pressureWind(0,f,r,sh,false);close(zero.speed,0);
    const w=pressureWind(12000,f,r,sh,false),later=pressureWind(12000.01,f,r,sh,false);
    close((later.u-w.u)/.01,w.acceleration[0],2e-9);close((later.v-w.v)/.01,w.acceleration[1],2e-9);
  }
  const full=pressureWind(2*Math.PI/1e-4,true,false,false,false);close(full.speed,0);
  close(pressureWind(7200,false,false).v,7.2);
});
