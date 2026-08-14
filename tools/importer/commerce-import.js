/*
 * Commerce PLP import script — store.brother.co.uk/supplies
 *
 * Rebuilds the page as an EDS Document Authoring document:
 *   Section 1: default content — page heading (H1 + subheading)
 *   Section 2: product-list-page commerce block (urlpath=supplies, pageSize=10)
 *
 * The source PLP renders its search/facets/sort/pagination/grid via Coveo.
 * None of that markup is imported — the product-list-page block reproduces the
 * listing at runtime via the Adobe Commerce product-discovery dropin. This
 * script therefore only carries the standard heading content plus the block
 * configuration table.
 */

/* global WebImporter */

/**
 * Parse the page heading (H1 + subheading) into default content.
 * Returns a document fragment of clean heading nodes, or null if absent.
 */
function parseHeading(document) {
  const h1 = document.querySelector('h1');
  if (!h1 || !/Shop Original Supplies/i.test(h1.textContent)) {
    // Fall back to the first h1 on the page if the expected copy moved.
    if (!h1) {
      console.warn('⚠️ parseHeading: no <h1> found in document');
      return null;
    }
  }

  const frag = document.createElement('div');

  // Heading — normalize to a clean <h1> with plain text.
  const newH1 = document.createElement('h1');
  newH1.textContent = h1.textContent.trim();
  frag.append(newH1);

  // Subheading — the source uses an <h3><em> immediately after the h1.
  const sub = h1.parentElement ? h1.parentElement.querySelector('h3, h2') : null;
  if (sub && sub.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = sub.textContent.trim();
    frag.append(p);
  }

  return frag;
}

export default {
  transform({ document, url }) {
    const main = document.body;

    // ---- STEP 1: Extract all content while the DOM is still intact ----
    const headingContent = parseHeading(document);

    // Commerce block config (not DOM-dependent — safe to build now).
    const productListPageBlock = WebImporter.DOMUtils.createTable([
      ['product-list-page'],
      ['urlpath', 'supplies'],
      ['pageSize', '10'],
    ], document);

    // ---- STEP 2: Clear — no DOM queries after this line ----
    main.innerHTML = '';

    // ---- STEP 3: Rebuild sections in page order ----
    // Section 1: heading (default content)
    if (headingContent) {
      const headingSection = document.createElement('div');
      headingSection.append(headingContent);
      main.append(headingSection);
      main.append(document.createElement('hr'));
    }

    // Section 2: product listing (commerce block)
    const listingSection = document.createElement('div');
    listingSection.append(productListPageBlock);
    main.append(listingSection);

    // ---- STEP 4: Metadata + built-in rules ----
    // Heading-only content carries no images, so createMetadata is the only
    // rule needed (title/description from the source <head>).
    WebImporter.rules.createMetadata(main, document);

    // Strip trailing .html / slash before sanitizing so the importer does not
    // emit a double extension (…/supplies.html.plain.html).
    const rawPath = new URL(url).pathname.replace(/\.html?$/i, '').replace(/\/+$/, '') || '/';
    return [{ element: main, path: WebImporter.FileUtils.sanitizePath(rawPath) }];
  },
};
