import test from 'node:test';
import assert from 'node:assert/strict';
import {waveExperiment} from '../src/lib/seismic-science.ts';
test('wavefronts start at the focus, reach the surface after finite time, and keep P faster than S',()=>{
  const initial=waveExperiment(0,20),early=waveExperiment(2,20),late=waveExperiment(10,20);
  assert.equal(initial.pRadius,0);assert.equal(early.pSurfaceRadius,0);assert.equal(early.surfaceRadius,0);
  assert.equal(late.pRadius,60);assert.equal(late.sRadius,35);assert.ok(late.pSurfaceRadius>late.sSurfaceRadius);
});
test('station arrivals follow straight-ray geometry and increase with focus depth',()=>{
  const w=waveExperiment(10,20);assert.ok(Math.abs(w.pArrival-Math.sqrt(2900)/6)<1e-12);assert.ok(w.sArrival>w.pArrival);
  assert.ok(waveExperiment(10,40).pArrival>waveExperiment(10,5).pArrival);
});
