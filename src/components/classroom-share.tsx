import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { classroomShareUrl } from "@/lib/classroom-share";
import { useT } from "@/lib/i18n";

/**
 * A plain link to Google Classroom's share page, opened in a new tab. `href` is the address to
 * share as rendered on the server; `current`, when given, is read at the moment of the click, so
 * a lab shares the view on screen (its controls live in the address bar).
 */
export function ClassroomShare({
  href,
  current,
  className,
  children,
}: {
  href: string;
  current?: () => string;
  className?: string;
  children?: ReactNode;
}) {
  const t = useT();
  return (
    <a
      href={classroomShareUrl(href)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        const url = current?.();
        if (url) event.currentTarget.href = classroomShareUrl(url);
      }}
    >
      {children ?? t("Share to Google Classroom")}
      <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-[-2px]" />
      <span className="sr-only">{t(" (opens in a new tab)")}</span>
    </a>
  );
}
