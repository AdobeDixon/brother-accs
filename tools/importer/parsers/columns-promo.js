/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns-promo
 * Base block: columns
 * Source: https://store.brother.co.uk/
 *   Instances:
 *     #content .section.section--theme-8:nth-of-type(1) .promo-banner  (EcoPro)
 *     #content .section.section--theme-8:nth-of-type(2) .promo-banner  (Brother Printers)
 * Generated: 2026-08-13
 *
 * Library convention (Columns): first row = block name; second row defines column count.
 * Source structure: .promo-banner > .promo-banner__flex-container >
 *   .promo-banner__media (left, one or more <div><img></div>) +
 *   .promo-banner__content (right: h2 + h3 + p(s) + optional <ul> + CTA <p><a>).
 * Emit as 2 columns: [ image | rich text ].  One parser handles BOTH instances.
 */
export default function parse(element, { document }) {
  if (!element) {
    console.warn('columns-promo parser: element not found');
    return;
  }

  const media = element.querySelector('.promo-banner__media');
  const content = element.querySelector('.promo-banner__content');

  // Empty-block guard.
  if (!content && !media) {
    console.warn('columns-promo parser: no content found');
    element.replaceWith(...element.childNodes);
    return;
  }

  // LEFT cell: first real image from the media block (skip empty src="").
  const mediaCell = [];
  if (media) {
    const images = Array.from(media.querySelectorAll('img'))
      .filter((img) => img.getAttribute('src'));
    images.forEach((img) => mediaCell.push(img));
  }

  // RIGHT cell: all rich-text children of the content block (h2, h3, p, ul, CTA...).
  const textCell = [];
  if (content) {
    Array.from(content.children).forEach((child) => textCell.push(child));
  }

  const cells = [[mediaCell, textCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
