import test from 'node:test';import assert from 'node:assert/strict';
import {soilExport} from '../src/lib/soil-erosion-science.ts';
test('soil remains accounted for in source, transport and exported stores',()=>{
 for(const wind of [true,false])for(const cover of [true,false])for(const t of [0,1,30,60]){const r=soilExport(t,cover,wind);assert.ok(Math.abs(r.remaining+r.moving+r.exported-6000)<1e-8);assert.ok(r.moving>=-1e-10&&r.exported>=-1e-10);assert.ok(Math.abs(r.meanLossMm/1000*200*1500-r.detached)<1e-8);}
});
test('the explicit cover assumption lowers export under equal forcing and time',()=>{
 for(const wind of [true,false])assert.ok(soilExport(60,true,wind).exported<soilExport(60,false,wind).exported);
 const r=soilExport(10,false),dt=.0001,n=soilExport(10+dt,false);
 assert.ok(Math.abs((n.exported-r.exported)/dt-.15*r.moving)<.001);
});
