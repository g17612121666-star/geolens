import test from 'node:test';
import assert from 'node:assert/strict';
import {SLUMP,slumpSurface,slumpBase,slumpStability,rotateSlump} from '../src/lib/slump-science.ts';
test('slip circle meets the ground and rotation preserves radius and pair distances',()=>{
 for(const x of [SLUMP.left,SLUMP.right])assert.ok(Math.abs(slumpBase(x)-slumpSurface(x))<1e-10);
 for(const x of [-2,-1,0,1])for(const a of [0,.1,.3]){const p=rotateSlump(x,slumpBase(x),a);assert.ok(Math.abs(Math.hypot(p[0],p[1]-SLUMP.centreY)-SLUMP.radius)<1e-10);}
 const a=rotateSlump(...[SLUMP.left,slumpSurface(SLUMP.left)],.2),b=rotateSlump(...[SLUMP.right,slumpSurface(SLUMP.right)],.2);assert.ok(Math.abs(Math.hypot(b[0]-a[0],b[1]-a[1])-Math.hypot(SLUMP.right-SLUMP.left,slumpSurface(SLUMP.right)-slumpSurface(SLUMP.left)))<1e-10);
});
test('Bishop iteration converges; pore pressure reduces resistance for the selected slope',()=>{
 let previous=Infinity;for(const r of [0,.15,.5,1]){const result=slumpStability(r);assert.ok(Math.abs(result.residual)<1e-9);assert.ok(result.factor<previous);previous=result.factor;}
 assert.ok(slumpStability(0).factor>1);assert.ok(slumpStability(1).factor<1);
 const result=slumpStability(.6,0,2),analytic=result.slices.reduce((sum,s)=>sum+2*s.b/Math.cos(s.alpha),0)/result.driving;assert.ok(Math.abs(result.factor-analytic)<1e-10);
 assert.ok(Math.abs(slumpStability(.5,15,2,320).factor-slumpStability(.5).factor)<.002);
});
