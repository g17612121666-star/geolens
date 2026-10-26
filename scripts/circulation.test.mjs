import test from 'node:test';
import assert from 'node:assert/strict';
import {coastalContrast,pressureCentreFlow,circulationCell} from '../src/lib/circulation-science.ts';
import {frontSection} from '../src/lib/front-science.ts';
test('coastal heating reverses between afternoon and night; urban contrast stays positive',()=>{
  assert.ok(coastalContrast(15).contrast>0);assert.ok(coastalContrast(3).contrast<0);
  for(let hour=0;hour<24;hour++){assert.ok(coastalContrast(hour,true).contrast>0);assert.equal(coastalContrast(hour,false,false).contrast,0);}
});
test('pressure-center rotation changes with hemisphere, convergence does not',()=>{
  for(const high of [true,false])for(const south of [true,false]){
    const v=pressureCentreFlow(1,0,high,south);assert.equal(Math.sign(v.east),high?1:-1);assert.equal(Math.sign(v.north),(high?-1:1)*(south?-1:1));assert.equal(v.vertical,high?-1:1);
  }
});
test('Hadley and Polar surface flow is equatorward in both hemispheres, Ferrel poleward',()=>{
  for(const sign of [-1,1])for(const direct of [true,false]){
    const start=circulationCell(30*sign,60*sign,0,direct),next=circulationCell(30*sign,60*sign,.001,direct);
    assert.equal(start.heightFraction,0);assert.equal(Math.sign((next.latitude-start.latitude)*sign),direct?-1:1);
    assert.ok(Math.abs(circulationCell(0,30,.5,direct).heightFraction-1)<1e-12);
  }
});
test('fronts catch at 70%, retain their slopes, and lift the warm layer after occlusion',()=>{
  const start=frontSection(0),catching=frontSection(.7),late=frontSection(.9);
  assert.ok(Math.abs(catching.coldFront-catching.warmFront)<1e-10);
  assert.ok(!start.occluded);assert.ok(late.occluded);assert.ok(late.liftAtMeeting>0);
  assert.ok(Math.abs(start.cold(-280)-start.cold(-230)-1)<1e-10);
  assert.ok(Math.abs(start.cool(250)-start.cool(100)-1)<1e-10);
  assert.ok(Math.abs(late.cold(late.meeting)-late.cool(late.meeting))<1e-10);
  assert.ok(Math.abs(late.warmBase(late.meeting)-late.liftAtMeeting)<1e-10);
});
