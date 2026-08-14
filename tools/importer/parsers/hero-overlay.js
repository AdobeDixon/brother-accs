/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero-overlay
 * Base block: hero
 * Source: https://store.brother.co.uk/  (selector: #content .section.section--theme-1 .promo-banner)
 * Generated: 2026-08-13
 *
 * Library convention (Hero): 1 column, 3 rows.
 *   Row 1: block name
 *   Row 2: background image (optional)
 *   Row 3: title (heading) + subheading + body + CTA
 * Source structure: the full-bleed banner background is delivered via sibling
 *   .section-bg divs (CSS background, no <img> element), so no background image row is
 *   emitted here. The overlaid content lives in
 *   .promo-banner > .promo-banner__fixed-width-content > .promo-banner__content:
 *   h2.title + h3.subtitle + p (body) + p > a.br-btn (CTA).
 * A background <img> is still handled if one is present inside the element.
 */
export default function parse(element, { document }) {
  if (!element) {
    console.warn('hero-overlay parser: element not found');
    return;
  }

  const content = element.querySelector('.promo-banner__content') || element;

  const heading = content.querySelector('h1, h2, .title');
  const subheading = content.querySelector('h3, h4, .subtitle');
  const bodyParas = Array.from(content.querySelectorAll('p'))
    .filter((p) => !p.querySelector('a.br-btn, a.button'));
  const cta = content.querySelector('a.br-btn, a.button, a[href]');

  // Optional background image, only if one actually exists inside the element.
  const bgImage = element.querySelector('img[src]');

  // Empty-block guard.
  if (!heading && !subheading && bodyParas.length === 0 && !cta) {
    console.warn('hero-overlay parser: no essential content found');
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (optional).
  if (bgImage) {
    cells.push([bgImage]);
  }

  // Row 3: content cell (single cell holding heading, subheading, body, CTA).
  const contentCell = [];
  if (heading) contentCell.push(heading);
  if (subheading) contentCell.push(subheading);
  bodyParas.forEach((p) => contentCell.push(p));
  if (cta) contentCell.push(cta);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-overlay', cells });
  element.replaceWith(block);
}
