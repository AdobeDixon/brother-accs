# Brother Store Migration to AEM Edge Delivery Services — Plan

## Status
✅ Scope confirmed · ⏳ **Awaiting switch to Execute mode** to begin. The task list is staged and the first action (enabling the Commerce plugin) is ready to run the moment write access is available.

## Overview
Migrate two key pages from **https://store.brother.co.uk/** into this AEM Edge Delivery Services (EDS) project:
1. **Homepage** — `https://store.brother.co.uk/`
2. **Supplies listing page (PLP)** — `https://store.brother.co.uk/supplies#sort=relevancy`

The migration covers **page content, navigation (header), footer, and design/styling** so the migrated pages match the look and structure of the original store. The `/supplies` page is a commerce **product listing page (PLP)**, handled via the Commerce migration plugin and captured as **layout & design only** (structure, filters, and grid styling — not live catalog data).

## Scope (confirmed)
- **Source site**: store.brother.co.uk
- **Pages**: Homepage + `/supplies` (PLP)
- **Includes**: Page content · Navigation (header) · Footer · Design & styling
- **Commerce plugin**: **Enable** — for PDP/PLP classification and routing
- **PLP handling**: **Layout & design only** (no live product/catalog data integration)

## Inputs still needed
- [ ] Confirm the **target content location / project type** (Document Authoring vs. crosswalk/xwalk) — I'll detect this and confirm with you during Phase 1.

## Approach & Phases

### Phase 0 — Enable Commerce plugin *(first execution step — requires Execute mode)*
- Write `.agents/settings.json` with `{"enabledPlugins": {"excat-commerce@excat-extended": true}}`.
- Commerce skills become available on the following turn (session auto-reinitializes). No restart needed.

### Phase 1 — Project & site analysis
- Detect project type (doc / da / xwalk) and the block library endpoint for this project.
- Scrape both source pages: content, metadata, and images.
- **Classify** each page: homepage (content) vs. `/supplies` (PLP) via the Commerce plugin, and route accordingly.

### Phase 2 — Content modeling per page type
- **Homepage**: identify sections and content sequences; decide default content vs. blocks; match to existing project/collection blocks or design new variants.
- **PLP (`/supplies`)**: model the listing layout — filter/facet rail, sort controls, product grid, breadcrumbs — as layout/design structure only.
- Record block mappings (DOM selectors) per page type.

### Phase 3 — Import infrastructure
- Generate block parsers and page transformers for each page type/variant.
- Build the bundled import script (using the project's import tooling — no hand-authored HTML in the content directory).

### Phase 4 — Content import & preview
- Run the import for both pages.
- Preview locally, verify rendering, and compare against the originals.

### Phase 5 — Navigation (header)
- Instrument the store header/navigation (desktop + mobile, including any megamenu) to match the source, verified with screenshots.

### Phase 6 — Footer
- Build the store footer to match the source (desktop + mobile), validated against the original.

### Phase 7 — Design & styling
- Extract source design tokens (colors, typography, spacing) and apply site-level styling.
- Match each migrated block's styling to the original (including PLP grid/filter layout) with visual verification and iteration.

### Phase 8 — Validation & QA
- Post-import content-completeness scoring (source vs. output) and drill into divergences.
- Visual critique per section/page against the original; fix issues.
- Run `npm run lint`; check accessibility and performance.

## Checklist
- [ ] Enable Commerce plugin (`.agents/settings.json`)
- [ ] Detect project type and confirm target content location
- [ ] Scrape homepage and `/supplies` (content, metadata, images)
- [ ] Classify pages (homepage vs. PLP) and route via Commerce plugin
- [ ] Model homepage content (default content vs. blocks)
- [ ] Model `/supplies` PLP layout (filters, sort, grid) — layout/design only
- [ ] Match/reuse existing blocks; design new block variants as needed
- [ ] Record block mappings per page type
- [ ] Generate parsers and transformers
- [ ] Build bundled import script
- [ ] Run import for both pages
- [ ] Preview locally and compare with originals
- [ ] Instrument navigation/header (desktop + mobile, megamenu)
- [ ] Build footer (desktop + mobile)
- [ ] Extract design tokens and apply site-level styling
- [ ] Match block-level styling to original with visual verification
- [ ] Run post-import content-completeness validation
- [ ] Visual critique and fix divergences
- [ ] Run linting, accessibility, and performance checks
- [ ] Prepare feature-branch preview URLs for PR review

## Notes
- **PLP scope boundary:** `/supplies` reproduces structure and styling only. Wiring live product data would require commerce backend/catalog integration and is out of scope for this pass.
- **Forms:** If either page includes forms (e.g. newsletter signup, search), those render as static layout unless the Forms plugin is enabled — I can enable it on request.

---
**Execution requires Execute mode.** The harness currently has Plan mode active, which blocks file writes. Once you switch to Execute mode, I'll start with Phase 0 (enabling the Commerce plugin) and proceed through the checklist.
