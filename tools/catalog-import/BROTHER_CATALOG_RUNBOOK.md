# Brother catalog ingestion and AEM Assets runbook

This is the complete record of how the current 30-record Brother catalog was
prepared, imported into Adobe Commerce Cloud Service (ACCS), connected to AEM
Assets, made purchasable, and isolated from the legacy catalog on the
storefront.

The final dataset contains:

- 30 Commerce records: 27 simple products/variants and 3 configurable parents.
- 16 individually visible storefront products. Configurable children are not
  visible individually but remain purchasable through their parent.
- 101 downloaded product images covering every physical SKU.
- 8 category paths.
- 3 configurable families: `LC223-CONF`, `TN421-CONF`, and `TZE12-CONF`.

## Security and environment setup

Copy the example file and keep the real values only in the ignored `.env`:

```bash
cp .env.example .env
```

The scripts expect these values where applicable:

```text
COMMERCE_REST_BASE=https://na1-sandbox.api.commerce.adobe.com/<instance-id>
COMMERCE_TOKEN_URL=https://ims-na1.adobelogin.com/ims/token/v3
COMMERCE_CLIENT_ID=<server-to-server-client-id>
COMMERCE_CLIENT_SECRET=<server-to-server-secret>
COMMERCE_SCOPES=openid,AdobeID,additional_info.projectedProductContext,email,org.read,additional_info.roles,profile,commerce.accs
AEM_AUTHOR_BASE=https://author-<program>-<environment>.adobeaemcloud.com
AEM_BEARER_TOKEN=<short-lived-AEM-author-token>
```

Never commit `.env`, bearer tokens, client secrets, or copied authorization
headers. The Commerce scripts mint a token from IMS when they run. ACCS REST
paths are `<COMMERCE_REST_BASE>/V1/...`; do not add the classic
`/rest/all/V1` prefix. Commerce calls use a browser-like `User-Agent`, which is
required by the environment's edge protection.

## Source files and generated artifacts

| File or directory | Role |
| --- | --- |
| `brother-products-new-import.csv` | Authoritative final 30-record import used by `import-new-catalog.mjs`. |
| `NEW_CATALOG_SCHEMA.md` | Attribute choices, configurable design, image convention, and readiness checks. |
| `add-new-catalog-attributes.mjs` | Creates the five final custom attributes and missing `color` options. |
| `import-new-catalog.mjs` | Creates categories, imports simple products before parents, links variants, sets stock, verifies products, and assigns the public shared catalog. |
| `assign-public-shared-catalog.mjs` | Repair/idempotent assignment of all 30 records to the public shared catalog. |
| `fix-configurable-stock.mjs` | Repair/idempotent stock policy for the three configurable parents. |
| `product-images/new-catalog/` | The 101 downloaded binaries, named for AEM SKU Mapper. |
| `brother-products-image-manifest.csv` | SKU, filename, gallery position, and primary-image marker. |
| `generate-image-manifest.mjs` | Regenerates the image manifest from filenames. |
| `aem-commerce-metadata.csv` | Exact DAM path and Commerce metadata for all 101 assets. |
| `generate-aem-commerce-metadata.mjs` | Generates child and configurable-parent SKU mappings, roles, and positions. |
| `apply-aem-commerce-metadata.mjs` | Writes Commerce metadata to assets through the AEM Assets API. |
| `approve-aem-assets.mjs` | Marks assets approved and targeted for delivery. |
| `verify-aem-commerce-metadata.mjs` | Reads metadata back from AEM and compares it with the generated plan. |
| `verify-aem-publication.mjs` | Confirms every asset has an AEM publish activation record. |

The older `catalog-data.mjs`/`setup-catalog.mjs` workflow and its derived CSV
remain in this directory as an earlier catalog experiment. The live 30-record
catalog described here is driven by `brother-products-new-import.csv`.

## 1. Prepare and validate the catalog

Product information was collected from the Brother UK store and normalized
into `brother-products-new-import.csv`. Each row includes the Commerce product
type, category, descriptions, price, weight, visibility, stock, custom
attributes, and—on configurable parents—the variation definition.

Important preparation rules:

