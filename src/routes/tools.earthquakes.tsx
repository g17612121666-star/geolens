import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { ClientCanvas } from "@/components/globe/client-canvas";
import { EarthMesh } from "@/components/globe/earth";
import { PlateLines } from "@/labs/shared/geo-globe";
import { latLonToXYZ } from "@/lib/geo";
import { headFor } from "@/lib/seo";
import {
  DEPTH_COLOUR,
  FEEDS,
  QuakeError,
  boundarySegments,
  depthClass,
  distanceToBoundaryKm,
  fetchQuakes,
  markerRadius,
  type FeedId,
  type Quake,
} from "@/lib/quakes";

export const Route = createFileRoute("/tools/earthquakes")({
  component: EarthquakesTool,
  head: () =>
    headFor({
      title: "Live earthquakes",
      description:
        "Recent earthquakes from the USGS on a 3D globe with plate boundaries. Compare where earthquakes happen, how deep they are and how strong they were.",
      path: "/tools/earthquakes",
    }),
});

const NEAR_KM = 200;
const R = 1.004;

function useQuakeFeed(feed: FeedId) {
  const [state, setState] = useState<{
    feed: FeedId;
    quakes: Quake[] | null;
    error: string | null;
    loadedAt: number | null;
  }>({ feed, quakes: null, error: null, loadedAt: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ feed, quakes: null, error: null, loadedAt: null });
    fetchQuakes(feed, controller.signal)
      .then((quakes) => {
        if (!controller.signal.aborted)
          setState({ feed, quakes, error: null, loadedAt: Date.now() });
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setState({
            feed,
            quakes: null,
            error: e instanceof QuakeError ? e.message : "The earthquake feed is unavailable.",
            loadedAt: null,
          });
      });
    return () => controller.abort();
  }, [feed, version]);
  return { ...state, retry: () => setVersion((v) => v + 1) };
}

function useBoundaryDistances(quakes: Quake[] | null) {
  const [segments, setSegments] = useState<ReturnType<typeof boundarySegments> | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/geo/plate-boundaries.json")
      .then((r) => r.json())
      .then((geo) => live && setSegments(boundarySegments(geo)))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return useMemo(
    () =>
      quakes && segments
        ? new Map(quakes.map((q) => [q.id, distanceToBoundaryKm(q.lat, q.lon, segments)]))
        : null,
    [quakes, segments],
  );
}

