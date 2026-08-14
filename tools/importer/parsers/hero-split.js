/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero-split
 * Base block: hero
 * Source: https://store.brother.co.uk/  (selector: #content .dsc-hero)
 * Generated: 2026-08-13
 *
 * Library convention (Hero): 1 column, 3 rows.
 *   Row 1: block name
 *   Row 2: background image (optional)
 *   Row 3: title (heading) + subheading + CTA
 * Source structure: .dsc-hero > .image-block.banner__media img (left) +
 *   .text-block > .content-wrapper (h1 + h4) + .cta-container-links .btn a (CTA)
 */
export default function parse(element, { document }) {
  if (!element) {
    console.warn('hero-split parser: element not found');
    return;
  }

  // Image (left panel)
  const image = element.querySelector('.banner__media img, .image-block img, img');

  // Heading / subheading (right panel)
  const heading = element.querySelector('h1, h2, .content-wrapper h1, [class*="content"] h1');
  const subheading = element.querySelector('h4, h3, h5, .content-wrapper h4');

  // CTA link
  const cta = element.querySelector('.cta-container-links a, .btn a, a[href]');

  // Empty-block guard
  if (!heading && !image && !cta) {
    console.warn('hero-split parser: no essential content found');
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background/hero image (optional)
  if (image) {
    cells.push([image]);
  }

  // Row 3: content cell (single cell holding heading, subheading, CTA)
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (subheading) contentCell.push(subheading);
  if (cta) contentCell.push(cta);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-split', cells });
  element.replaceWith(block);
}
