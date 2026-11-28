import { Link } from "@tanstack/react-router";
import { MailLink } from "@/components/mail-link";
import { LogoMark } from "@/components/layout/logo-mark";
import { useLang, useT } from "@/lib/i18n";

const heading = "mb-3 text-sm font-semibold text-chalk";

export function Footer() {
  const t = useT();
  const lang = useLang();
  return (
    <footer lang={lang} className="ink-band mt-8">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 font-display text-3xl text-chalk">
            <LogoMark className="size-9" />
            Geolens
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-mist">
            {t(
              "Free 3D Earth science and geography for students, teachers and school geography clubs. No account, ads or paywall.",
            )}
          </p>
          <p className="mt-4 text-sm text-mist">
            {t("Created by")}{" "}
            <Link to="/about" className="text-ice">
              Li Zeyu
            </Link>
            .
          </p>
        </div>
        <nav aria-label={t("Learning resources")}>
          <p className={heading}>{t("Learn")}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/explore">{t("Labs")}</Link>
            <Link to="/explore" search={{ kind: "cases" }}>
              {t("Case studies")}
            </Link>
            <Link to="/trips">{t("Field trips")}</Link>
            <Link to="/practice">{t("Practice")}</Link>
            <Link to="/glossary">{t("Glossary")}</Link>
          </div>
        </nav>
        <nav aria-label={t("For teachers")}>
          <p className={heading}>{t("Teachers")}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/teachers">{t("Teacher notes")}</Link>
            <Link to="/teachers/courses">{t("Courses")}</Link>
            <Link to="/teachers/standards">{t("Standards")}</Link>
            <Link to="/teachers/check">{t("Check a hand-in code")}</Link>
          </div>
        </nav>
        <nav aria-label={t("Atlas and tools")}>
          <p className={heading}>{t("Atlas")}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/atlas">{t("Atlas")}</Link>
            <Link to="/tools/map">{t("World map")}</Link>
            <Link to="/tools/live-weather">{t("Live weather")}</Link>
            <Link to="/tools/earthquakes">{t("Live earthquakes")}</Link>
            <Link to="/tools/earth-motion">{t("Earth motion")}</Link>
          </div>
        </nav>
        <nav aria-label={t("About and credits")}>
          <p className={heading}>{t("Geolens")}</p>
          <div className="flex flex-col gap-2 text-sm">
            <Link to="/about">{t("About")}</Link>
            <Link to="/image-credits">{t("Image credits")}</Link>
            <Link to="/privacy">{t("Privacy")}</Link>
            <Link to="/student-data">{t("Student data")}</Link>
            <Link to="/accessibility">{t("Accessibility")}</Link>
            <Link to="/search">{t("Search")}</Link>
            <MailLink />
          </div>
        </nav>
      </div>
    </footer>
  );
}
