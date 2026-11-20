// Takes the still picture of the home-page globe that shows while the 3D Earth loads (and stays
// where WebGL is unavailable). Run it again whenever the Earth's shader, lighting or view change.
//
//   npm run dev   (or npm run build && npm run preview)
//   node scripts/capture-home-earth.mjs [base-url]
//
// Writes public/home/earth-1120.webp and earth-560.webp, with a transparent background.
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import sharp from "sharp";

const [base = "http://127.0.0.1:8081"] = process.argv.slice(2);
const out = new URL("../public/home/", import.meta.url);
mkdirSync(out, { recursive: true });

// Only the globe is drawn, at its full desktop size, over a transparent page.
const CAPTURE_CSS = `
  html, body { background: transparent !important; }
  body * { visibility: hidden !important; }
  [data-home-earth] { visibility: visible !important; position: fixed !important; left: 0 !important;
    top: 0 !important; width: 560px !important; height: 560px !important; margin: 0 !important;
    z-index: 2147483647 !important; }
  [data-home-earth] * { visibility: visible !important; }
  [data-home-earth] img { display: none !important; }`;

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader"] });
const page = await browser.newPage({
  viewport: { width: 560, height: 560 },
  deviceScaleFactor: 2,
  colorScheme: "light",
  // Stops the slow turn, so the picture shows the globe's starting view.
  reducedMotion: "reduce",
});
await page.addInitScript((css) => {
  document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.append(style);
  });
}, CAPTURE_CSS);
await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForSelector('[data-home-earth] [data-scene-ready="true"]', {
  state: "attached",
  timeout: 180000,
});
await page.waitForTimeout(2000);
const png = await page.screenshot({ omitBackground: true, timeout: 180000 });
await browser.close();
for (const size of [1120, 560]) {
  await sharp(png)
    .resize(size, size, { kernel: "lanczos3" })
    .webp({ quality: 84, alphaQuality: 90, effort: 6 })
    .toFile(new URL(`earth-${size}.webp`, out).pathname);
}
console.log("Wrote public/home/earth-1120.webp and earth-560.webp");
