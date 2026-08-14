/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: columns-badges
 * Base block: columns
 * Source: https://store.brother.co.uk/  (selector: #content .icon-link-list-container)
 * Generated: 2026-08-13
 *
 * Library convention (Columns): multiple columns, first row = block name, second row
 *   defines the column count; additional rows must match that count.
 * Source structure: .icon-link-list-container holds several .icon-link-list-item badges,
 *   each = svg.icon + <span><strong>Title</strong><span>supporting text</span></span>.
 * We emit ONE content row with one cell per badge (4 columns), each cell containing the
 *   icon + title + text.
 */
export default function parse(element, { document }) {
  if (!element) {
    console.warn('columns-badges parser: element not found');
    return;
  }

  const badges = Array.from(element.querySelectorAll('.icon-link-list-item'));

  if (badges.length === 0) {
    console.warn('columns-badges parser: no badges found');
    element.replaceWith(...element.childNodes);
    return;
  }

  const row = badges.map((badge) => {
    const cellContent = [];
    // Raster icons (img) carry real assets — keep them. Inline decorative SVGs only
    // hold a GUID <title> that pollutes markdown, so drop the whole <svg> up front
    // (removing it also stops its <title>/<strong>-adjacent text from bleeding into
    // the title extraction below on the live-rendered DOM).
    badge.querySelectorAll('svg').forEach((svg) => svg.remove());
    const imgIcon = badge.querySelector('img');
    if (imgIcon) cellContent.push(imgIcon);

    // Title = the bold text anywhere in the badge. Text = the badge's remaining
    // text after removing the title. Emit as two block-level paragraphs (bold
    // title + plain text) so both survive markdown table conversion intact.
    const titleEl = badge.querySelector('strong');
    const title = titleEl ? titleEl.textContent.replace(/\s+/g, ' ').trim() : '';
    // Full badge text minus the title yields the supporting line, robust to
    // whether the description sits in its own <span> or as a bare text node.
    const fullText = badge.textContent.replace(/\s+/g, ' ').trim();
    const desc = title ? fullText.replace(title, '').trim() : fullText;
    if (title) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = title;
      p.append(strong);
      cellContent.push(p);
    }
    if (desc) {
      const p = document.createElement('p');
      p.textContent = desc;
      cellContent.push(p);
    }
    return cellContent;
  });

  const cells = [row];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-badges', cells });
  element.replaceWith(block);
}
