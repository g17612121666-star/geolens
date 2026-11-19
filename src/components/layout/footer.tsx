import { Link } from "@tanstack/react-router";
import { MailLink } from "@/components/mail-link";
import { LogoMark } from "@/components/layout/logo-mark";

const heading = "mb-3 text-sm font-semibold text-chalk";

export function Footer() {
  return (
    <footer className="ink-band mt-8">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 font-display text-3xl text-chalk">
            <LogoMark className="size-9" />
            Geolens
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-mist">
            Free 3D Earth science and geography for students, teachers and school geography clubs.
            No account, ads or paywall.
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
          <p className={heading}>Learn</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/explore">Labs</Link>
            <Link to="/explore" search={{ kind: "cases" }}>
              Case studies
            </Link>
            <Link to="/trips">Field trips</Link>
            <Link to="/practice">Practice</Link>
            <Link to="/glossary">Glossary</Link>
          </div>
        </nav>
        <nav aria-label="For teachers">
          <p className={heading}>Teachers</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/teachers">Teacher notes</Link>
            <Link to="/teachers/courses">Courses</Link>
            <Link to="/teachers/standards">Standards</Link>
            <Link to="/teachers/check">Check a hand-in code</Link>
          </div>
        </nav>
        <nav aria-label="Atlas and tools">
          <p className={heading}>Atlas</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/atlas">Atlas</Link>
            <Link to="/tools/map">World map</Link>
            <Link to="/tools/live-weather">Live weather</Link>
            <Link to="/tools/earthquakes">Live earthquakes</Link>
            <Link to="/tools/earth-motion">Earth motion</Link>
          </div>
        </nav>
        <nav aria-label="About and credits">
          <p className={heading}>Geolens</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/about">About</Link>
            <Link to="/image-credits">Image credits</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/search">Search</Link>
            <MailLink />
          </div>
        </nav>
      </div>
    </footer>
  );
}
