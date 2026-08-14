# Brother store — import infrastructure

Reusable tooling that migrated **store.brother.co.uk** pages into this Edge Delivery project. Use it to re-import or extend the migrated page types.

## Layout

```
tools/importer/
├── page-templates.json        # homepage template: block variants + DOM selectors
├── import-homepage.js         # homepage import script (parsers + transformers)
├── commerce-import.js         # /supplies PLP import script (product-list-page block)
├── parsers/                   # per-block: DOM → EDS block table
│   ├── hero-split.js          #   top hero (image + blue text panel)
│   ├── cards-category.js      #   4 category cards
│   ├── columns-badges.js      #   trust-badge strip (grey band)
│   ├── columns-promo.js       #   image + rich-text promo (EcoPro, Printers)
│   └── hero-overlay.js        #   full-bleed dark banner (Genuine Supplies)
├── transformers/              # site-wide DOM cleanup
│   ├── brother-cleanup.js     #   strips header/footer/chrome/tracking pixels
│   └── brother-sections.js    #   inserts section breaks
└── scrape-helper/
    └── scrape-with-ua.mjs     # UA-safe scraper (see WAF note)
```

## Re-import a page

```bash
# 1. bundle the import script (produces *.bundle.js)
<excat-content-import>/scripts/aem-import-bundle.sh --importjs tools/importer/import-homepage.js

# 2. run the bulk importer against the URL list
node <excat-content-import>/scripts/run-bulk-import.js \
  --import-script tools/importer/import-homepage.bundle.js \
  --urls tools/importer/urls-homepage.txt
```

Output goes to `content/*.plain.html` (gitignored — content lives in Document Authoring).

## WAF note (important)

`store.brother.co.uk` returns **HTTP 403** to the default headless Chrome user-agent. Two consequences:

- **Scraping:** use `scrape-helper/scrape-with-ua.mjs` (realistic Chrome UA) instead of the default scrape skill, or the page comes back as "The request is blocked".
- **Importing:** `run-bulk-import.js` already sends a realistic UA, so the bulk import works as-is.

## Deploying content to Document Authoring (DA)

This is a **`da`** (Document Authoring) project — page content is NOT committed to git; it is uploaded to DA and served from there. Code (blocks/styles) is served from the git branch.

DA source docs must be **full HTML documents** (`<body><header></header><main>…sections…</main><footer></footer></body>`), NOT the bare `.plain.html` fragment — uploading a raw fragment stores it but renders empty. Wrap fragments first, then:

```bash
# upload (no auth header — injected via the DA/IMS opt-in)
curl -X POST -F "data=@<wrapped>.html;type=text/html" \
  "https://admin.da.live/source/AdobeDixon/brother-accs/<path>.html"
# then preview
curl -X POST "https://admin.hlx.page/preview/adobedixon/brother-accs/main/<path>"
```

Pages: `index` (served at `/`), `supplies`, `nav`, `footer`. Nav/footer images live under `content/images/`.

## PLP scope

`/supplies` was migrated **layout & design only** — the `product-list-page` block loads products at runtime via the Adobe Commerce catalog API (`urlpath=supplies`, `pageSize=10`). The demo sandbox catalog has no Brother products, so preview shows "0 results"; this is expected.
