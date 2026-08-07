/**
 * Generate PDFs for the FYP Presentation and Dashboard.
 *
 * Prerequisites: Both dev servers must be running:
 *   - Presentation on http://localhost:5173
 *   - Dashboard on http://localhost:5174
 *
 * Usage: node scripts/generate_pdfs.mjs
 */

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "..");

const PRESENTATION_URL = "http://localhost:5173";
const DASHBOARD_URL = "http://localhost:5174";

// Keep in sync with presentation/src/lib/slideRegistry.ts -> FULL_SLIDE_IDS
const SLIDE_IDS = [
  "slide-title",                   // 1
  "slide-literature",              // 2
  "slide-research-question",       // 3
  "slide-challenge",               // 4
  "slide-architecture",            // 5
  "slide-data-sources",            // 6
  "slide-features",                // 7 — merged Tech/Sentiment + Macro/Calendar
  "slide-models",                  // 8
  "slide-xgboost",                 // 9
  "slide-deep-learning",           // 10
  "slide-prediction",              // 11
  "slide-backtest-framework",      // 12
  "slide-trading",                 // 13
  "slide-trading-analysis",        // 14
  "slide-findings",                // 15
  "slide-limitations",             // 16
  "slide-future-work",             // 17
  "slide-thank-you",               // 18
];