function QuakePoints({
  quakes,
  selected,
  onSelect,
}: {
  quakes: Quake[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;
    const o = new THREE.Object3D(),
      c = new THREE.Color();
    quakes.forEach((q, i) => {
      o.position.set(...latLonToXYZ(q.lat, q.lon, R));
      o.scale.setScalar(markerRadius(q.mag) * (q.id === selected ? 1.6 : 1));
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(DEPTH_COLOUR[depthClass(q.depthKm)]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    invalidate();
  }, [quakes, selected, invalidate]);
  return (
    <instancedMesh
      key={quakes.length}
      ref={mesh}
      args={[undefined, undefined, quakes.length]}
      onClick={(e) => {
        e.stopPropagation();
        if (e.instanceId !== undefined) onSelect(quakes[e.instanceId].id);
      }}
    >
      <sphereGeometry args={[1, 14, 10]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
    </instancedMesh>
  );
}

/** Turns the camera to face a chosen earthquake, keeping its distance. */
function FocusOn({ quake }: { quake: Quake | null }) {
  const { camera, invalidate } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  useEffect(() => {
    if (!quake) return;
    goal.current = new THREE.Vector3(...latLonToXYZ(quake.lat, quake.lon, 1))
      .normalize()
      .multiplyScalar(camera.position.length());
    invalidate();
  }, [quake, camera, invalidate]);
  useFrame((_, dt) => {
    if (!goal.current) return;
    const len = camera.position.length();
    camera.position.lerp(goal.current, Math.min(1, dt * 4)).setLength(len);
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(goal.current) < 0.002) goal.current = null;
    invalidate();
  });
  return null;
}

function SelectedRing({ quake }: { quake: Quake | null }) {
  const ref = useRef<THREE.Mesh>(null);
  useLayoutEffect(() => {
    if (!quake || !ref.current) return;
    const p = new THREE.Vector3(...latLonToXYZ(quake.lat, quake.lon, R + 0.002));
    ref.current.position.copy(p);
    ref.current.lookAt(p.clone().multiplyScalar(2));
  }, [quake]);
  if (!quake) return null;
  const r = markerRadius(quake.mag) * 1.6 + 0.012;
  return (
    <mesh ref={ref}>
      <ringGeometry args={[r, r + 0.006, 48]} />
      <meshBasicMaterial color="#ffffff" toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

const fmtTime = (t: number) =>
  new Date(t).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";

function EarthquakesTool() {
  const [feed, setFeed] = useState<FeedId>("4.5_week");
  const { quakes, error, loadedAt, retry } = useQuakeFeed(feed);
  const distances = useBoundaryDistances(quakes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = quakes?.find((q) => q.id === selectedId) ?? null;
  const near = distances ? [...distances.values()].filter((d) => d <= NEAR_KM).length : null;
  const counts = useMemo(() => {
    const c = { shallow: 0, intermediate: 0, deep: 0 };
    for (const q of quakes ?? []) c[depthClass(q.depthKm)]++;
    return c;
  }, [quakes]);

  return (
    <main id="main" className="mx-auto max-w-[1280px] px-5 pb-24 pt-24">
      <p className="section-label">
        <Link to="/tools" className="hover:text-chalk">
          {"Tools"}
        </Link>
      </p>
      <h1 className="mt-3 font-display text-4xl md:text-5xl">{"Live earthquakes"}</h1>
      <p className="mt-4 max-w-3xl text-lg leading-8 text-mist">
        {
          "Recent earthquakes recorded by the US Geological Survey, plotted on a 3D globe with today’s plate boundaries. Look for where they cluster, and how deep they are."
        }
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <section aria-label="Earthquake globe">
          <div className="relative aspect-square max-h-[640px] w-full overflow-hidden rounded-2xl border border-white/10 bg-void">
            <ClientCanvas
              camera={{ position: [0.8, 1.2, 3.2], fov: 38 }}
              className="absolute inset-0"
            >
              <EarthMesh lighting="viewer" clouds={false} halo={false} glint={false} radius={1} />
              <Suspense fallback={null}>
                <PlateLines radius={1.003} />
              </Suspense>
              {quakes && (
                <QuakePoints quakes={quakes} selected={selectedId} onSelect={setSelectedId} />
              )}
              <SelectedRing quake={selected} />
              <FocusOn quake={selected} />
              <OrbitControls enablePan={false} minDistance={1.6} maxDistance={6} />
            </ClientCanvas>
            {!quakes && (
              <div
                role="status"
                className="absolute inset-x-4 bottom-4 rounded-xl border border-white/10 bg-basalt/90 p-4 text-sm"
              >
                {error ? (
                  <>
                    <p className="text-chalk">{error}</p>
                    <button
                      type="button"
                      onClick={retry}
                      className="mt-2 min-h-11 rounded-full border border-white/20 px-4 text-ice"
                    >
                      {"Try again"}
                    </button>
                  </>
                ) : (
                  <p className="text-mist">{"Loading recent earthquakes…"}</p>
                )}
              </div>
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-mist" aria-label="Key">
            {(["shallow", "intermediate", "deep"] as const).map((k) => (
              <li key={k} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="inline-block size-3 rounded-full"
                  style={{ background: DEPTH_COLOUR[k] }}
                />
                {k === "shallow"
                  ? "Shallow focus (under 70 km)"
                  : k === "intermediate"
                    ? "Intermediate (70–300 km)"
                    : "Deep (over 300 km)"}
              </li>
            ))}
            <li>{"Lines: plate boundaries · larger dot: higher magnitude"}</li>
          </ul>
          <p className="mt-2 text-xs leading-5 text-mist">
            {
              "Dots mark epicenters and are enlarged to be visible; they are not to scale. Drag to rotate the globe and select a dot or a row in the list to focus on it."
            }
          </p>
        </section>

        <section aria-label="Earthquake data" className="space-y-5">
          <label className="block text-sm text-mist">
            {"Show"}
            <select
              value={feed}
              onChange={(e) => {
                setFeed(e.target.value as FeedId);
                setSelectedId(null);
              }}
              className="mt-1 block min-h-11 w-full rounded-xl border border-white/15 bg-basalt px-3 text-chalk"
            >
              {FEEDS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          {quakes && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="font-display text-3xl text-chalk">
                {quakes.length} {quakes.length === 1 ? "earthquake" : "earthquakes"}
              </p>
              {near !== null && quakes.length > 0 && (
                <p className="mt-2 leading-7 text-chalk/90">
                  <strong className="text-glacier">
                    {Math.round((100 * near) / quakes.length)}%
                  </strong>
                  {` (${near} of ${quakes.length}) lie within ${NEAR_KM} km of a plate boundary.`}
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-mist">
                {`${counts.shallow} shallow · ${counts.intermediate} intermediate · ${counts.deep} deep`}
              </p>
              <p className="mt-3 text-sm leading-6 text-mist">
                {
                  "Deep earthquakes happen only where a cold oceanic plate sinks into the mantle at a subduction zone. Find them, then look at which side of the trench they lie."
                }
              </p>
            </div>
          )}

          {quakes && quakes.length > 0 && (
            <div>
              <h2 className="section-label">{"Strongest in this period"}</h2>
              <ol className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10">
                {quakes.slice(0, 8).map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(q.id)}
                      aria-pressed={q.id === selectedId}
                      className={`flex min-h-11 w-full items-start gap-3 px-4 py-3 text-left ${q.id === selectedId ? "bg-glacier/10" : "hover:bg-white/[0.04]"}`}
                    >
                      <span className="w-12 shrink-0 font-mono text-lg text-chalk">
                        {q.mag.toFixed(1)}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm text-chalk">{q.place}</span>
                        <span className="block text-xs text-mist">
                          {`${fmtTime(q.time)} · depth ${Math.round(q.depthKm)} km`}
                          {distances?.has(q.id)
                            ? ` · ${Math.round(distances.get(q.id)!)} km from a boundary`
                            : ""}
                          {q.tsunami ? " · tsunami alert issued" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {selected?.url && (
            <p className="text-sm">
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="text-ice underline"
              >
                {"USGS event page for the selected earthquake"}
              </a>
            </p>
          )}

          <div className="text-xs leading-5 text-mist">
            <p>
              {
                "Data: USGS Earthquake Hazards Program (public domain), refreshed by USGS every minute. Magnitudes and locations can be revised after an event."
              }
              {loadedAt ? ` Loaded ${fmtTime(loadedAt)}.` : ""}
            </p>
            <p className="mt-1">
              {
                "Plate boundaries: Bird (2003) PB2002 model. Distances are measured to the nearest boundary line."
              }
            </p>
            <p className="mt-2">
              {"Explore the processes: "}
              <Link to="/lab/$slug" params={{ slug: "earthquakes" }} className="text-ice underline">
                {"Earthquakes lab"}
              </Link>
              {" · "}
              <Link
                to="/lab/$slug"
                params={{ slug: "plate-boundaries" }}
                className="text-ice underline"
              >
                {"Plate boundaries lab"}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
