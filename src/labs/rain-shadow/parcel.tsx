import { useMemo } from "react";
import * as THREE from "three";
import { GuideLine } from "@/labs/shared/guide-line";
import { Line } from "@react-three/drei";
import { useLabState } from "@/lib/store/lab-controls";
import { useIsCompact } from "@/hooks/use-media";
import { useLabTick } from "@/labs/tick";
import { mountainParcel } from "@/lib/atmosphere-science";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
import { PlantStand } from "../shared/natural-world";
import { GeomorphicTerrain, GrassPatch } from "../shared/geomorphic-terrain";
import { landscapeRandom as random } from "../shared/landscape-noise";
import { AirStreaks, OrographicCloud, ParcelBubble } from "./parts";
import {
  BASE,
  DEPTH,
  WIDTH,
  airTemperature,
  climate,
  ground,
  groundColor,
  ridge,
  temperatureColor,
  toScene,
} from "./terrain";

/**
 * The range in section: a granite pluton under the crest, with a lobate contact, intruded into
 * foliated schist that the magma baked darker next to it (a contact aureole).
 */
const SECTION = {
  soil: 0.035,
  regolith: 0.07,
  soilTone: "thin",
  custom: `
  vec2 q=vec2(p.x+p.z,p.y);
  float lobes=.12*(sFbm(vec2(p.y*2.2,p.z*.8+4.))-.5)+.04*sin(p.y*7.+p.z*2.);
  float d=abs(p.x-.08)-(.42+.32*max(0.,1.25-p.y)+lobes),core=1.-smoothstep(-.015,.015,d);
  vec3 granite=mix(vec3(.66,.63,.6),vec3(.57,.55,.53),g)*mix(.93,1.05,sNoise(q*3.));
  vec2 cq=q*60.,ci=floor(cq),cf=fract(cq)-.5;
  float hc=sHash(ci+3.),crystal=1.-smoothstep(.17,.25,length(cf-(vec2(sHash(ci),sHash(ci+7.))-.5)*.45));
  granite=mix(granite,vec3(.2,.2,.21),crystal*step(.68,hc)*.75);
  granite=mix(granite,vec3(.88,.85,.8),crystal*step(hc,.22)*.45);
  granite=mix(granite,vec3(.8,.64,.57),crystal*step(.22,hc)*step(hc,.32)*.35);
  float fol=fract(p.y*6.5-abs(p.x)*.55+.3*sin(p.x*2.4)+.25*sNoise(q*3.));
  vec3 schist=mix(vec3(.43,.44,.42),vec3(.55,.54,.5),smoothstep(.15,.55,fol)*smoothstep(1.,.75,fol));
  schist*=mix(.9,1.06,g)*mix(.78,1.,smoothstep(0.,.14,d));
  return mix(schist,granite,core);`,
} as const;

