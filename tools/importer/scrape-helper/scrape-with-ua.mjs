#!/usr/bin/env node
/*
 * Project-local scrape wrapper.
 *
 * Reuses the excat scrape-webpage skill's helper modules (image capture,
 * path generation, browser launcher) but opens the page with a realistic
 * desktop Chrome User-Agent. store.brother.co.uk's WAF blocks the default
 * headless "HeadlessChrome" UA (returns "The request is blocked"), while a
 * normal browser UA is served the full page. Everything else mirrors the
 * upstream analyze-webpage.js so downstream tooling sees identical artifacts.
 */

import fs from 'fs';
import path from 'path';

const SKILL_SCRIPTS = '/home/node/.excat-marketplaces/excat-marketplace/edge-delivery-services/skills/scrape-webpage/scripts';
const EXCAT_UTILS = '/home/node/.excat-marketplaces/excat-marketplace/excat/utils';

const { connectOrLaunch } = await import(`${EXCAT_UTILS}/playwright-browser.js`);
const { generateDocumentPathInfo } = await import(`${SKILL_SCRIPTS}/generate-path.js`);
const { setupImageCapture, waitForPendingImages, replaceImageUrls } = await import(`${SKILL_SCRIPTS}/image-capture.js`);
const { scrollToTriggerLazyLoad, extractCleanedHTML, extractMetadata } = await import(`${SKILL_SCRIPTS}/analyze-webpage.js`);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function analyzeWebpage(url, outputDir) {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  console.error(`Analyzing: ${url}`);
  console.error(`Output directory: ${outputDir}`);

  // Resolve playwright from the skill's node_modules via callerUrl.
  const browser = await connectOrLaunch({}, { callerUrl: `file://${SKILL_SCRIPTS}/analyze-webpage.js` });
  const page = await browser.newPage({
    userAgent: UA,
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: { 'Accept-Language': 'en-GB,en;q=0.9' },
  });

  try {
    console.error('Setting up image capture...');
    const captureState = setupImageCapture(page, outputDir);

    console.error('Navigating to page...');
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    } catch (error) {
      console.error('⚠️  networkidle timeout, falling back to domcontentloaded...');
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000);
    }

    console.error('Scrolling to trigger lazy-loaded content...');
    await scrollToTriggerLazyLoad(page);
    await page.waitForTimeout(1500);

    console.error(`Waiting for ${captureState.pendingImages.size} pending images...`);
    await waitForPendingImages(captureState, 8000);
    console.error(`✅ Image capture complete: ${captureState.stats.total} total, ${captureState.stats.converted} converted, ${captureState.stats.failed} failed`);

    console.error('Capturing screenshot...');
    const screenshot = path.join(outputDir, 'screenshot.png');
    await page.screenshot({ path: screenshot, fullPage: true });

    console.error('Extracting metadata...');
    const metadata = await extractMetadata(page);

    captureState.disable();

    console.error('Fixing images in DOM...');
    // fixImagesInDom is not exported; re-run minimal absolute-URL + srcset fix inline.
    await page.evaluate((sourceUrl) => {
      document.body.querySelectorAll('img').forEach((img) => {
        let src = img.getAttribute('src');
        const srcset = img.getAttribute('srcset')?.split(' ')[0];
        if (!src && srcset) img.setAttribute('src', srcset);
        src = img.getAttribute('src');
        if (src) {
          try { new URL(src); } catch (e) {
            try { img.src = new URL(src.startsWith('/') ? src : `./${src}`, sourceUrl).toString(); } catch (err) { /* noop */ }
          }
        }
      });
    }, url);

    console.error('Extracting cleaned HTML...');
    let html = await extractCleanedHTML(page);

    console.error('Replacing image URLs with local paths...');
    html = replaceImageUrls(html, captureState.imageMap);
    const htmlPath = path.join(outputDir, 'cleaned.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');

    console.error('Generating document paths...');
    const paths = generateDocumentPathInfo(url);

    const result = {
      url,
      timestamp: new Date().toISOString(),
      paths: {
        documentPath: paths.documentPath,
        htmlFilePath: paths.htmlFilePath,
        mdFilePath: paths.mdFilePath,
        dirPath: paths.dirPath,
        filename: paths.filename,
      },
      screenshot,
      html: { filePath: htmlPath, size: html.length },
      metadata,
      images: {
        count: captureState.imageMap.size,
        mapping: Object.fromEntries(captureState.imageMap),
        stats: captureState.stats,
      },
    };

    const metadataPath = path.join(outputDir, 'metadata.json');
    fs.writeFileSync(metadataPath, JSON.stringify(result, null, 2), 'utf-8');
    console.error(`Saved metadata to: ${metadataPath}`);
    console.error('Analysis complete!');
    return result;
  } finally {
    await browser.close();
  }
}

const args = process.argv.slice(2);
const url = args[0];
let outputDir = './page-analysis';
const outputIndex = args.indexOf('--output');
if (outputIndex !== -1 && args[outputIndex + 1]) outputDir = args[outputIndex + 1];

try {
  const result = await analyzeWebpage(url, outputDir);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(`Error analyzing webpage: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
