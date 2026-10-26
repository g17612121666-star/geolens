import test from 'node:test';
import assert from 'node:assert/strict';
import {tropicalVortex} from '../src/lib/tropical-cyclone-science.ts';
test('ideal vortex has calm center, max wind at eyewall and fixed outer pressure',()=>{
 for(const v of [38,62,80]){assert.equal(tropicalVortex(0,v).wind,0);assert.equal(tropicalVortex(30000,v).wind,v);assert.equal(tropicalVortex(300000,v).pressure,101300);assert.ok(tropicalVortex(0,v).pressure<tropicalVortex(30000,v).pressure);}
});
test('pressure gradient independently satisfies steady radial gradient-wind balance',()=>{
 for(const v of [38,62,80])for(const r of [1000,15000,45000,150000]){const derivative=(tropicalVortex(r+.1,v).pressure-tropicalVortex(r-.1,v).pressure)/.2,w=tropicalVortex(r,v).wind;assert.ok(Math.abs(derivative-1.15*(w*w/r+5e-5*w))<1e-8);}
});
