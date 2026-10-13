import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { SiteShell } from "@/components/layout/site-shell";
import { NotFoundPage } from "@/components/not-found";
import { robotsMeta } from "@/lib/seo";
import appCss from "../styles.css?url";
import { preferenceBootScript } from "@/lib/preferences";

const APP_NAME = "Geolens";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: APP_NAME },
      {
        name: "description",
        content: "Free 3D labs for geography and Earth science students. See how the Earth works.",
      },
      { name: "theme-color", content: "#07090C" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "application-name", content: APP_NAME },
      robotsMeta(),
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/icons/geolens-180.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  notFoundComponent: NotFoundPage,
  component: Root,
});

function Root() {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: preferenceBootScript }} />
        <HeadContent />
      </head>
      <body className="bg-void text-chalk">
        <noscript>
          <p style={{ padding: 24, color: "#f4efe6", fontFamily: "Georgia, serif" }}>
            Geolens is a free geoscience studio. Enable JavaScript for the 3D labs, or read the
            lab titles and objectives as static pages.
          </p>
        </noscript>
        <SiteShell>
          <Outlet />
        </SiteShell>
        <Scripts />
      </body>
    </html>
  );
}
