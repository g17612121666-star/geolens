// Takes the large model pictures on the home page: three labs opened at real US places, so each
// can sit beside a photograph of the same landscape.
//
//   npm run build && npm run preview   (or npm run dev)
//   node scripts/capture-home-models.mjs [base-url]
//
// Writes public/home/models/<name>.webp (1280 x 960) and <name>-640.webp.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const HOME_MODELS = [
  { name: "yosemite", path: "/lab/glaciers?view=2" },
  { name: "grand-canyon", path: "/lab/river-erosion?feature=3" },
  { name: "hotspots", path: "/lab/hotspots" },
];

const [base = "http://127.0.0.1:8081"] = process.argv.slice(2);
const out = new URL("../public/home/models/", import.meta.url);
mkdirSync(out, { recursive: true });

// Same staging as scripts/capture-lab-thumbs.mjs: the model box fills the window, labels hidden.
const CAPTURE_CSS = `
  body * { visibility: hidden !important; }
  [data-studio] { visibility: visible !important; position: fixed !important; inset: 0 !important;
    z-index: 2147483647 !important; }
  [data-studio] * { visibility: visible !important; }
  [data-studio] div:not(:has(canvas)) { display: none !important; }`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
let failed = false;
for (const { name, path } of HOME_MODELS) {
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
    await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 180000 });
    const ready = { state: "attached", timeout: 180000 };
    await page.waitForSelector('[data-lab-ready="true"]', ready);
    await page.waitForSelector('[data-studio] [data-scene-ready="true"]', ready);
    await page.waitForTimeout(5000);
    const png = await page.screenshot({ type: "png", timeout: 180000 });
    for (const [width, suffix] of [
      [1280, ""],
      [640, "-640"],
    ]) {
      await sharp(png)
        .resize(width, (width * 3) / 4, { kernel: "lanczos3" })
        .webp({ quality: 84, effort: 6 })
        .toFile(new URL(`${name}${suffix}.webp`, out).pathname);
    }
    console.log("ok", name);
  } catch (error) {
    failed = true;
    console.log("FAILED", name, String(error).split("\n")[0]);
  }
  await page.close();
}
await browser.close();
if (failed) process.exitCode = 1;
