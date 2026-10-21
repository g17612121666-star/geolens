#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:8080";
const jobs = [
  ["/lab/soil-profile", "grid-soil"],
  ["/teachers", "grid-teachers"],
  ["/glossary", "grid-glossary"],
  ["/atlas", "grid-atlas"],
  ["/", "grid-home"],
  ["/explore", "grid-explore"],
];

const browser = await chromium.launch({
  headless: true,
  args: ["--use-gl=angle", "--ignore-gpu-blocklist", "--disable-gpu-sandbox"],
});

for (const [path, name] of jobs) {
  const t0 = Date.now();
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  try {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(path.startsWith("/lab") ? 3200 : 1800);
    const client = await context.newCDPSession(page);
    const { data } = await Promise.race([
      client.send("Page.captureScreenshot", { format: "jpeg", quality: 72, fromSurface: false }),
      new Promise((_, rej) => setTimeout(() => rej(new Error("shot timeout")), 9000)),
    ]);
    writeFileSync(`/workspace/screenshots/${name}.jpg`, Buffer.from(data, "base64"));
    console.log("ok", name, Date.now() - t0, "ms");
  } catch (err) {
    try {
      await page.screenshot({ path: `/workspace/screenshots/${name}.jpg`, type: "jpeg", quality: 70, timeout: 5000, animations: "disabled" });
      console.log("ok-fallback", name, Date.now() - t0, "ms");
    } catch {
      console.log("fail", name, err.message?.slice(0, 120));
    }
  }
  await context.close();
}

await browser.close();
console.log("done");
