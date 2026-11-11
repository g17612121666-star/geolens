import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Early versions of the site had thin /topic pages that only repeated a lab's title and summary.
 * Old links now go straight to the lab, which handles renamed and unknown slugs.
 */
export const Route = createFileRoute("/topic/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/lab/$slug", params: { slug: params.slug } });
  },
  component: () => null,
});
