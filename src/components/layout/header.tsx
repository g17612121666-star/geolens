import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Menu, Search, X } from "lucide-react";
import { REALMS } from "@/lib/labs/realms";
import { cn } from "@/lib/utils";
import { useInkHeader } from "@/lib/ink-header";
import { useLang, useT } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { PreferencesMenu } from "@/components/preferences-menu";
import { LogoMark } from "@/components/layout/logo-mark";

type Section = "labs" | "cases" | "practice" | "atlas" | "teachers";

/** Which top-level section a page belongs to, for the header's current-page mark. */
function sectionOf(pathname: string, kind: unknown): Section | null {
  if (pathname.startsWith("/teachers")) return "teachers";
  if (pathname.startsWith("/practice")) return "practice";
  if (pathname.startsWith("/case/") || pathname.startsWith("/trips")) return "cases";
  if (pathname === "/explore") return kind === "cases" ? "cases" : "labs";
  if (/^\/(lab|realms|skills|topic)\//.test(pathname)) return "labs";
  if (pathname.startsWith("/atlas") || pathname.startsWith("/tools") || pathname === "/glossary")
    return "atlas";
  return null;
}

export function Header({ variant = "default" }: { variant?: "default" | "lab" }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<Section | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const kind = useRouterState({
    select: (s) => (s.location.search as Record<string, unknown>).kind,
  });
  const current = sectionOf(pathname, kind);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname, kind]);

  const lab = variant === "lab";
  // At the top of the home page the header takes the hero's ink, so the two read as one band.
  const inkUnder = useInkHeader((s) => s.under);
  const ink = !lab && pathname === "/" && inkUnder;
  const t = useT();
  const lang = useLang();

  return (
    <header
      lang={lang}
      className={cn(
        "fixed inset-x-0 top-0 z-40 h-14 border-b transition-colors duration-200",
        ink ? "ink-band border-transparent" : "border-white/10 bg-void",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-full items-center gap-4",
          lab ? "px-6" : "max-w-[1280px] px-5",
        )}
      >
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={t("Geolens home")}>
          <LogoMark className="size-7" />
          <span className="font-display text-[22px] leading-none text-chalk">Geolens</span>
        </Link>

        {lab ? (
          <nav className="ml-auto flex items-center gap-0.5" aria-label={t("Site")}>
            <NavLink to="/explore">Labs</NavLink>
            <NavLink to="/teachers" className="hidden md:inline-flex">
              Teachers
            </NavLink>
            <Link
              to="/search"
              className="inline-flex size-11 items-center justify-center rounded-md text-mist hover:bg-white/8 hover:text-chalk"
              aria-label={t("Search")}
            >
              <Search className="size-4" />
            </Link>
            <LanguageSwitch />
            <PreferencesMenu />
          </nav>
        ) : (
          <>
            <nav className="ml-4 hidden items-center gap-0.5 lg:flex" aria-label={t("Primary")}>
              <DropMenu
                label="Labs"
                id="labs"
                menu={menu}
                setMenu={setMenu}
                current={current === "labs"}
                width="w-[34rem]"
              >
                <div className="grid grid-cols-2 gap-x-2">
                  <MenuItem to="/explore" hint="Search and filter every lab">
                    All labs
                  </MenuItem>
                  {REALMS.map((r) => (
                    <Link
                      key={r.slug}
                      to="/realms/$realm"
                      params={{ realm: r.slug }}
                      className="block rounded-md px-3 py-2 hover:bg-white/8"
                    >
                      <span className="block text-sm text-chalk">{t(r.title)}</span>
                      <span className="block text-xs leading-5 text-mist">{t(r.kicker)}</span>
                    </Link>
                  ))}
                </div>
              </DropMenu>
              <DropMenu
                label="Case studies"
                id="cases"
                menu={menu}
                setMenu={setMenu}
                current={current === "cases"}
                width="w-72"
              >
                <Link
                  to="/explore"
                  search={{ kind: "cases" }}
                  className="block rounded-md px-3 py-2 hover:bg-white/8"
                >
                  <span className="block text-sm text-chalk">{t("All case studies")}</span>
                  <span className="block text-xs leading-5 text-mist">
                    {t("Real places that the labs explain")}
                  </span>
                </Link>
                <MenuItem to="/trips" hint="Map tours with a photograph at each stop">
                  Field trips
                </MenuItem>
              </DropMenu>
              <NavLink to="/practice">Practice</NavLink>
              <DropMenu
                label="Atlas"
                id="atlas"
                menu={menu}
                setMenu={setMenu}
                current={current === "atlas"}
                width="w-80"
              >
                <MenuItem to="/atlas" hint="Places, regions and their landscapes">
                  Atlas
                </MenuItem>
                <MenuItem to="/tools/map" hint="Explore the geography of a place">
                  World map studio
                </MenuItem>
                <MenuItem to="/tools/live-weather" hint="Compare weather in two places">
                  Live weather
                </MenuItem>
                <MenuItem to="/tools/earthquakes" hint="Recent earthquakes and plate boundaries">
                  Live earthquakes
                </MenuItem>
                <MenuItem to="/tools/earth-motion" hint="The Sun’s height for a place and date">
                  Earth-motion calculator
                </MenuItem>
                <MenuItem to="/glossary" hint="Key terms with plain definitions">
                  Glossary
                </MenuItem>
              </DropMenu>
              <DropMenu
                label="Teachers"
                id="teachers"
                menu={menu}
                setMenu={setMenu}
                current={current === "teachers"}
                width="w-80"
                align="right"
              >
                <MenuItem to="/teachers" hint="Lesson notes and worksheets for every lab">
                  Teacher notes
                </MenuItem>
                <MenuItem to="/teachers/courses" hint="Labs by course, unit and standard">
                  Courses
                </MenuItem>
                <MenuItem to="/teachers/standards" hint="Every lab mapped to NGSS, AP and GCSE">
                  Standards
                </MenuItem>
                <MenuItem to="/teachers/check" hint="Read a student’s Guided answers">
                  Check a hand-in code
                </MenuItem>
              </DropMenu>
            </nav>
            <div className="ml-auto flex items-center gap-1">
              {pathname !== "/search" && <SiteSearch className="hidden w-60 lg:block xl:w-72" />}
              <Link
                to="/search"
                className="inline-flex size-11 items-center justify-center rounded-md text-chalk hover:bg-white/8 lg:hidden"
                aria-label={t("Search")}
              >
                <Search className="size-5" />
              </Link>
              <LanguageSwitch />
              <PreferencesMenu />
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-md text-chalk hover:bg-white/8 lg:hidden"
                aria-label={t(open ? "Close menu" : "Open menu")}
                aria-expanded={open}
                aria-controls="mobile-menu"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </>
        )}
      </div>

      {open && !lab && (
        <div id="mobile-menu" className="border-b border-white/10 bg-void lg:hidden">
          <nav
            className="mx-auto flex max-h-[calc(100dvh-3.5rem)] max-w-[1280px] flex-col overflow-y-auto px-4 pb-6 pt-3"
            aria-label={t("Mobile")}
          >
            <SiteSearch className="mb-2" />
            <MobileGroup title="Labs">
              <MobileLink to="/explore">All labs</MobileLink>
              {REALMS.map((r) => (
                <Link
                  key={r.slug}
                  to="/realms/$realm"
                  params={{ realm: r.slug }}
                  className="rounded-md px-3 py-2.5 text-chalk hover:bg-white/8"
                >
                  {t(r.title)}
                </Link>
              ))}
            </MobileGroup>
            <MobileGroup title="Case studies">
              <Link
                to="/explore"
                search={{ kind: "cases" }}
                className="rounded-md px-3 py-2.5 text-chalk hover:bg-white/8"
              >
                {t("All case studies")}
              </Link>
              <MobileLink to="/trips">Field trips</MobileLink>
            </MobileGroup>
            <MobileGroup title="Practice">
              <MobileLink to="/practice">Practice</MobileLink>
            </MobileGroup>
            <MobileGroup title="Atlas">
              <MobileLink to="/atlas">Atlas</MobileLink>
              <MobileLink to="/tools/map">World map studio</MobileLink>
              <MobileLink to="/tools/live-weather">Live weather</MobileLink>
              <MobileLink to="/tools/earthquakes">Live earthquakes</MobileLink>
              <MobileLink to="/tools/earth-motion">Earth-motion calculator</MobileLink>
              <MobileLink to="/glossary">Glossary</MobileLink>
            </MobileGroup>
            <MobileGroup title="Teachers">
              <MobileLink to="/teachers">Teacher notes</MobileLink>
              <MobileLink to="/teachers/courses">Courses</MobileLink>
              <MobileLink to="/teachers/standards">Standards</MobileLink>
              <MobileLink to="/teachers/check">Check a hand-in code</MobileLink>
            </MobileGroup>
            <div className="mt-3 flex gap-1 border-t border-white/10 pt-3 text-sm">
              <MobileLink to="/about">About</MobileLink>
              <MobileLink to="/privacy">Privacy</MobileLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** A search box that opens the search page with the words typed. */
function SiteSearch({ className }: { className?: string }) {
  const id = useId();
  const t = useT();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const words = q.trim();
    void navigate({ to: "/search", search: words ? { q: words } : {} });
    setQ("");
  };
  return (
    <form role="search" action="/search" onSubmit={submit} className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {t("Search Geolens")}
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mist"
        aria-hidden="true"
      />
      <input
        id={id}
        name="q"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("Search labs, places, terms")}
        className="h-10 w-full rounded-md border border-white/15 bg-basalt pl-9 pr-3 text-sm text-chalk placeholder:text-mist"
      />
    </form>
  );
}

function NavLink({
  to,
  children,
  className,
}: {
  to: "/explore" | "/teachers" | "/practice";
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <Link
      to={to}
      activeProps={{ className: "!text-chalk shadow-[inset_0_-2px_0_var(--color-glacier)]" }}
      className={cn(
        "inline-flex h-14 items-center px-3 text-sm text-chalk/80 transition-colors hover:text-chalk",
        className,
      )}
    >
      {typeof children === "string" ? t(children) : children}
    </Link>
  );
}

function MenuItem({
  to,
  hint,
  children,
}: {
  to:
    | "/explore"
    | "/trips"
    | "/atlas"
    | "/tools/map"
    | "/tools/live-weather"
    | "/tools/earthquakes"
    | "/tools/earth-motion"
    | "/glossary"
    | "/teachers"
    | "/teachers/courses"
    | "/teachers/standards"
    | "/teachers/check";
  hint: string;
  children: ReactNode;
}) {
  const t = useT();
  return (
    <Link to={to} className="block rounded-md px-3 py-2 hover:bg-white/8">
      <span className="block text-sm text-chalk">
        {typeof children === "string" ? t(children) : children}
      </span>
      <span className="block text-xs leading-5 text-mist">{t(hint)}</span>
    </Link>
  );
}

function DropMenu({
  label,
  id,
  menu,
  setMenu,
  current,
  width,
  align = "left",
  children,
}: {
  label: string;
  id: Section;
  menu: Section | null;
  setMenu: (v: Section | null) => void;
  current: boolean;
  width: string;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const open = menu === id;
  const root = useRef<HTMLDivElement>(null);
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setMenu(null);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenu(null);
      root.current?.querySelector("button")?.focus();
    };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", key);
    };
  }, [open, setMenu]);
  return (
    <div
      ref={root}
      className="relative"
      onMouseEnter={() => setMenu(id)}
      onMouseLeave={() => setMenu(null)}
    >
      <button
        type="button"
        className={cn(
          "inline-flex h-14 items-center gap-1 px-3 text-sm transition-colors hover:text-chalk",
          current ? "text-chalk shadow-[inset_0_-2px_0_var(--color-glacier)]" : "text-chalk/80",
        )}
        aria-expanded={open}
        onClick={() => setMenu(open ? null : id)}
      >
        {t(label)} <ChevronDown className="size-3.5 text-mist" aria-hidden="true" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute top-full rounded-md border border-white/10 bg-basalt p-1.5 shadow-[var(--shadow-lift)]",
            align === "right" ? "right-0" : "left-0",
            width,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function MobileGroup({ title, children }: { title: string; children: ReactNode }) {
  const t = useT();
  return (
    <div className="mt-3 flex flex-col border-t border-white/10 pt-3">
      <p className="px-3 pb-1 text-xs font-semibold text-mist">{t(title)}</p>
      {children}
    </div>
  );
}

function MobileLink({
  to,
  children,
}: {
  to:
    | "/explore"
    | "/trips"
    | "/practice"
    | "/atlas"
    | "/tools/map"
    | "/tools/live-weather"
    | "/tools/earthquakes"
    | "/tools/earth-motion"
    | "/glossary"
    | "/teachers"
    | "/teachers/courses"
    | "/teachers/standards"
    | "/teachers/check"
    | "/about"
    | "/privacy";
  children: ReactNode;
}) {
  const t = useT();
  return (
    <Link to={to} className="rounded-md px-3 py-2.5 text-chalk hover:bg-white/8">
      {typeof children === "string" ? t(children) : children}
    </Link>
  );
}

/**
 * Switches the interface between English and Spanish. Each button names its language in that
 * language, so a reader can find their own whichever language the page is in.
 */
function LanguageSwitch() {
  const lang = usePreferences((s) => s.lang);
  const setLang = usePreferences((s) => s.setLang);
  const next = lang === "es" ? "en" : "es";
  return (
    <button
      type="button"
      lang={next}
      onClick={() => setLang(next)}
      className="inline-flex h-11 items-center rounded-md px-2.5 text-sm text-chalk hover:bg-white/8"
      aria-label={next === "es" ? "Ver en español" : "View in English"}
    >
      {next === "es" ? "Español" : "English"}
    </button>
  );
}
