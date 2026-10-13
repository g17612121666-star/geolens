import test from 'node:test';
import assert from 'node:assert/strict';
import {solarEphemeris, solarReading, daylight, daysInYear, validSolarDate, solarAltitude, subsolarLongitude} from '../src/lib/solar.ts';
const rad=Math.PI/180;
test('solstices and equinox agree with known geometry',()=>{
  assert.ok(Math.abs(solarEphemeris(new Date('2026-06-21T12:00Z')).declination/rad-23.44)<0.05);
  assert.ok(Math.abs(solarEphemeris(new Date('2026-12-21T12:00Z')).declination/rad+23.44)<0.05);
  assert.ok(Math.abs(solarEphemeris(new Date('2026-03-20T14:46Z')).declination/rad)<0.02);
  assert.equal(daylight(45,0).hours,12);
});
test('London conventional June sunrise is near 03:43 UTC and December near 08:04',()=>{
  const june=solarReading(new Date('2026-06-21T12:00Z'),51.51,-0.13,23.44,true);
  const winter=solarReading(new Date('2026-12-21T12:00Z'),51.51,-0.13,23.44,true);
  assert.ok(Math.abs(june.sunriseUTC-(3+43/60))<5/60);
  assert.ok(Math.abs(winter.sunriseUTC-(8+4/60))<5/60);
  assert.ok(june.hours>16.5 && winter.hours<8);
});
test('equation of time advances UTC noon in November; longitude uses east positive',()=>{
  const d=new Date('2026-11-03T12:00Z');
  const a=solarReading(d,0,0), b=solarReading(d,0,30);
  assert.ok(a.equationOfTime>16 && a.noonUTC<12);
  assert.equal(a.noonUTC-b.noonUTC,2);
});
test('polar day/night have no fictional sunrise; exact pole/equinox is a horizon boundary',()=>{
  const north=solarReading(new Date('2026-06-21T12:00Z'),90,0);
  const south=solarReading(new Date('2026-06-21T12:00Z'),-90,0);
  assert.equal(north.polar,'day'); assert.equal(north.sunriseUTC,null);
  assert.equal(south.polar,'night'); assert.equal(south.sunsetUTC,null);
  assert.equal(daylight(90,0).polar,'horizon');
  assert.equal(daylight(45,solarEphemeris(new Date('2026-06-21T12:00Z'),0).declination).hours,12);
});
test('date parsing rejects rollover; leap-year slider has 366 days',()=>{
  assert.equal(validSolarDate('2026-02-29'),null); assert.equal(validSolarDate(''),null);
  assert.equal(daysInYear(2028),366); assert.equal(daysInYear(2100),365);
  assert.ok(validSolarDate('2028-02-29'));
});
test('globe sun direction and site reading share the same terminator',()=>{
  const e=solarEphemeris(new Date('2026-06-21T12:00Z'));
  const lon=subsolarLongitude(12,e.equationOfTime);
  assert.ok(Math.abs(solarAltitude(e.declination/rad,lon,e.declination,lon)-90)<0.00001);
  assert.ok(Math.abs(solarAltitude(0,lon+90,e.declination,lon))<0.00001);
  assert.ok(solarAltitude(90,0,e.declination,lon)>23);
});
