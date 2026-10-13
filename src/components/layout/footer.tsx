import { Link } from "@tanstack/react-router";
import { MailLink } from "@/components/mail-link";
export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-basalt">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-10 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="font-display text-3xl text-chalk">
            Geolens
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-mist">
            Free 3D Earth science for students, teachers and school geography clubs. Explore without
            an account, adverts or a paywall.
          </p>
          <p className="mt-4 text-sm text-mist">
            Created by{" "}
            <Link to="/about" className="text-ice">
              Li Zeyu
            </Link>
            .
          </p>
        </div>
        <nav aria-label="Learning resources">
          <p className="section-label mb-3">Learn</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/explore">Explore</Link>
            <Link to="/atlas">Atlas</Link>
            <Link to="/glossary">Glossary</Link>
            <Link to="/teachers">Teachers</Link>
          </div>
        </nav>
        <nav aria-label="Geography tools">
          <p className="section-label mb-3">Tools</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/tools/earth-motion">Earth motion</Link>
            <Link to="/tools/live-weather">Live weather</Link>
            <Link to="/tools/map">World map</Link>
            <Link to="/search">Search Geolens</Link>
          </div>
        </nav>
        <nav aria-label="About and credits">
          <p className="section-label mb-3">Geolens</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/about">About</Link>
            <Link to="/image-credits">Image credits</Link>
            <Link to="/privacy">Privacy</Link>
            <MailLink />
          </div>
        </nav>
      </div>
    </footer>
  );
}
