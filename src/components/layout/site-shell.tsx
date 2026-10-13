import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Header } from "./header";
import { Footer } from "./footer";
import { initialisePreferences } from "@/lib/preferences";

export function SiteShell({ children }: { children: React.ReactNode }) {
  useEffect(initialisePreferences, []);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    let timer: number | undefined;
    const warm = (event: Event) => {
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link) return;
      const url = new URL(link.href, location.href),
        match = url.pathname.match(/^\/lab\/([^/]+)$/);
      if (url.origin !== location.origin || !match) return;
      if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
        return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void import("@/labs/registry").then((m) => m.preloadLab(match[1])).catch(() => {});
        if (match[1] === "continental-drift") {
          const age = Math.max(
            0,
            Math.min(250, Math.round(Number(url.searchParams.get("ageMa") ?? 200) / 10) * 10),
          );
          if (age > 0)
            void import("@react-three/drei")
              .then(({ useTexture }) =>
                useTexture.preload(`/geo/reconstruction/coastlines-${age}-4k.webp`),
              )
              .catch(() => {});
        }
      }, 120);
    };
    document.addEventListener("pointerover", warm);
    document.addEventListener("focusin", warm);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", warm);
      document.removeEventListener("focusin", warm);
    };
  }, []);
  const isLab = pathname.startsWith("/lab/");
  return (
    <div className="min-h-dvh bg-void text-chalk">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-glacier focus:px-4 focus:py-2 focus:text-basalt"
      >
        {"Skip to content"}
      </a>
      <Header variant={isLab ? "lab" : "default"} />
      <div className="route-content" key={pathname}>
        {children}
      </div>
      {!isLab && <Footer />}
    </div>
  );
}
