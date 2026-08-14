/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Brother store (store.brother.co.uk) section breaks + metadata.
 *
 * The homepage under <main> #content is a single flat run of components. This
 * transformer inserts an <hr> section break before each section (except the
 * first) and a "Section Metadata" block for sections that need a section style.
 *
 * page-templates.json for this site does NOT carry a `sections` array, so the
 * DOM-verified section boundaries are embedded below (SECTIONS). If a future
 * template run populates payload.template.sections, that takes precedence.
 *
 * All selectors verified by reading migration-work/cleaned.html:
 *   - section 1 hero        .dsc-hero                                   line 852
 *   - section 2 cards       .section.product-categories                line 873
 *   - section 3 badges      .icon-link-list-container (style=grey)      line 951
 *   - section 4 ecopro      .component.promo.col-xs-12 .section--theme-8 lines 1066/1068
 *   - section 5 genuine     .section.section--theme-1                   line 1110
 *   - section 6 printers    .component.promo:not(.col-xs-12) .section--theme-8 lines 1139/1141
 *
 * NOTE: this commerce boilerplate's aem.js does not implement section-metadata
 * runtime support (decorateSections ignores a .section-metadata block), so a
 * Section Metadata table would 404 and render as literal "style/grey" text.
 * The grey trust-badge band is therefore baked into blocks/columns-badges CSS
 * instead (the alternative the page analysis flagged), and this transformer only
 * inserts plain section breaks — no section styles are emitted here.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

const SECTIONS = [
  { id: 'section-1-hero', selector: '#content .dsc-hero' },
  { id: 'section-2-category-cards', selector: '#content .section.product-categories' },
  { id: 'section-3-trust-badges', selector: '#content .icon-link-list-container' },
  { id: 'section-4-ecopro', selector: '#content .component.promo.col-xs-12 .section--theme-8' },
  { id: 'section-5-genuine-supplies', selector: '#content .section.section--theme-1' },
  { id: 'section-6-brother-printers', selector: '#content .component.promo:not(.col-xs-12) .section--theme-8' },
];

export default function transform(hookName, element, payload) {
  const templateSections = payload && payload.template && payload.template.sections;
  const sections = (Array.isArray(templateSections) && templateSections.length > 1)
    ? templateSections
    : SECTIONS;

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before block parsers can replace any section element.
    // Iterate in reverse so inserts never shift not-yet-processed elements.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue; // selector didn't match — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or the original element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || element.querySelector(section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
