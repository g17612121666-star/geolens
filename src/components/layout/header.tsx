import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X, ChevronDown, Search } from "lucide-react";
import { REALMS } from "@/lib/labs/catalog";
import { cn } from "@/lib/utils";
import { PreferencesMenu } from "@/components/preferences-menu";
import { LogoMark } from "@/components/layout/logo-mark";

const TOOLS = [
  {
    to: "/tools/earth-motion",
    label: "Earth-motion calculator",
    hint: "Find the Sun’s height for a place and date",
  },
  { to: "/tools/live-weather", label: "Live weather", hint: "Compare weather in two places" },
  {
    to: "/tools/earthquakes",
    label: "Live earthquakes",
    hint: "Recent earthquakes and plate boundaries",
  },
  { to: "/tools/map", label: "World map studio", hint: "Explore the geography of a place" },
] as const;

export function Header({ variant = "default" }: { variant?: "default" | "lab" }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [realmsOpen, setRealmsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setRealmsOpen(false);
    setToolsOpen(false);
  }, [pathname]);

  const lab = variant === "lab";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-14 transition-[background-color,backdrop-filter,border-color] duration-280 ease-[cubic-bezier(0.22,1,0.36,1)]",
        lab || scrolled
          ? "border-b border-white/10 bg-void/80 shadow-[0_8px_24px_-18px_rgb(0_0_0/0.35)] backdrop-blur-xl backdrop-saturate-150"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full items-center justify-between",
          lab ? "px-6" : "max-w-[1280px] px-5",
        )}
      >
        <Link to="/" className="group flex items-center gap-2.5" aria-label={"Geolens home"}>
          <LogoMark className="size-7 transition-transform duration-500 group-hover:rotate-[20deg]" />
          <span className="font-display text-[22px] leading-none text-chalk">{"Geolens"}</span>
        </Link>

        <div className="flex items-center gap-1">
          <PreferencesMenu />
          {lab ? (
            <nav className="flex items-center gap-0.5" aria-label={"Lab"}>
              <NavLink to="/explore">{"Explore"}</NavLink>
              <NavLink to="/teachers" className="hidden md:inline-flex">
                {"Teachers"}
              </NavLink>
              <Link
                to="/search"
                className="ml-1 inline-flex size-11 items-center justify-center rounded-[10px] text-mist hover:bg-white/8 hover:text-chalk"
                aria-label={"Search"}
              >
                <Search className="size-4" />
              </Link>
            </nav>
          ) : (
            <>
              <nav className="hidden items-center gap-0.5 lg:flex" aria-label={"Primary"}>
                <HoverMenu
                  label={"Subjects"}
                  open={realmsOpen}
                  setOpen={setRealmsOpen}
                  width="w-72"
                >
                  {REALMS.map((r) => (
                    <Link
                      key={r.slug}
                      to="/realms/$realm"
                      params={{ realm: r.slug }}
                      className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-glacier/8"
                    >
                      <div className="text-sm text-chalk">{r.title}</div>
                      <div className="text-xs text-mist">{r.kicker}</div>
                    </Link>
                  ))}
                </HoverMenu>
                <NavLink to="/explore">{"Explore"}</NavLink>
                <NavLink to="/trips">{"Field trips"}</NavLink>
                <NavLink to="/practice">{"Practice"}</NavLink>
                <NavLink to="/atlas">{"Atlas"}</NavLink>
                <HoverMenu label={"Tools"} open={toolsOpen} setOpen={setToolsOpen} width="w-80">
                  {TOOLS.map((t) => (
                    <Link
                      key={t.to}
                      to={t.to}
                      className="block rounded-xl px-3 py-2.5 transition-colors hover:bg-glacier/8"
                    >
                      <div className="text-sm text-chalk">{t.label}</div>
                      <div className="text-xs text-mist">{t.hint}</div>
                    </Link>
                  ))}
                </HoverMenu>
                <NavLink to="/teachers">{"Teachers"}</NavLink>
                <Link
                  to="/search"
                  className="ml-1 inline-flex size-11 items-center justify-center rounded-[10px] text-mist hover:bg-white/8 hover:text-chalk"
                  aria-label={"Search"}
                >
                  <Search className="size-4" />
                </Link>
              </nav>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-[10px] text-chalk lg:hidden"
                aria-label={open ? "Close menu" : "Open menu"}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {open && !lab && (
        <div className="border-t border-white/10 bg-void/95 shadow-[var(--shadow-lift)] backdrop-blur-xl lg:hidden">
          <nav
            className="flex max-h-[calc(100dvh-3.5rem)] flex-col gap-1 overflow-y-auto px-4 py-4"
            aria-label={"Mobile"}
          >
            <p className="section-label px-3 pb-2">{"Subjects"}</p>
            {REALMS.map((r) => (
              <Link
                key={r.slug}
                to="/realms/$realm"
                params={{ realm: r.slug }}
                className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8"
              >
                {r.title}
              </Link>
            ))}
            <Link to="/explore" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Explore"}
            </Link>
            <Link to="/trips" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Field trips"}
            </Link>
            <Link to="/practice" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Practice"}
            </Link>
            <Link to="/atlas" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Atlas"}
            </Link>
            <p className="section-label px-3 pb-2 pt-3">{"Tools"}</p>
            {TOOLS.map((t) => (
              <Link
                key={t.to}
                to={t.to}
                className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8"
              >
                {t.label}
              </Link>
            ))}
            <Link to="/teachers" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Teachers"}
            </Link>
            <Link to="/search" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Search"}
            </Link>
            <Link to="/glossary" className="rounded-[10px] px-3 py-3 text-chalk hover:bg-white/8">
              {"Glossary"}
            </Link>
            <Link to="/about" className="rounded-[10px] px-3 py-3 text-mist hover:bg-white/8">
              {"About"}
            </Link>
            <Link to="/privacy" className="rounded-[10px] px-3 py-3 text-mist hover:bg-white/8">
              {"Privacy"}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={to}
      activeProps={{ className: "bg-glacier/10 !text-glacier font-medium" }}
      className={cn(
        "inline-flex h-10 items-center rounded-full px-3.5 text-sm text-chalk/85 transition-colors hover:bg-white/8 hover:text-chalk",
        className,
      )}
    >
      {children}
    </Link>
  );
}

function HoverMenu({
  label,
  open,
  setOpen,
  width,
  children,
}: {
  label: string;
  open: boolean;
  setOpen: (v: boolean) => void;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex h-10 items-center gap-1 rounded-full px-3.5 text-sm text-chalk/85 transition-colors hover:bg-white/8 hover:text-chalk"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      >
        {label} <ChevronDown className="size-3.5 text-mist" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-0 top-full rounded-2xl border border-white/10 bg-basalt/95 p-2 shadow-[var(--shadow-lift)] backdrop-blur-xl",
            width,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
