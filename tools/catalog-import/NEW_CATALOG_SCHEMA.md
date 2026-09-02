# Brother 30-product catalogue schema

The source file is `brother_products_import.csv`. Adobe Commerce currently has the standard `color` select attribute, but its existing choices do not cover this catalogue. The five Brother-specific attributes below do not currently exist.

| Attribute code | Type | Catalogue use |
| --- | --- | --- |
| `print_speed` | Text | Human-readable printer speed, including ppm, ipm and mm/second units |
| `resolution` | Text | Human-readable print resolution |
| `connectivity` | Text | Combined connectivity description; intentionally not a multiselect because source values contain qualified phrases |
| `page_yield` | Text | Human-readable yield including units; avoids losing formatting such as `130,000 pages` |
| `tape_width` | Text | One or multiple supported widths |

All five should be global, visible on the storefront product page, searchable where useful, and assigned to the `Default` attribute set for this import. This avoids coupling the Brother catalogue to the unrelated existing Accessory/E-Liquid/Vape attribute sets.

Add these options to the existing global `color` select attribute:

- Black
- Cyan
- Magenta
- Yellow
- Black on White
- Black on Clear
- Black on Red
- Black on Blue
- Black on Yellow
- Black on Green

`color` is the configurable axis for `LC223-CONF`, `TN421-CONF`, and `TZE12-CONF`. Their child SKUs must carry the matching option ID before the configurable links are created.

Image convention for AEM SKU Mapper: `SKU-01.png`, `SKU-02.png`, and so on. Configurable parents do not need duplicate binaries; their gallery can be assembled from child SKU assets.

## Import readiness

- 30 catalogue records: 27 simple children/products and 3 configurable parents.
- 101 official Brother gallery images covering every physical SKU.
- 8 category paths.
- No duplicate SKUs, missing physical-product images, broken image sequences, or undersized images.
- Blank configurable-parent prices are intentional; pricing is supplied by the selected child.
- Create the five attributes and missing `color` options before importing products.
- Import simple products before configurable parents, then establish the parent-child links.
