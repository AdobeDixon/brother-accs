/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: cards-category
 * Base block: cards
 * Source: https://store.brother.co.uk/  (selector: #content .section.product-categories)
 * Generated: 2026-08-13
 *
 * Library convention (Cards): 2 columns, multiple rows.
 *   Row 1: block name
 *   Each subsequent row = one card: cell 1 = image/icon, cell 2 = text/CTA.
 * Source structure: .product-categories contains a slick carousel; each real card is a
 *   .product-categories_item (img + .center span a.br-btn). The default-content H2
 *   "Explore the complete range..." lives ABOVE the cards and must stay OUTSIDE the block
 *   (handled by the transformer / left in place — this parser does not emit it).
 * Slick may duplicate slides as .slick-cloned; those are excluded so cards aren't repeated.
 */
export default function parse(element, { document }) {
  if (!element) {
    console.warn('cards-category parser: element not found');
    return;
  }

  // Collect unique category card items, skipping any slick-cloned duplicates.
  const items = Array.from(element.querySelectorAll('.product-categories_item'))
    .filter((item) => !item.closest('.slick-cloned'));

  if (items.length === 0) {
    console.warn('cards-category parser: no category cards found');
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  items.forEach((item) => {
    const image = item.querySelector('img');
    // The CTA is the category link, styled as a button in source.
    const link = item.querySelector('a[href]');

    const textCell = [];
    if (link) textCell.push(link);

    cells.push([image || '', textCell]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-category', cells });
  element.replaceWith(block);
}