const DASHBOARD_PAGES = [
  { path: "/", name: "Dashboard" },
  { path: "/analytics", name: "Analytics" },
  { path: "/signals", name: "Signal Explorer" },
  { path: "/backtest", name: "Backtest Results" },
  { path: "/features", name: "Feature Analysis" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForFonts(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await sleep(1000);
}

async function generatePresentationPDF(browser) {
  console.log("\n=== Generating Presentation PDF ===");
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

  console.log("Loading presentation...");
  await page.goto(PRESENTATION_URL, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForSelector("#slide-title", { timeout: 15000 });

  // Wait for fonts to load
  console.log("  Waiting for fonts...");
  await waitForFonts(page);
  await sleep(2000);

  // Disable animations to get clean captures
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.textContent = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });

  const screenshotPaths = [];

  for (let i = 0; i < SLIDE_IDS.length; i++) {
    const slideId = SLIDE_IDS[i];
    console.log(`  Capturing slide ${i + 1}/${SLIDE_IDS.length}: ${slideId}`);

    // Scroll the slide-container so the target slide is fully in view
    await page.evaluate((id) => {
      const el = document.getElementById(id);
      const container = el?.closest(".slide-container");
      if (el && container) {
        container.scrollTop = el.offsetTop;
      } else if (el) {
        el.scrollIntoView({ behavior: "instant" });
      }
    }, slideId);

    await sleep(1200);

    // Verify the slide is actually visible
    const isVisible = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.top >= -10 && rect.top < 100;
    }, slideId);

    if (!isVisible) {
      console.log(`    Retrying scroll for ${slideId}...`);
      await page.evaluate((id) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ block: "start", behavior: "instant" });
      }, slideId);
      await sleep(1500);
    }

    const filePath = path.join(OUTPUT_DIR, `_slide_${i}.png`);
    await page.screenshot({
      path: filePath,
      type: "png",
      clip: { x: 0, y: 0, width: 1920, height: 1080 },
    });
    screenshotPaths.push(filePath);
  }

  // Build PDF from screenshots using a new page
  console.log("  Assembling PDF...");
  const pdfPage = await browser.newPage();

  const imagesHtml = screenshotPaths
    .map((fp) => {
      const base64 = fs.readFileSync(fp).toString("base64");
      return `<div class="slide"><img src="data:image/png;base64,${base64}" /></div>`;
    })
    .join("\n");

  await pdfPage.setContent(
    `<!DOCTYPE html>
    <html>
    <head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      @page { size: 1920px 1080px; margin: 0; }
      html, body { width: 1920px; margin: 0; padding: 0; }
      .slide { width: 1920px; height: 1080px; page-break-after: always; overflow: hidden; }
      .slide:last-child { page-break-after: auto; }
      .slide img { width: 1920px; height: 1080px; display: block; object-fit: cover; }
    </style></head>
    <body>${imagesHtml}</body>
    </html>`,
    { waitUntil: "load" }
  );

  await sleep(500);

  const outPath = path.join(OUTPUT_DIR, "FYP-Presentation.pdf");
  await pdfPage.pdf({
    path: outPath,
    width: "1920px",
    height: "1080px",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  // Clean up temp screenshots
  for (const fp of screenshotPaths) {
    fs.unlinkSync(fp);
  }

  await page.close();
  await pdfPage.close();
  console.log(`  Saved: ${outPath}`);
  return outPath;
}

async function generateDashboardPDF(browser) {
  console.log("\n=== Generating Dashboard PDF ===");
  const page = await browser.newPage();
  // Tall viewport so all dashboard content (including below-the-fold) is in view from the start.
  // Recharts uses IntersectionObserver — charts only render when they enter the viewport.
  // Setting viewport tall enough to cover the whole page means everything renders on first paint.
  await page.setViewport({ width: 1920, height: 2000, deviceScaleFactor: 2 });

  const screenshotPaths = [];

  for (const { path: pagePath, name } of DASHBOARD_PAGES) {
    console.log(`  Capturing: ${name} (${pagePath})`);
    await page.goto(`${DASHBOARD_URL}${pagePath}`, {
      waitUntil: "networkidle0",
      timeout: 30000,
    });
    await waitForFonts(page);

    // Trigger any lazy-rendered charts by scrolling top → bottom → top, then wait for animations
    await page.evaluate(async () => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const totalHeight = document.documentElement.scrollHeight;
      const step = 400;
      for (let y = 0; y < totalHeight; y += step) {
        window.scrollTo(0, y);
        await sleep(150);
      }
      window.scrollTo(0, 0);
      await sleep(200);
    });

    // Wait for Recharts default 1500ms animations to fully complete after entering view
    await sleep(3500);

    // Measure the actual rendered content height so each PDF page sizes to its content
    const dimensions = await page.evaluate(() => ({
      width: Math.max(document.documentElement.scrollWidth, 1920),
      height: document.documentElement.scrollHeight,
    }));
    console.log(`    Content size: ${dimensions.width} x ${dimensions.height}`);

    const filePath = path.join(OUTPUT_DIR, `_dash_${name.replace(/\s/g, "_")}.png`);
    // Use clip with the measured content height — captures everything without relying on fullPage
    await page.screenshot({
      path: filePath,
      type: "png",
      clip: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
    });
    screenshotPaths.push({ filePath, name, width: dimensions.width, height: dimensions.height });
  }

  // Build PDF where each page is sized to match its captured screenshot's natural dimensions.
  // Uses CSS named pages so each .slide-N gets its own @page size definition.
  console.log("  Assembling PDF...");
  const pdfPage = await browser.newPage();

  const pageDefs = screenshotPaths
    .map(({ width, height }, i) => `@page slide${i} { size: ${width}px ${height}px; margin: 0; }`)
    .join("\n      ");

  const slideClasses = screenshotPaths
    .map(({ width, height }, i) => `.slide-${i} { page: slide${i}; width: ${width}px; height: ${height}px; }`)
    .join("\n      ");

  const imagesHtml = screenshotPaths
    .map(({ filePath, width, height }, i) => {
      const base64 = fs.readFileSync(filePath).toString("base64");
      return `<div class="slide slide-${i}"><img src="data:image/png;base64,${base64}" style="width:${width}px;height:${height}px;display:block;" /></div>`;
    })
    .join("\n");

  await pdfPage.setContent(
    `<!DOCTYPE html>
    <html>
    <head><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      ${pageDefs}
      html, body { margin: 0; padding: 0; }
      .slide { page-break-after: always; overflow: hidden; display: block; }
      .slide:last-child { page-break-after: auto; }
      ${slideClasses}
    </style></head>
    <body>${imagesHtml}</body>
    </html>`,
    { waitUntil: "load" }
  );

  await sleep(500);

  const outPath = path.join(OUTPUT_DIR, "FYP-Dashboard.pdf");
  await pdfPage.pdf({
    path: outPath,
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    preferCSSPageSize: true,
  });

  // Clean up temp screenshots
  for (const { filePath } of screenshotPaths) {
    fs.unlinkSync(filePath);
  }

  await page.close();
  await pdfPage.close();
  console.log(`  Saved: ${outPath}`);
  return outPath;
}

async function main() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-gpu-compositing",
    ],
  });

  try {
    const presPath = await generatePresentationPDF(browser);
    const dashPath = await generateDashboardPDF(browser);

    console.log("\n=== Done! ===");
    console.log(`Presentation: ${presPath}`);
    console.log(`Dashboard:    ${dashPath}`);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main();
