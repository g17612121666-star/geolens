// Takes the model pictures shown on lab cards: each lab's 3D model as it first opens, in the
// light theme, without labels or controls.
//
//   npm run build && npm run preview   (or npm run dev)
//   node scripts/capture-lab-thumbs.mjs [base-url] [slug ...]
//
// Writes public/labs/thumbs/<slug>.webp (640 x 480) plus -320 and -160 copies for small cards.
// Run it again for a lab whenever its model changes; scripts/lab-thumbs.test.mjs checks that
// every lab has all three files.
import { mkdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const [base = "http://127.0.0.1:8081", ...only] = process.argv.slice(2);
const registry = readFileSync(new URL("../src/labs/registry.ts", import.meta.url), "utf8");
const all = [...registry.matchAll(/^\s+"?([a-z-]+)"?: \(\) => import/gm)].map((m) => m[1]);
const slugs = only.length ? only : all;
const out = new URL("../public/labs/thumbs/", import.meta.url);
mkdirSync(out, { recursive: true });

const SIZES = [
  [640, ""],
  [320, "-320"],
  [160, "-160"],
];

// The model box fills the window; everything else, labels included, is hidden.
const CAPTURE_CSS = `
  body * { visibility: hidden !important; }
  [data-studio] { visibility: visible !important; position: fixed !important; inset: 0 !important;
    z-index: 2147483647 !important; }
  [data-studio] * { visibility: visible !important; }
  [data-studio] div:not(:has(canvas)) { display: none !important; }`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const failed = [];

async function capture(slug) {
  const page = await browser.newPage({
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await page.addInitScript((css) => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = css;
      document.head.append(style);
    });
  }, CAPTURE_CSS);
  try {
    await page.goto(`${base}/lab/${slug}`, { waitUntil: "domcontentloaded", timeout: 180000 });
    // The page is hidden apart from the model, so wait for these to exist rather than show.
    const ready = { state: "attached", timeout: 180000 };
    await page.waitForSelector('[data-lab-ready="true"]', ready);
    await page.waitForSelector('[data-studio] [data-scene-ready="true"]', ready);
    await page.waitForTimeout(4000);
    const png = await page.screenshot({ type: "png", timeout: 180000 });
    for (const [width, suffix] of SIZES) {
      await sharp(png)
        .resize(width, (width * 3) / 4, { kernel: "lanczos3" })
        .webp({ quality: 82, effort: 6 })
        .toFile(new URL(`${slug}${suffix}.webp`, out).pathname);
    }
    console.log("ok", slug);
  } catch (error) {
    failed.push(slug);
    console.log("FAILED", slug, String(error).split("\n")[0]);
  }
  await page.close();
}

const queue = [...slugs];
await Promise.all(
  Array.from({ length: 2 }, async () => {
    while (queue.length) await capture(queue.shift());
  }),
);
await browser.close();
if (failed.length) {
  console.log(`Failed: ${failed.join(" ")}`);
  process.exitCode = 1;
}
