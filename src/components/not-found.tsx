import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { pageTitle } from "@/lib/seo";

export function NotFoundPage() {
  useEffect(() => {
    document.title = pageTitle("Page not found");
  }, []);
  return (
    <main id="main" className="relative flex min-h-dvh items-center px-6 pt-14">
      <div className="pointer-events-none absolute inset-0">
        <img
          src="/textures/earth-day.jpg"
          alt={"Earth from space: the sunlit Blue Marble behind empty ocean."}
          className="size-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-void via-void/80 to-void/40" />
      </div>
      <div className="relative z-10 mx-auto max-w-lg py-24">
        <p className="section-label">404</p>
        <h1 className="mt-3 font-display text-4xl text-chalk">
          {"This coordinate is empty ocean."}
        </h1>
        <p className="mt-4 text-mist">
          {
            "We could not find that page. It may have moved, or the link may be mistyped. Pick a lab or go back to the home page."
          }
        </p>
        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/explore">{"Explore labs"}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/">{"Home"}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
