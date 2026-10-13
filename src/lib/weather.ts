/** Open-Meteo model output. SI units, UTC timestamps, no invented replacements. */
export type WeatherPoint = { lat: number; lon: number; name: string };
export type WeatherHour = { time: string; temperature: number | null; precipitation: number | null; wind: number | null; windDir: number | null; cloud: number | null };
export type WeatherReading = {
  time: string; interval: number; temperature: number | null; apparent: number | null;
  wind: number | null; windDir: number | null; gust: number | null; pressure: number | null;
  precip: number | null; cloud: number | null; humidity: number | null; visibility: number | null; code: number | null;
};
export type WeatherResult = { current: WeatherReading; hours: WeatherHour[]; fetchedAt: number; grid: { lat: number; lon: number; elevation: number | null }; url: string };
export class WeatherError extends Error {
  retryAt: number;
  constructor(message: string, retryAt = 0) { super(message); this.name = 'WeatherError'; this.retryAt = retryAt; }
}
const numeric = (n: unknown): number | null => typeof n === 'number' && Number.isFinite(n) ? n : null;
const timestamp = (s: unknown) => typeof s === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(s) && Number.isFinite(Date.parse(s+'Z'));
export function weatherUrl(point: Pick<WeatherPoint,'lat'|'lon'>): string {
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon) || Math.abs(point.lat)>90 || Math.abs(point.lon)>180) throw new WeatherError('Choose a valid latitude and longitude.');
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.search = new URLSearchParams({ latitude:point.lat.toFixed(3), longitude:point.lon.toFixed(3),
    current:'temperature_2m,apparent_temperature,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl,precipitation,cloud_cover,relative_humidity_2m,weather_code,visibility',
    hourly:'temperature_2m,precipitation,wind_speed_10m,wind_direction_10m,cloud_cover', forecast_hours:'72',
    temperature_unit:'celsius', wind_speed_unit:'ms', precipitation_unit:'mm', timezone:'GMT',
  }).toString();
  return url.toString();
}
export function parseWeather(payload: unknown, url: string, fetchedAt = Date.now()): WeatherResult {
  const json = payload as Record<string,any> | null;
  const c = json?.current, h = json?.hourly;
  if (!c || !timestamp(c.time) || !h || !Array.isArray(h.time) || h.time.length===0) throw new WeatherError('The weather response was incomplete. Please try again.');
  if (json?.current_units?.temperature_2m !== '°C' || json?.current_units?.wind_speed_10m !== 'm/s' || json?.hourly_units?.precipitation !== 'mm') throw new WeatherError('The weather response used unexpected units.');
  const hours: WeatherHour[] = h.time.slice(0,72).map((time: unknown,i:number) => {
    if (!timestamp(time)) throw new WeatherError('The forecast contained an invalid timestamp.');
    return {time:time as string,temperature:numeric(h.temperature_2m?.[i]),precipitation:numeric(h.precipitation?.[i]),wind:numeric(h.wind_speed_10m?.[i]),windDir:numeric(h.wind_direction_10m?.[i]),cloud:numeric(h.cloud_cover?.[i])};
  });
  const gridLat=numeric(json?.latitude), gridLon=numeric(json?.longitude);
  if (gridLat===null || gridLon===null) throw new WeatherError('The model grid location was missing.');
  return {current:{time:c.time,interval:numeric(c.interval) ?? 900,temperature:numeric(c.temperature_2m),apparent:numeric(c.apparent_temperature),wind:numeric(c.wind_speed_10m),windDir:numeric(c.wind_direction_10m),gust:numeric(c.wind_gusts_10m),pressure:numeric(c.pressure_msl),precip:numeric(c.precipitation),cloud:numeric(c.cloud_cover),humidity:numeric(c.relative_humidity_2m),visibility:numeric(c.visibility),code:numeric(c.weather_code)},
    hours, fetchedAt,grid:{lat:gridLat,lon:gridLon,elevation:numeric(json?.elevation)},url};
}

/** A small per-tab cache prevents repeat classroom clicks consuming API quota. */
export function createWeatherClient(fetcher: typeof fetch = fetch, now = Date.now) {
  const cache = new Map<string,WeatherResult>();
  let retryAt = 0;
  return async (point: Pick<WeatherPoint,'lat'|'lon'>, signal?: AbortSignal): Promise<WeatherResult> => {
    const url = weatherUrl(point);
    const cached = cache.get(url);
    if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
    if (cached && now()-cached.fetchedAt<600_000) return cached;
    if (now()<retryAt) throw new WeatherError('The weather service is rate-limited. Please wait before retrying.',retryAt);
    const timeout = AbortSignal.timeout(12_000);
    const combined = signal ? AbortSignal.any([signal,timeout]) : timeout;
    try {
      const response = await fetcher(url,{signal:combined});
      if (response.status===429) {
        const header=response.headers.get('Retry-After');
        const seconds=header && /^\d+$/.test(header) ? Number(header) : 0;
        retryAt=Math.max(now()+60_000,seconds ? now()+seconds*1000 : header ? Date.parse(header) || 0 : 0);
        throw new WeatherError('The weather service is rate-limited. Please wait before retrying.',retryAt);
      }
      if (!response.ok) throw new WeatherError(`The weather service could not complete this request (${response.status}). The map is still available.`);
      const result=parseWeather(await response.json(),url,now());
      cache.set(url,result);
      if(cache.size>24) cache.delete(cache.keys().next().value!);
      return result;
    } catch(error) {
      if(signal?.aborted) throw new DOMException('Cancelled','AbortError');
      if(error instanceof WeatherError) throw error;
      throw new WeatherError(timeout.aborted ? 'The weather request timed out. Please try again.' : 'The weather service could not be reached. Check the connection and try again.');
    }
  };
}
export const fetchWeather = createWeatherClient();
export const weatherNumber = (value: number | null | undefined,unit: string,digits=1) => value==null ? '—' : `${value.toFixed(digits)} ${unit}`;
export function compass(deg: number) { return ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'][Math.round((((deg%360)+360)%360)/22.5)%16]; }
const WMO: Record<number,string> = {0:'Clear sky',1:'Mainly clear',2:'Partly cloudy',3:'Overcast',45:'Fog',48:'Depositing rime fog',51:'Light drizzle',53:'Drizzle',55:'Dense drizzle',56:'Light freezing drizzle',57:'Dense freezing drizzle',61:'Light rain',63:'Rain',65:'Heavy rain',66:'Light freezing rain',67:'Heavy freezing rain',71:'Light snow',73:'Snow',75:'Heavy snow',77:'Snow grains',80:'Rain showers',81:'Rain showers',82:'Violent rain showers',85:'Snow showers',86:'Heavy snow showers',95:'Thunderstorm',96:'Thunderstorm with hail',99:'Thunderstorm with hail'};
export const weatherDescription = (code:number|null) => code===null ? 'Weather code unavailable' : WMO[code] ?? `Weather code ${code}`;
export function weatherCsv(result: WeatherResult, point: WeatherPoint): string {
  return [`# Open-Meteo model output; educational; not a warning service`, `# Requested latitude ${point.lat}; longitude ${point.lon}; fetched ${new Date(result.fetchedAt).toISOString()}`,
    `# Model grid ${result.grid.lat},${result.grid.lon}; source ${result.url}`,
    'time_utc,temperature_C,precipitation_mm_preceding_hour,wind_10m_m_s,wind_from_degrees,cloud_percent',
    ...result.hours.map(h=>[h.time+'Z',h.temperature,h.precipitation,h.wind,h.windDir,h.cloud].map(n=>n??'').join(','))].join('\r\n');
}
