import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {shellSection,orbitPosition} from '../src/labs/shared/science-geometry.ts';
import {latLonToXYZ,xyzToLatLon} from '../src/lib/geo.ts';
import {hillHeight,contours} from '../src/labs/contours/geometry.ts';
import {riverSurface,riverTerrain} from '../src/labs/shared/river-terrain.ts';

test('geographic markers agree with Three equirectangular Earth UV, including east longitudes',()=>{
  const sphere=new THREE.SphereGeometry(1,72,36);sphere.rotateY(Math.PI/2);
  const p=sphere.attributes.position,uv=sphere.attributes.uv;
  for(let i=0;i<p.count;i++){
    if(uv.getY(i)<.01||uv.getY(i)>.99)continue;
    const lat=uv.getY(i)*180-90,lon=uv.getX(i)*360-180;
    const expected=new THREE.Vector3(...latLonToXYZ(lat,lon));
    assert.ok(expected.distanceTo(new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)))<1e-6);
  }
  for(const [lat,lon] of [[51.5,-.1],[-33.87,151.21],[35,179.9],[-80,-170]]){
    const value=xyzToLatLon(...latLonToXYZ(lat,lon));assert.ok(Math.abs(value.lat-lat)<1e-8&&Math.abs(value.lon-lon)<1e-8);
  }
});
test('Kepler orbit has correct periapsis, apoapsis, closure and greater speed near periapsis',()=>{
  const distance=t=>new THREE.Vector3(...orbitPosition(t,.4,3)).length();
  assert.ok(Math.abs(distance(0)-1.8)<1e-10);assert.ok(Math.abs(distance(.5)-4.2)<1e-10);
  const speed=t=>new THREE.Vector3(...orbitPosition(t+.001,.4,3)).distanceTo(new THREE.Vector3(...orbitPosition(t,.4,3)));
  assert.ok(speed(0)>speed(.5)*2);assert.ok(new THREE.Vector3(...orbitPosition(0,.4)).distanceTo(new THREE.Vector3(...orbitPosition(1,.4)))<1e-8);
});
test('core and mantle shell geometry stays within specified radii and includes separate closed cut faces',()=>{
  for(const [inner,outer] of [[0,1221/6371],[1221/6371,3480/6371],[3480/6371,1-35/6371]]){
    const g=shellSection(inner,outer,1.4),p=g.attributes.position;
    assert.equal(g.groups.length,2);assert.ok(g.groups[1].count>300);
    for(let i=0;i<p.count;i++){
      const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));assert.ok(Number.isFinite(r)&&r<=outer+1e-6&&r>=inner-1e-6);
    }g.dispose();
  }
});
test('contours are consistent with source terrain and interval changes',()=>{
  const fine=contours(5),coarse=contours(20);assert.equal(fine.length,20);assert.equal(coarse.length,5);
  for(const line of fine)for(const p of line.points)assert.ok(Math.abs(hillHeight(...p)-line.height)<.12);
});
test('river surface faces upward and river terrain includes closed substrate faces',()=>{
  for(const q of [.2,.7,1.6]){const water=riverSurface(q),n=water.attributes.normal;for(let i=0;i<n.count;i++)assert.ok(n.getY(i)>0);water.dispose();}
  const land=riverTerrain();assert.equal(land.groups.length,2);assert.ok(land.groups[1].count>1000);land.dispose();
});
