import { createFileRoute, Link } from "@tanstack/react-router";
import { headFor, learningResourceJsonLd, siteOrigin } from "@/lib/seo";
import { MailLink } from "@/components/mail-link";
import {
  PRODUCER_IG,
  PRODUCER_IG_HANDLE,
  PRODUCER_X,
  PRODUCER_X_HANDLE,
  PRODUCER_SITE,
} from "@/lib/contact";
export const Route = createFileRoute("/about")({
  component: About,
  head: () =>
    headFor({
      title: "About Geolens",
      description:
        "Meet Li Zeyu, Earth science educator and founder of the geography club at Shanghai Pinghe School.",
      path: "/about",
      image: "/photos/li-zeyu-field.jpg",
    }),
});
function About() {
  const jsonLd = learningResourceJsonLd({
    name: "Geolens",
    description: "Free 3D geography and Earth science education.",
    url: siteOrigin() + "/about",
    type: "WebPage",
    about: "Earth science education",
    image: "/photos/li-zeyu-field.jpg",
  });
  return (
    <main id="main" className="mx-auto max-w-[1100px] px-5 pb-16 pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <p className="section-label">About Geolens</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight md:text-6xl">
        Earth science you can explore together.
      </h1>
      <div className="mt-7 max-w-3xl space-y-4 text-lg leading-8 text-mist">
        <p>
          Geolens is a free collection of interactive 3D models for learning geography and Earth
          science. Students can examine a process from different angles, change its conditions and
          connect what they see to a real landscape.
        </p>
        <p>
          Teachers and school geography clubs can use the models alongside teaching notes, case
          studies and questions for discussion. All resources are available without an account,
          advertising or a paywall.
        </p>
      </div>
      <article className="mt-12 grid overflow-hidden rounded-2xl border border-white/15 bg-basalt md:grid-cols-[0.8fr_1.2fr]">
        <img
          src="/photos/li-zeyu-field.jpg"
          alt="Li Zeyu examining a rock outcrop in the field."
          className="h-full min-h-80 w-full object-cover object-top"
        />
        <div className="p-6 md:p-10">
          <p className="section-label">Creator and educator</p>
          <h2 className="mt-3 font-display text-4xl">Li Zeyu</h2>
          <p className="mt-3 text-glacier">
            Earth science educator and science communication enthusiast
          </p>
          <p className="mt-5 leading-7 text-mist">
            Li Zeyu is the founder and president of the geography club at Shanghai Pinghe School and
            a member of the IB Class of 2028. Through Geolens, he works to make Earth processes
            easier for students to investigate and explain.
          </p>
          <p className="mt-4 leading-7 text-mist">
            As a student docent at the Shanghai Natural History Museum, he also takes part in
            sharing science with museum visitors. Geolens brings this interest in education and
            public science communication into a resource that students, teachers and geography clubs
            can use together.
          </p>
          <p className="mt-4 leading-7 text-mist">
            The site connects interactive models with explanations, photographs and teaching
            prompts, so that an unfamiliar process can become something a learner can investigate
            and describe.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
            <MailLink />
            <a href={PRODUCER_IG} target="_blank" rel="noreferrer" className="text-ice">
              Instagram {PRODUCER_IG_HANDLE}
            </a>
            <a href={PRODUCER_X} target="_blank" rel="noreferrer" className="text-ice">
              X {PRODUCER_X_HANDLE}
            </a>
            <a href={PRODUCER_SITE} target="_blank" rel="noreferrer" className="text-ice">
              Personal website
            </a>
          </div>
        </div>
      </article>
      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="font-display text-2xl">Using Geolens in a lesson</h2>
          <p className="mt-4 leading-7 text-mist">
            Begin with something students can observe, then use a model to test their explanation.
            Curriculum filters help teachers find relevant topics, and the teaching notes offer
            prompts that can be adapted for class or a geography club meeting.
          </p>
          <Link to="/teachers" className="mt-4 inline-flex min-h-11 items-center text-glacier">
            Browse teaching resources →
          </Link>
        </section>
        <section>
          <h2 className="font-display text-2xl">Sources and reuse</h2>
          <p className="mt-4 leading-7 text-mist">
            The labs draw on resources from NASA, USGS, the British Geological Survey, NOAA and the
            Met Office. Original models, text and diagrams are shared under{" "}
            <a
              className="text-ice underline"
              href="https://creativecommons.org/licenses/by-nc/4.0/"
            >
              CC BY-NC 4.0
            </a>
            , so they can be used for non-commercial teaching with attribution.
          </p>
          <p className="mt-4 leading-7 text-mist">
            Photographs and datasets retain their own credits and licences.{" "}
            <Link to="/image-credits" className="text-ice underline">
              Image credits
            </Link>{" "}
            collects those details in one place. Read our{" "}
            <Link to="/privacy" className="text-ice underline">
              privacy information
            </Link>{" "}
            for details about external maps, weather and video services.
          </p>
        </section>
      </div>
    </main>
  );
}
