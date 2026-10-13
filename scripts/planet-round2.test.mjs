import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {volcanoGeometry,volcanoHeight} from '../src/labs/volcanoes/geometry.ts';
import {projectedPosition,geographicCircle} from '../src/labs/map-projections/projection.ts';
import {skyPosition} from '../src/labs/solar-altitude/sky.ts';
import {SPIN_HOURS,AXIAL_TILT,spinAngle} from '../src/labs/solar-system/rotation.ts';

test('incised volcanic surfaces stay finite through end members and cut openings',()=>{
 for(const v of [0,.25,.7,1])for(const opening of [0,.5*Math.PI,.72*Math.PI]){
  const {body,caps,radius}=volcanoGeometry(v,opening);
  for(const g of [body,...caps]){for(const key of ['position','normal'])for(const n of g.attributes[key].array)assert.ok(Number.isFinite(n));g.computeBoundingSphere();assert.ok(Number.isFinite(g.boundingSphere.radius));g.dispose();}
  // The numerical outer-radius overshoot of float32 vertices must never raise a
  // negative base to a fractional exponent (the previous terrain NaN class).
  assert.ok(Number.isFinite(volcanoHeight(v,Math.fround(radius)+1e-7,1.5,opening)));
  if(opening){const r=radius*.5;assert.ok(Math.abs(volcanoHeight(v,r,opening/2,opening)-volcanoHeight(v,r,2*Math.PI-opening/2,opening))<1e-12);}
 }
});

test('projection overlays agree with surface positions and preserve the selected invariants',()=>{
 for(const kind of [0,1,2])for(const morph of [0,.3,1])for(const lat of [-75,0,75])for(const lon of [-150,0,150]){
  const p=projectedPosition(lat,lon,morph,kind);assert.ok(p.every(Number.isFinite));if(morph===0)assert.ok(Math.abs(Math.hypot(...p)-1.4)<1e-12);if(morph===1)assert.ok(Math.abs(p[2])<1e-12);
 }
 const area=lat=>{const d=.0001,p=projectedPosition(lat,0,1,1),x=projectedPosition(lat,d,1,1),y=projectedPosition(lat+d,0,1,1);return (x[0]-p[0])*(y[1]-p[1])/Math.cos(lat*Math.PI/180);};
 assert.ok(Math.abs(area(60)/area(0)-1)<2e-6,'equal-area map local area scales with spherical cos(latitude)');
 const circle=geographicCircle(60,120);for(const [lat,lon] of circle){const p=lat*Math.PI/180,l=(lon-120)*Math.PI/180,a=Math.acos(Math.sin(Math.PI/3)*Math.sin(p)+Math.cos(Math.PI/3)*Math.cos(p)*Math.cos(l));assert.ok(Math.abs(a-4*Math.PI/180)<1e-12);}
});

test('one selected sidereal rotation returns each body to its start without reversing retrograde axes twice',()=>{
 for(let i=0;i<8;i++){const year=SPIN_HOURS[i]/(365.25*24);assert.ok(Math.abs(Math.sin(spinAngle(i,year)))<1e-10);assert.ok(Math.abs(spinAngle(i,year/4)-Math.PI/2)<1e-10);}
 assert.ok(Math.cos(AXIAL_TILT[1]*Math.PI/180)<0);assert.ok(Math.cos(AXIAL_TILT[6]*Math.PI/180)<0);assert.ok(Math.cos(AXIAL_TILT[2]*Math.PI/180)>0);
});

test('lunar asset provenance preserves measured relief scale independently of albedo',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/textures/planets/moon-terrain.source.json',import.meta.url)));
 assert.equal(data.height.referenceRadiusKm,1737.4);assert.equal(data.height.verticalExaggeration,1);
 assert.ok(data.height.sourceRangeKm[0]>data.height.encodedKm[0]);assert.ok(data.height.sourceRangeKm[1]<data.height.encodedKm[1]);
 assert.ok(data.sources.every(s=>s.url.startsWith('https://svs.gsfc.nasa.gov/')&&s.sha256.length===64));
});

test('solar-time scrub moves the Sun east to west with a closed daily path and finite polar geometry',()=>{
 const east=skyPosition(0,0,6),noon=skyPosition(0,0,12),west=skyPosition(0,0,18);
 assert.ok(east[0]<0&&west[0]>0);assert.ok(Math.abs(east[1])<1e-12&&Math.abs(west[1])<1e-12);assert.ok(Math.abs(noon[1]-1.8)<1e-12);
 for(const lat of [-90,-51.5,0,51.5,90])for(const decl of [-23.44,0,23.44])for(const hour of [0,6,12,18,24]){const p=skyPosition(lat,decl*Math.PI/180,hour);assert.ok(p.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...p)-1.8)<1e-12);}
 assert.ok(skyPosition(90,23.44*Math.PI/180,0)[1]>0);assert.ok(skyPosition(90,-23.44*Math.PI/180,12)[1]<0);
});
