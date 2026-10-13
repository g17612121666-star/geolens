import test from 'node:test';
import assert from 'node:assert/strict';
import {airDisplacement,wrapParcel} from '../src/labs/wind/advection.ts';
import {densityParcelHeight} from '../src/labs/thermohaline/transport.ts';
import {tidalPotential} from '../src/labs/tides/tidal-potential.ts';
const near=(actual,expected,tolerance=1e-9)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${actual} differs from ${expected}`);

test('steady geostrophic wind transports air and hemisphere reversal reverses eastward displacement',()=>{
 const nh=airDisplacement(86400,true,false,false,true),sh=airDisplacement(86400,true,false,true,true);
 near(nh[0],864000);near(nh[1],0);near(sh[0],-864000);near(sh[1],0);
 assert.notEqual(wrapParcel(nh[0]/150000),wrapParcel(0));
});
test('air motion integrates acceleration rather than multiplying current velocity by elapsed time',()=>{
 const t=7200,none=airDisplacement(t,false,false,false,false);near(none[0],0);near(none[1],.5*.001*t*t,1e-7);
 const inertial=airDisplacement(t,true,false,false,false),f=.0001,u=10;
 near(inertial[0],u*t-u/f*Math.sin(f*t),.2);near(inertial[1],u/f*(1-Math.cos(f*t)),.2);
});
test('rewinding the lesson returns exactly the same air and density-parcel state',()=>{
 const first=airDisplacement(12345,true,true,false,false);airDisplacement(86400,true,true,false,false);assert.deepEqual(airDisplacement(12345,true,true,false,false),first);
 for(const t of [0,.25,.5,1]){near(densityParcelHeight(t,1)+densityParcelHeight(t,-1),-2);near(densityParcelHeight(t,0),-1);assert.ok(densityParcelHeight(t,1)>=-1.76);assert.ok(densityParcelHeight(t,-1)<=-.24+1e-10);}
 assert.equal(densityParcelHeight(1,1),-1.76);assert.equal(densityParcelHeight(1,-1),-.24);
});
test('tidal potential is antipodally symmetric and responds to distance cubed',()=>{
 const r=384400,solar=.46;
 near(tidalPotential([1,0,0],[r,0,0]),1+solar);
 near(tidalPotential([-1,0,0],[r,0,0]),1+solar);
 near((tidalPotential([1,0,0],[r,0,0])-solar)/(tidalPotential([1,0,0],[r*2,0,0])-solar),8);
});
test('equatorial spring potential has a greater range than quarter-Moon potential',()=>{
 const range=moon=>{const values=Array.from({length:361},(_,i)=>{const a=i*Math.PI/180;return tidalPotential([Math.cos(a),0,Math.sin(a)],moon);});return Math.max(...values)-Math.min(...values);};
 near(range([384400,0,0]),2.19);near(range([0,0,384400]),.81);
});