export default function RainShadow() {
  const { params, t, trueScale } = useLabState("params", "t", "trueScale");
  useLabTick(1 / 30);
  const crest = params.ridge ?? 2100,
    humidity = (params.wind ?? 70) / 100,
    f = trueScale ? 1 : 2.5;
  const zones = useMemo(() => climate(crest, humidity), [crest, humidity]);
  const height = useMemo(() => (x: number, z: number) => ground(x, z, crest, f), [crest, f]);
  const color = useMemo(() => {
    const c = new THREE.Color();
    return (x: number, y: number, z: number) =>
      "#" + groundColor(x, y, z, zones, f, c).getHexString();
  }, [zones, f]);
  // Forest on the windward slopes up to the tree line; scattered junipers, sage and dry grass
  // on the lee, thinning as the rain shadow strengthens. Plants are not to scale.
  const plants = useMemo(() => {
    const treeTop = toScene(zones.treeline, f),
      conifers: [number, number, number][] = [],
      junipers: [number, number, number][] = [],
      shrubs: [number, number, number][] = [];
    for (let i = 0; i < 420; i++) {
      const x = -2.9 + 5.8 * random(i + 475),
        z = -1.18 + 2.36 * random(i + 491),
        y = ground(x, z, crest, f);
      if (Math.abs(z) < 0.22 || y > treeTop) continue;
      const lee = THREE.MathUtils.smoothstep(x, -0.25, 0.95) * zones.dryness,
        r = random(i + 523);
      if (x < 0.2 && r < 0.5 - 0.35 * lee) conifers.push([x, y - 0.004, z]);
      else if (x > 0.2 && r < 0.12 * (1 - lee) + 0.05) junipers.push([x, y - 0.003, z]);
      else if (x > 0.2 && r > 0.72) shrubs.push([x, y - 0.002, z]);
    }
    return { conifers, junipers, shrubs };
  }, [zones, crest, f]);

  const x = -3 + t * 6,
    metres = ridge(x, crest),
    parcel = mountainParcel(metres, crest, humidity, x > 0),
    downstream = mountainParcel(0, crest, humidity, true),
    saturated = parcel.relativeHumidity > 0.99 && x < 0.05,
    parcelY = toScene(metres, f) + 0.2;
  // The parcel's path, colored by its temperature as it cools and warms again.
  const path = useMemo(() => {
    const points: [number, number, number][] = [],
      colors: THREE.Color[] = [];
    for (let i = 0; i <= 128; i++) {
      const xx = -3 + (i / 128) * 6;
      points.push([xx, toScene(ridge(xx, crest), f) + 0.2, 0.05]);
      colors.push(temperatureColor(airTemperature(xx, crest, humidity)));
    }
    return { points, colors };
  }, [crest, humidity, f]);
  const compact = useIsCompact(),
    cloudLabel = `Cloud base ≈ ${(Math.round(zones.lcl / 10) * 10).toLocaleString("en-US")} m`;
  const cloudBase = toScene(zones.lcl, f),
    cloudStart = zones.cloud ? -Math.sqrt(-1.05 * Math.log(Math.min(0.999, zones.lcl / crest))) : 0;
  return (
    <>
      <ScienceStudio
        slug="rain-shadow"
        scale="Relief ×2.5 · parcel ascent and descent · simplified lapse rates · plants and clouds not to scale"
        trueScale="1 scene unit = 3 km in every direction · parcel marker, plants and clouds enlarged"
        camera={[0.7, 2.2, 8]}
      >
        <GeomorphicTerrain
          height={height}
          color={color}
          width={WIDTH}
          depth={DEPTH}
          base={BASE}
          resolution={160}
          section={SECTION}
          cliff={0.5}
          mottle={0.1}
        />
        <PlantStand positions={plants.conifers} scale={0.075} kind="conifer" seed={5} />
        <PlantStand positions={plants.junipers} scale={0.045} kind="conifer" seed={9} />
        <GrassPatch positions={plants.shrubs} height={0.07} color="#9d9a6b" />
        <Line points={path.points} vertexColors={path.colors} lineWidth={2.4} />
        <AirStreaks crest={crest} humidity={humidity} f={f} />
        <Arrow from={[-2.95, 0.75, 0.05]} to={[-2.05, 0.75, 0.05]} color="#8fd2de" width={1.4} />
        <ParcelBubble
          position={[x, parcelY, 0.05]}
          temperature={parcel.temperature}
          saturated={saturated}
        />
        {!compact && (
          <Tag
            pos={[x, parcelY + 0.3, 0.05]}
            text={`${parcel.temperature.toFixed(1)} °C · ${(parcel.relativeHumidity * 100).toFixed(0)}% RH`}
            tone="sandstone"
            note="The air parcel's temperature and relative humidity at this point, from the lab's parcel model."
            occlude={false}
          />
        )}
        {zones.cloud && (
          <>
            <OrographicCloud crest={crest} lcl={zones.lcl} f={f} />
            <GuideLine
              points={[
                [-3, cloudBase, 0.05],
                [cloudStart, cloudBase, 0.05],
              ]}
              color="#cfe3ea"
              dashed
              dashSize={0.08}
              gapSize={0.06}
              lineWidth={1.5}
            />
            <Tag
              pos={[compact ? -1.75 : -2.45, cloudBase + 0.13, 0.05]}
              text={compact ? "3" : cloudLabel}
              title={compact ? `3 · ${cloudLabel}` : undefined}
              tone="ice"
              note="Rising air cools until it reaches its dew point. Condensation then starts: the lifting condensation level. The model puts it about 125 m higher for every 1 °C between the starting temperature and dew point."
              occlude={false}
            />
          </>
        )}
        <Tag
          pos={[
            compact ? -2.6 : -2.3,
            (compact ? 1.3 : 1.05) + (zones.cloud && cloudBase > 0.85 ? 0.45 : 0),
            0.05,
          ]}
          text={compact ? "1" : "Wind · windward side rising"}
          title={compact ? "1 · Wind · windward side rising" : undefined}
          note="Unsaturated air cools at about 9.8 °C/km. Above cloud base the model uses 6 °C/km; real saturated rates vary with temperature and pressure. Forest grows on the wetter windward slopes."
          occlude={false}
        />
        <Tag
          pos={[2, 1.05, 0.05]}
          text={compact ? "2" : "Leeward · descending"}
          title={compact ? "2 · Leeward · descending" : undefined}
          note="Once its condensed water has rained out, the sinking air warms at about 9.8 °C/km, so it arrives warmer and drier. The lee slopes get less rain: steppe, sagebrush and scattered junipers instead of forest."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {compact && (
          <div className="mb-2 text-chalk">
            {"1 · Wind, windward side rising · 2 · Leeward, descending"}
            {zones.cloud ? ` · 3 · ${cloudLabel}` : ""}
          </div>
        )}
        {"Parcel "}
        {metres.toFixed(0)} {"m · "}
        {parcel.temperature.toFixed(1)} {"°C · RH "}
        {(parcel.relativeHumidity * 100).toFixed(0)}
        {"%. Cloud base ≈ "}
        {Math.max(0, zones.lcl).toFixed(0)} {"m. Leeward foot: "}
        {downstream.temperature.toFixed(1)} {"°C, "}
        {(downstream.relativeHumidity * 100).toFixed(0)}
        {"% RH."} <br />
        {"Windward foot (start): 20 °C, "}
        {(humidity * 100).toFixed(0)}
        {"% RH. "}
        {crest <= zones.lcl
          ? "This ridge is too low for the air to reach cloud base."
          : "Condensation removes moisture as the air crosses the ridge."}{" "}
        {Number.isFinite(zones.snowline) &&
          `Above about ${(Math.round(zones.snowline / 50) * 50).toLocaleString("en-US")} m the air is below freezing, so snow falls there. `}
        {"Colors along the path show the air's temperature: blue is cold, orange is warm."}
      </ScienceReadout>
    </>
  );
}