- Import parents have blank prices; their selected children supply price.
- Child variants use `Not Visible Individually` so they do not duplicate the
  parent in listings.
- Every child contains its matching `color` option.
- Configurable relationships use `sku=<child>,color=<label>` entries separated
  by `|`.
- URL keys are lowercase and unique.
- All physical products have at least one image.

The configurable relationships are:

| Parent | Children | Axis |
| --- | --- | --- |
| `LC223-CONF` | `LC223BK`, `LC223C`, `LC223M`, `LC223Y` | Colour |
| `TN421-CONF` | `TN421BK`, `TN421C`, `TN421M`, `TN421Y` | Colour |
| `TZE12-CONF` | `TZE231`, `TZE131`, `TZE431`, `TZE531`, `TZE631`, `TZE731` | Colourway |

## 2. Create attributes and options

Run:

```bash
node tools/catalog-import/add-new-catalog-attributes.mjs
```

This provisions `print_speed`, `resolution`, `connectivity`, `page_yield`, and
`tape_width`, assigns them to the `Default` attribute set, and ensures the
Brother colour values exist on the standard `color` select attribute. Product
imports use Commerce option IDs rather than labels, so this step must complete
before product creation.

## 3. Import categories, products, and configurable links

Run:

```bash
node tools/catalog-import/import-new-catalog.mjs
```

The importer is ordered deliberately:

1. Read the `Default` attribute set and resolve `color` labels to option IDs.
2. Ensure all category paths exist below the default root category.
3. Import all simple products first, including child colour values, categories,
   website assignment, and stock.
4. Import the three configurable parents.
5. Create the configurable `color` option and attach each child SKU.
6. Read every product and parent-child link back for verification.
7. Assign all 30 records to the public shared catalog.

The script is designed to be rerunnable: product `PUT`s are upserts, existing
categories/options/links are reused, and already assigned shared-catalog SKUs
are skipped.

### Purchasability fixes captured in the importer

Two ACCS details were essential:

1. Configurable parents must not manage an independent quantity. Their stock
   record is `is_in_stock=true`, `manage_stock=false`, and
   `use_config_manage_stock=false`, allowing availability to derive from the
   selected child. The child source inventory remains the actual quantity.
2. B2B-enabled ACCS requires guest products in the public shared catalog. A
   product can appear in Catalog Service yet return `PERMISSION_DENIED` from
   `addProductsToCart` when this assignment is missing. The storefront surfaces
   that backend failure as the misleading message “This product is out of
   stock.”

For an environment imported before those protections were added, run:

```bash
node tools/catalog-import/fix-configurable-stock.mjs
node tools/catalog-import/assign-public-shared-catalog.mjs
```

## 4. Download and name images

Images live in `product-images/new-catalog/`. The naming convention is:

```text
SKU-01.png
SKU-02.png
SKU-03.png
```

`01` is the primary image. Further numbers preserve gallery order. Use the
physical child SKU for variant imagery. Do not create duplicate parent
binaries: configurable parents receive the same assets through multi-SKU AEM
metadata.

Regenerate the manifest after changing files:

```bash
node tools/catalog-import/generate-image-manifest.mjs
```

The generator rejects filenames that do not match the convention. The checked
in manifest records all 101 images and their primary/gallery positions.

## 5. Upload binaries to AEM Assets

The binaries were uploaded to:

```text
/content/dam/Customer/Alex D/brother
```

Upload can be performed with AEM Assets bulk upload or the AEM SKU Mapper UI.
Keep filenames unchanged: SKU extraction and the metadata plan depend on the
exact `SKU-NN.png` convention.

This repository automates metadata and verification after upload; it does not
contain or require a long-lived AEM credential.

## 6. Generate SKU-to-asset mapping

Run:

```bash
node tools/catalog-import/generate-aem-commerce-metadata.mjs
```

This produces `aem-commerce-metadata.csv` with four Commerce metadata fields:

| Metadata | Meaning |
| --- | --- |
| `commerce:isCommerce` | Marks the binary as a Commerce asset. |
| `commerce:skus` | One or more mapped SKUs. |
| `commerce:roles` | Gallery roles corresponding positionally to each SKU. |
| `commerce:positions` | Gallery order corresponding positionally to each SKU. |

