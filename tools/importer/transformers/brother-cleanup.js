/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Brother store (store.brother.co.uk) site-wide cleanup.
 *
 * Removes non-authorable site chrome so the import contains only page-level
 * authorable content that lives under <main> #content.
 *
 * ALL selectors below were verified by reading migration-work/cleaned.html
 * (line references noted). No selectors are guessed.
 */

const TransformHook = {
  beforeTransform: 'beforeTransform',
  afterTransform: 'afterTransform',
};

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Overlays / consent / floating widgets that could block or pollute
    // block matching. Verified in cleaned.html:
    //  - #onetrust-consent-sdk (cookie dialog)            line 1416
    //  - #ot-sdk-btn-floating (floating cookie button)    line 1691
    //  - #ot-fltr-modal (cookie filter modal)             line 1611
    //  - .search-popup (header search overlay)            line 379
    //  - #boost-soft-teaser (search/boost teaser button)  line 1716
    //  - [id^="batBeacon"] (Bing tracking beacon)         lines 1718-1719
    //  - #ga-page-datamodel (GA data input)               line 2
    //  - #_CRSFform (hidden CSRF form)                     line 5
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#ot-sdk-btn-floating',
      '#ot-fltr-modal',
      '.search-popup',
      '#boost-soft-teaser',
      '[id^="batBeacon"]',
      '#ga-page-datamodel',
      '#_CRSFform',
    ]);

    // Tracking / analytics pixel images (Twitter, Bing, Google, Bazaarvoice,
    // Clarity, DoubleClick). These 1x1 beacons sit outside #content and would
    // otherwise leak into the imported document as stray <img> tags.
    element.querySelectorAll('img').forEach((img) => {
      const src = img.getAttribute('src') || '';
      if (/(t\.co|analytics\.twitter\.com|adsct|bat\.bing|clarity\.ms|googlesyndication|doubleclick|bazaarvoice\.com\/a\.gif|\/i\/adsct)/i.test(src)) {
        img.remove();
      }
    });
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome. Header (#header) and footer (#footer) are
    // handled by the navigation/footer migration phases, NOT this content
    // import. Verified in cleaned.html:
    //  - header / #header                                 lines 16-17, 186
    //  - footer / #footer                                 lines 1175, 1176
    //  - svg.svg-sprite (global icon sprite <defs>)       line 19
    //  - .aftership / order-tracking chrome lives in footer, removed via footer
    WebImporter.DOMUtils.remove(element, [
      'header',
      '#header',
      'footer',
      '#footer',
      'svg.svg-sprite',
    ]);

    // Remove stray non-content inputs left by the scraper (form remnants).
    // Verified in cleaned.html lines 2, 6, 8-12: bare <input> elements outside
    // any authorable content.
    element.querySelectorAll('input').forEach((el) => el.remove());

    // Safe structural/embed elements that never carry authorable content.
    WebImporter.DOMUtils.remove(element, [
      'iframe',
      'noscript',
      'script',
      'style',
      'link',
    ]);
  }
}
