import { createFileRoute, notFound } from "@tanstack/react-router";
import { NotFoundPage } from "@/components/not-found";
import { pageTitle, robotsMeta } from "@/lib/seo";

export const Route = createFileRoute("/$")({
  beforeLoad: () => {
    throw notFound();
  },
  component: NotFoundPage,
  head: () => ({
    meta: [
      { title: pageTitle("Page not found") },
      { name: "description", content: "We could not find this page on Geolens." },
      robotsMeta(),
    ],
  }),
});
