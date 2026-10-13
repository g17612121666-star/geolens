import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createWeatherClient,parseWeather,weatherUrl,weatherCsv} from '../src/lib/weather.ts';
const point={lat:51.51,lon:-.13,name:'London'};
function fixture(){return {latitude:51.5,longitude:-.12,elevation:24,current_units:{temperature_2m:'°C',wind_speed_10m:'m/s'},hourly_units:{precipitation:'mm'},current:{time:'2026-09-18T23:45',temperature_2m:14,wind_speed_10m:3.5,interval:900},hourly:{time:Array.from({length:72},(_,i)=>new Date(Date.UTC(2026,8,18,23+i)).toISOString().slice(0,16)),temperature_2m:Array(72).fill(14),precipitation:Array(72).fill(0)}};}
test('a late-evening request explicitly asks for 72 hourly steps in UTC and SI',()=>{
  const u=new URL(weatherUrl(point));assert.equal(u.searchParams.get('forecast_hours'),'72');assert.equal(u.searchParams.get('timezone'),'GMT');assert.equal(u.searchParams.get('wind_speed_unit'),'ms');
  const result=parseWeather(fixture(),u.toString());assert.equal(result.hours.length,72);assert.equal(result.hours.at(-1).time,'2026-09-21T22:00');
});
test('missing gust, pressure and rain remain absent, never default estimates or false zero',()=>{
  const f=fixture();f.hourly.precipitation[1]=null;const r=parseWeather(f,weatherUrl(point));
  assert.equal(r.current.gust,null);assert.equal(r.current.pressure,null);assert.equal(r.hours[1].precipitation,null);assert.equal(r.hours[0].precipitation,0);
  assert.match(weatherCsv(r,point),/2026-09-19T00:00Z,14,,,/);
});
test('hourly map wind uses the selected hour direction, retains north at zero, and exports missing directions as blank',()=>{
  assert.ok(new URL(weatherUrl(point)).searchParams.get('hourly').split(',').includes('wind_direction_10m'));
  const f=fixture();f.current.wind_direction_10m=270;
  f.hourly.wind_speed_10m=[3,4,5];f.hourly.wind_direction_10m=[0,180,null];
  const r=parseWeather(f,weatherUrl(point));
  assert.equal(r.current.windDir,270);assert.equal(r.hours[0].windDir,0);assert.equal(r.hours[1].windDir,180);assert.equal(r.hours[2].windDir,null);assert.equal(r.hours[3].windDir,null);
  const lines=weatherCsv(r,point).split('\r\n');
  assert.match(lines[3],/wind_from_degrees/);assert.equal(lines[4],'2026-09-18T23:00Z,14,0,3,0,');assert.equal(lines[6],'2026-09-19T01:00Z,14,0,5,,');
});
test('invalid units and malformed response fail visibly instead of mislabelling data',()=>{
  const f=fixture();f.current_units.wind_speed_10m='km/h';assert.throws(()=>parseWeather(f,'x'),/units/);assert.throws(()=>parseWeather({},'x'),/incomplete/);
  assert.throws(()=>weatherUrl({lat:95,lon:0}),/latitude/);
});
test('repeated classroom clicks reuse the cache, but different points do not',async()=>{
  let calls=0,time=0;const client=createWeatherClient(async()=>{calls++;return Response.json(fixture());},()=>time);
  await client(point);await client(point);assert.equal(calls,1);
  await client({lat:0,lon:0});assert.equal(calls,2);
  time=601000;await client(point);assert.equal(calls,3);
});
test('429 Retry-After suppresses further requests until the service permits them',async()=>{
  let calls=0,time=0;const client=createWeatherClient(async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});},()=>time);
  await assert.rejects(client(point),e=>e.retryAt===120000);await assert.rejects(client({lat:0,lon:0}),/rate-limited/);assert.equal(calls,1);
  time=120001;await assert.rejects(client(point),/rate-limited/);assert.equal(calls,2);
});
test('superseded requests remain cancelled and cannot become classroom samples',async()=>{
  const controller=new AbortController();let started;
  const ready=new Promise(r=>started=r);
  const client=createWeatherClient((_url,{signal})=>new Promise((_resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')));}));
  const pending=client(point,controller.signal);await ready;controller.abort();await assert.rejects(pending,e=>e.name==='AbortError');
});
