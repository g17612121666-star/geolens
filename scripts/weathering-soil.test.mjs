import test from 'node:test';
import assert from 'node:assert/strict';
import {freezingJoint,calciteDissolution} from '../src/lib/weathering-science.ts';
import {SOIL_PROFILES,catenaProfile} from '../src/lib/soil-profile-science.ts';
test('freezing conserves water mass while increasing volume',()=>{
 for(const f of [0,.3,.8,1]){const v=freezingJoint(f);assert.ok(Math.abs(v.liquidVolume*1000+v.iceVolume*917-7)<1e-10);assert.ok(Math.abs(v.jointWidth*.7*.5-v.liquidVolume-v.iceVolume)<1e-10);}
});
test('dissolution preserves solid plus dissolved calcite equivalent',()=>{
 const initial=calciteDissolution(0).remainingMass;for(const p of [0,.5,1]){const v=calciteDissolution(p);assert.ok(Math.abs(v.remainingMass+v.dissolvedMass-initial)<1e-10);}
});
test('soil examples have ordered depths without compulsory E or R horizons',()=>{
 for(const p of SOIL_PROFILES){let depth=0;for(const h of p.horizons){assert.ok(h.bottom>depth);depth=h.bottom;}assert.equal(depth,2);assert.ok(!p.horizons.some(h=>h.code==='E'));}
 for(const s of [.2,.55,1])for(let x=-3;x<=3;x+=.05){const p=catenaProfile(x,s);assert.ok(p.thicknessM>0&&p.surface-p.thicknessM> -1.5);}
 assert.ok(catenaProfile(-.7,1).thicknessM<catenaProfile(-.7,.2).thicknessM);
});