For a simple non-variant product, the first image receives
`thumbnail;image;small_image;swatch_image`; later images receive `image`.

For a configurable child, the metadata arrays contain both child and parent
entries. For example, an LC223 child image maps to both `LC223BK` and
`LC223-CONF`. The child retains its own gallery position; the parent receives a
continuous combined-gallery position. The designated primary child supplies
the parent's `thumbnail`, `image`, and `small_image` roles.

The arrays must stay aligned: SKU at index 0 uses roles and position at index
0; SKU at index 1 uses roles and position at index 1.

## 7. Apply, approve, and publish AEM metadata

With a current author bearer token in `.env`, run:

```bash
node tools/catalog-import/apply-aem-commerce-metadata.mjs
node tools/catalog-import/verify-aem-commerce-metadata.mjs
node tools/catalog-import/approve-aem-assets.mjs
node tools/catalog-import/verify-aem-publication.mjs
```

The apply script updates assets concurrently through the AEM Assets API and
retries transient server failures. Approval writes `dam:status=approved` and
`dam:activationTarget=delivery`. Publication verification checks for an
`Activate` replication result on all 101 assets.

If the bearer token expires, mint a new AEM author token and replace only the
local `.env` value; never place it in this document or a command committed to
Git.

## 8. Verify Commerce and cart behavior

Verification should cover all layers, not only the REST product record:

- REST product exists, is enabled, has the expected type and category.
- Configurable parent returns the expected children.
- Each child has an in-stock source item and positive salable quantity.
- Parent stock derives from children.
- Every SKU belongs to the public shared catalog.
- Catalog Service resolves the parent and its option values.
- A fresh guest `addProductsToCart` mutation succeeds for one child of each
  parent.
- A browser selection updates the PDP and increases the basket count.

The verified configurable test cases were:

| Parent | Selected variant | Result |
| --- | --- | --- |
| `LC223-CONF` | `LC223BK` | Cart quantity 1; variant `IN_STOCK` |
| `TN421-CONF` | `TN421BK` | Cart quantity 1; variant `IN_STOCK` |
| `TZE12-CONF` | `TZE231` | Cart quantity 1; variant `IN_STOCK` |

## 9. Restrict the storefront to this catalog

The ACCS instance also contains legacy products. Following the shared-filter
pattern used in the Flawless storefront, `scripts/commerce.js` exports one
`STOREFRONT_PRODUCT_FILTER`. It uses the exact 30 imported SKUs rather than
category paths because new and legacy Brother products share categories.

The filter is applied to:

- Search/result pages in `blocks/product-list-page/product-list-page.js`.
- Category result pages in the same block.
- Header live search in `blocks/header/header.js`.

When the curated catalog changes, update `STOREFRONT_PRODUCT_SKUS` alongside
`brother-products-new-import.csv`. Configurable children remain in this list so
Commerce can resolve them, but their `Not Visible Individually` visibility
prevents them appearing as duplicate listing cards.

## Troubleshooting summary

| Symptom | Cause and resolution |
| --- | --- |
| ACCS REST returns 404 | Use `<base>/V1/...`, not `/rest/all/V1/...`. |
| Edge returns Cloudflare 1010 | Send a browser-like `User-Agent`. |
| Catalog Service returns no product for guests | Do not send a guest `Magento-Customer-Group` header when that group is denied by Catalog Permissions. Reapply it only for authenticated users. |
| PDP is blank and wishlist reads `topLevelSku` from null | Same Catalog Service customer-group filtering issue; fixed in `scripts/initializers/index.js`. |
| Configurable shows in stock but cart says out of stock | Inspect the underlying cart error. Set parent stock to derive from children and assign parent plus children to the public shared catalog. |
| Cart returns `PERMISSION_DENIED` | Product is absent from the public shared catalog, even if it is discoverable. Run `assign-public-shared-catalog.mjs`. |
| Parent has no images | Ensure child image metadata includes the parent SKU with aligned parent roles and positions. |
| AEM metadata looks right but storefront has no image | Confirm asset approval and publication, then verify all four `commerce:*` metadata arrays. |
