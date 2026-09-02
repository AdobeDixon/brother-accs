# Brother demo catalog — attributes, attribute sets & product import

Everything needed to stand up a 30-product Brother demo catalog in **Adobe
Commerce (ACCS)**, with the **attributes and attribute sets created *before***
the products are ingested. Two paths are provided: an **automated script**
(recommended) and a **flat CSV** for the Admin importer.

For the exact end-to-end procedure used for the current storefront—including
the final 30-product dataset, configurable products, downloaded images, AEM
Assets metadata/SKU mapping, publication, shared-catalog access, verification,
and storefront filtering—see [`BROTHER_CATALOG_RUNBOOK.md`](./BROTHER_CATALOG_RUNBOOK.md).

## TL;DR
```bash
# Create a local credential file first:
cp .env.example .env

# preview (no writes)
COMMERCE_REST_BASE="https://<host>/rest/all/V1" COMMERCE_TOKEN="<token>" \
  node tools/catalog-import/setup-catalog.mjs --dry-run
# apply
COMMERCE_REST_BASE="https://<host>/rest/all/V1" COMMERCE_TOKEN="<token>" \
  node tools/catalog-import/setup-catalog.mjs
```

`.env` is gitignored and safe for local secrets. The catalog setup script
currently consumes `COMMERCE_REST_BASE`, `COMMERCE_TOKEN`, and optionally
`ROOT_CATEGORY_ID`. `COMMERCE_CLIENT_ID` and `COMMERCE_CLIENT_SECRET` are
reserved for an OAuth token-minting integration; this script does not send
client credentials directly to the REST API.

## Files
| File | Purpose |
|---|---|
| `catalog-data.mjs` | **Single source of truth** — 30 attributes, 5 attribute sets, 30 products (with per-product attribute values), and a `provenance` map. Edit this to change the catalog. |
| `setup-catalog.mjs` | Automated, **idempotent** orchestrator. Creates everything via the Commerce REST API in dependency order. Zero dependencies (Node 18+ built-in `fetch`). |
| `export-csv.mjs` | Regenerates the two CSVs below from `catalog-data.mjs` so they never drift. Run: `node tools/catalog-import/export-csv.mjs`. |
| `brother-products-accs-import.csv` | Derived flat CSV for **Admin ▸ System ▸ Import** (manual alternative to the script). |
| `brother-products-sources.csv` | Derived provenance sheet: SKU → source URL, price, verified/representative. |
| `brother-attribute-plan.md` | The design write-up: which sets/attributes and why, storefront flags, option lists. Read this first for the *rationale*. |

## What the automation does (in order)
The order matters — selects/options must exist before products can reference them.
1. **Attributes** — creates each custom attribute; for `select`/`multiselect`, creates its **options**. (`GET /products/attributes/{code}` → create if missing; adds any new options.)
2. **Attribute sets** — clones 5 sets from `Default`, adds a `Product Specs` group, and **assigns** the attributes. (`/products/attribute-sets*`.)
3. **Categories** — ensures the tree from each product's `categoryPath` under `ROOT_CATEGORY_ID` (default `2`). (`GET /categories` primed, then `POST /categories` for gaps.)
4. **Products** — upserts each via `PUT /products/{sku}`, resolving `select`/`multiselect` values to **option IDs** (the REST API requires IDs, not labels), booleans to `0/1`, and linking the leaf category + stock.

**Idempotent throughout** — existing attributes/options/sets/assignments/categories/products are detected and reused/updated, so re-running is safe.

## The 5 attribute sets → products
| Set | Products | Filterable attributes (Live Search facets) |
|---|---|---|
| **Printer** (10) | inkjet + laser | `print_technology`, `functions`, `output_type`, `max_paper_size`, `duplex_printing`, `ecopro_eligible`, `connectivity`, `brand` |
| **Ink & Toner** (10) | ink + toner | `consumable_type`, `cartridge_colour`, `yield_class`, `pack_size` |
| **Label Printer** (4) | P-touch | `max_tape_width_mm`, `portability`, `connectivity` |
| **Labelling Tape** (3) | TZe tapes | `tape_width_mm`, `text_colour`, `tape_colour`, `laminated` |
| **Scanner** (3) | ADS | `scanner_type`, `duplex_scan`, `connectivity` |

Shared attributes (`brand`, `connectivity`, `ean`, `warranty`) are on every set.
Full attribute list, types and option values live in `catalog-data.mjs` and are
explained in `brother-attribute-plan.md`.

## Config / flags
| Env / flag | |
|---|---|
| `COMMERCE_REST_BASE` | REST base incl. `/V1`, e.g. `https://<host>/rest/all/V1` (required). |
| `COMMERCE_TOKEN` | Admin/integration **bearer token** with catalog write access (required; read from env, never stored). |
| `ROOT_CATEGORY_ID` | Root to build the tree under (default `2` = Default Category). |
| `--dry-run` | Existence checks + a printed plan; makes **no** writes. |
| `--skip-products` | Provision only attributes + sets. |

## Provenance & caveats (important for anyone picking this up)
- **Data source:** compiled from Brother's public UK store listings
  (`store.brother.co.uk`) via web search. The live store **blocks automated
  fetches** (403) and the in-app browser is policy-blocked for that domain, so
  this was *not* a live DOM scrape.
- **Prices** are ex-VAT GBP. Only a few are `verified` (seen in a search result);
  the rest are `representative` RRP estimates — see `provenance` in
  `catalog-data.mjs` / `brother-products-sources.csv` and confirm against each
  `sourceUrl` before treating prices as real.
- **Specs** (ppm, yields, ADF capacity, connectivity, etc.) are representative.
- **Images are intentionally unset.** Brother product images sit behind the same
  bot protection; this project handles product imagery separately via SKU-mapped
  AEM Assets (as on the other storefronts), so wire images up there — do not
  expect the importer to fetch them from `store.brother.co.uk`.

## CSV path (alternative to the script)
`brother-products-accs-import.csv` is a standard Admin importer CSV. Custom
values ride in `additional_attributes` (`code=value`, `|`-separated for
multiselect). Note: the Admin importer resolves/creates option **labels**, so
that CSV uses labels; the **REST script** resolves labels to option **IDs**
itself. If you edit the catalog, edit `catalog-data.mjs` then re-run
`export-csv.mjs` — don't hand-edit the CSVs.

## To change the catalog
Edit `catalog-data.mjs` (attributes / attributeSets / products / provenance),
then `node export-csv.mjs` to refresh the CSVs. Re-run `setup-catalog.mjs` to apply.
