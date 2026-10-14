import { InstancedMesh, Object3D } from "three";
import { useRef, useLayoutEffect } from "react";
import { GuideLine as Line } from "@/labs/shared/guide-line";
import { EarthMesh, Graticule } from "@/components/globe/earth";
import { latLonToXYZ } from "@/lib/geo";
import { circulationCell } from "@/lib/circulation-science";
import { useLabControls } from "@/lib/store/lab-controls";
import { useLabTick } from "@/labs/tick";
import { ScienceStudio, ScienceReadout, Arrow } from "../shared/science-kit";
import { Tag } from "../shared/kit";
function CondensationBelt({ latitude, radius }: { latitude: number; radius: number }) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const dummy = new Object3D();
    for (let i = 0; i < 420; i++) {
      const lat = latitude + 2.5 * Math.sin(i * 19.37),
        lon = (i * 2.399 * 180) / Math.PI;
      dummy.position.set(
        ...latLonToXYZ(lat, lon, radius + 0.014 + Math.sin(i * 7.17) ** 2 * 0.012),
      );
      dummy.scale.set(0.026, 0.014, 0.023);
      dummy.rotation.set(i * 0.8, i * 0.31, 0);
      dummy.updateMatrix();
      ref.current.setMatrixAt(i, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [latitude, radius]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, 420]}>
      <sphereGeometry args={[1, 10, 6]} />
      <meshBasicMaterial color="#d4e5e6" transparent opacity={0.43} depthWrite={false} />
    </instancedMesh>
  );
}
export default function ThreeCell() {
  const { params, t, trueScale } = useLabControls();
  useLabTick(1 / 55);
  const three = (params.three ?? 1) > 0.5,
    itcz = 10 * Math.sin((t - 0.218) * Math.PI * 2),
    radius = 1.5,
    height = trueScale ? (radius * 12000) / 6371000 : 0.34;
  const bands = three
    ? [
        { name: "Hadley", a: itcz, b: 30, direct: true, color: "#dbb986" },
        { name: "Ferrel", a: 30, b: 60, direct: false, color: "#94c6c5" },
        { name: "Polar", a: 60, b: 89, direct: true, color: "#d7e4e3" },
      ]
    : [{ name: "One cell", a: itcz, b: 89, direct: true, color: "#dbb986" }];
  return (
    <>
      <ScienceStudio
        slug="three-cell"
        camera={[0, 1, 5.5]}
        lights={false}
        scale="Cell depth enlarged · zonal-mean circulation, not individual weather systems"
        trueScale="Cell depth 12 km, Earth radius 6371 km · wind arrows enlarged"
      >
        <group rotation={[0, Math.PI, 0]}>
          <EarthMesh radius={radius} lighting="viewer" />
          <Graticule radius={radius * 1.003} />
          {!trueScale && <CondensationBelt latitude={itcz} radius={radius} />}
          <Line
            points={Array.from({ length: 181 }, (_, i) =>
              latLonToXYZ(itcz, -180 + i * 2, radius * 1.009),
            )}
            color="#dfab77"
            lineWidth={3}
          />
          {[-1, 1].flatMap((hemisphere) =>
            bands.map((band, k) => {
              const inner = k === 0 ? itcz : band.a * hemisphere,
                outer = band.b * hemisphere,
                lon = -80;
              const point = (u: number) => {
                const c = circulationCell(inner, outer, u, band.direct);
                return latLonToXYZ(c.latitude, lon, radius * 1.004 + height * c.heightFraction);
              };
              return (
                <group key={`${hemisphere}-${band.name}`}>
                  <Line
                    points={Array.from({ length: 129 }, (_, i) => point(i / 128))}
                    color={band.color}
                    lineWidth={2}
                  />
                  {[0, 0.25, 0.5, 0.75].map((u) => (
                    <Arrow
                      key={u}
                      from={point(u)}
                      to={point(u + 0.025)}
                      color={band.color}
                      width={0.38}
                    />
                  ))}
                  {[0, 0.33, 0.66].map((n) => (
                    <mesh key={n} position={point((t * 10 + n) % 1)}>
                      <sphereGeometry args={[0.025, 12, 8]} />
                      <meshBasicMaterial color={band.color} />
                    </mesh>
                  ))}
                </group>
              );
            }),
          )}
          {[-75, -45, -15, 15, 45, 75].map((lat) => {
            const eastward = Math.abs(lat) > 30 && Math.abs(lat) < 60,
              from = latLonToXYZ(lat, 35, radius * 1.009),
              to = latLonToXYZ(
                lat +
                  (Math.abs(lat) < 30
                    ? -Math.sign(lat)
                    : Math.abs(lat) < 60
                      ? Math.sign(lat)
                      : -Math.sign(lat)) *
                    5,
                35 + (eastward ? 15 : -15),
                radius * 1.009,
              );
            return three ? (
              <Arrow
                key={lat}
                from={from}
                to={to}
                color={eastward ? "#94c6c5" : "#dbb986"}
                width={0.4}
              />
            ) : null;
          })}
        </group>
        {bands.map((b, i) => (
          <Tag
            key={b.name}
            pos={[-2.6, 0.25 + i * 0.63, 0]}
            text={b.name}
            note={
              b.name === "Ferrel"
                ? "The Ferrel cell is a zonal-mean, thermally indirect circulation maintained mainly by midlatitude eddy transports. Real air follows weather systems, not a neat permanent loop."
                : `${b.name}: near-surface equatorward return, ascent at the lower-latitude end, poleward flow aloft and descent farther poleward. Boundaries vary in reality.`
            }
            occlude={false}
          />
        ))}
        <Tag
          pos={[2.1, Math.sin((itcz * Math.PI) / 180) * radius + 0.1, 0]}
          text={`ITCZ ${Math.abs(itcz).toFixed(1)}°${itcz < 0 ? "S" : "N"}`}
          note="The model prescribes a ±10° annual shift. Real ITCZ position varies with longitude, land, oceans and season; it does not follow a single solar-latitude formula."
          occlude={false}
        />
      </ScienceStudio>
      <ScienceReadout>
        {three
          ? "Hadley and Polar cells are driven by rising warm air and sinking cold air; the Ferrel cell is sustained by heat and momentum transferred by weather systems."
          : "Without rotation, this model shows one large circulation cell in each hemisphere, with rising tropical air and sinking polar air."}
        <br />
        {three ? "Gold: tropical / polar surface easterlies · blue: midlatitude westerlies. " : ""}
        {
          "The enlarged cloud belt follows the prescribed ITCZ; it is not observed cloud or a rainfall forecast. It is omitted at true scale."
        }
      </ScienceReadout>
    </>
  );
}
