/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroSplitParser from './parsers/hero-split.js';
import cardsCategoryParser from './parsers/cards-category.js';
import columnsBadgesParser from './parsers/columns-badges.js';
import columnsPromoParser from './parsers/columns-promo.js';
import heroOverlayParser from './parsers/hero-overlay.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/brother-cleanup.js';
import sectionsTransformer from './transformers/brother-sections.js';

// PARSER REGISTRY
const parsers = {
  'hero-split': heroSplitParser,
  'cards-category': cardsCategoryParser,
  'columns-badges': columnsBadgesParser,
  'columns-promo': columnsPromoParser,
  'hero-overlay': heroOverlayParser,
};

// TRANSFORMER REGISTRY — cleanup runs first (beforeTransform), sections adds
// breaks + grey section-metadata (afterTransform).
const transformers = [
  cleanupTransformer,
  sectionsTransformer,
];

// PAGE TEMPLATE CONFIGURATION — embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'Brother store homepage: hero banner, category cards, trust badges, EcoPro subscription, Genuine Supplies banner, Brother Printers',
  urls: ['https://store.brother.co.uk/'],
  blocks: [
    { name: 'hero-split', instances: ['#content .dsc-hero'] },
    { name: 'cards-category', instances: ['#content .section.product-categories'] },
    { name: 'columns-badges', instances: ['#content .icon-link-list-container'], section: 'grey' },
    { name: 'columns-promo', instances: ['#content .section.section--theme-8:nth-of-type(1) .promo-banner', '#content .section.section--theme-8:nth-of-type(2) .promo-banner'] },
    { name: 'hero-overlay', instances: ['#content .section.section--theme-1 .promo-banner'] },
  ],
};

/**
 * Execute all page transformers for a specific hook.
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all block instances on the page from the embedded template.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    // 1. beforeTransform — remove header/footer/chrome
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block in place (parsers replaceWith their block table).
    //    Skip elements already detached by an earlier parser.
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. afterTransform — section breaks + grey section-metadata
    executeTransformers('afterTransform', main, payload);

    // 5. Built-in importer rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Sanitized path. Root URL ('/') → '/index' to avoid the bundled
    //    importer's empty-path crash (process.cwd is not a function).
    const rawPath = new URL(params.originalURL || url).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath === '' ? '/index' : rawPath);

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
