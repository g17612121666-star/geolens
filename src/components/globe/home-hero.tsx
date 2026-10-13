import { lazy, Suspense } from "react";
const HeroEarth = lazy(() => import("./hero-earth").then((m) => ({ default: m.HeroEarth })));
export function GlobePoster() {
  return (
    <div
      className="hero-earth-poster absolute inset-8 rounded-full"
      role="img"
      aria-label="Earth surface imagery on a globe"
    />
  );
}
export function HomeHero() {
  return (
    <Suspense fallback={<GlobePoster />}>
      <HeroEarth />
    </Suspense>
  );
}
