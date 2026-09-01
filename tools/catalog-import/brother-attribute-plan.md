# Brother ACCS — Product Attributes & Attribute Sets Plan

Scope: the 30-product import (Printers, Ink & Toner, Label Printers, Labelling
Tapes, Scanners). Goal: model the catalog so PDPs show real specs and PLPs can
facet in Live Search / Catalog Service.

System attributes already exist by default (sku, name, price, description,
short_description, weight, image, url_key, visibility, status, qty…) — do **not**
recreate these. Everything below is *custom* unless noted.

---

## 1. Attribute sets (5) + product→set mapping

| Attribute set | Products | Count |
|---|---|---|
| **Printer** | inkjet + laser printers/AIOs | 10 |
| **Ink & Toner** | ink cartridges, toner | 10 |
| **Label Printer** | P-touch devices | 4 |
| **Labelling Tape** | TZe tapes | 3 |
| **Scanner** | ADS scanners | 3 |

Each is cloned from **Default** (so it keeps the standard system attributes) then
has the group(s) below added.

---

## 2. Shared attributes (add to every set)

| Code | Label | Type | Options | Filterable | In search | Compare |
|---|---|---|---|---|---|---|
| `brand` | Brand | select | Brother | Yes (filterable) | Yes | Yes |
| `connectivity` | Connectivity | multiselect | USB, Wi-Fi, Wi-Fi Direct, Ethernet, Bluetooth, NFC | Yes | No | Yes |
| `ean` | EAN / Barcode | text | — | No | Yes | No |
| `warranty` | Warranty | select | 1 Year, 2 Years, 3 Years | No | No | Yes |

`connectivity` is reused by Printer / Label Printer / Scanner sets.

---

## 3. Set-specific attributes

### Printer
| Code | Label | Type | Options | Filterable |
|---|---|---|---|---|
| `print_technology` | Print Technology | select | Inkjet, Mono Laser, Colour Laser | Yes |
| `functions` | Functions | multiselect | Print, Copy, Scan, Fax | Yes |
| `output_type` | Output | select | Colour, Mono | Yes |
| `max_paper_size` | Max Paper Size | select | A4, A3 | Yes |
| `print_speed_ppm` | Print Speed (ppm) | decimal | — | No |
| `duplex_printing` | Automatic 2-sided | boolean | — | Yes |
| `ecopro_eligible` | EcoPro Eligible | boolean | — | Yes |

### Ink & Toner
| Code | Label | Type | Options | Filterable |
|---|---|---|---|---|
| `consumable_type` | Consumable Type | select | Ink Cartridge, Toner Cartridge, Drum Unit | Yes |
| `cartridge_colour` | Colour | select | Black, Cyan, Magenta, Yellow, Multipack | Yes |
| `page_yield` | Page Yield | integer | — | No |
| `yield_class` | Yield | select | Standard, High (XL), Super High | Yes |
| `pack_size` | Pack Size | select | Single, Twin Pack, Multipack (4) | Yes |
| `compatible_models` | Compatible Printers | text | — | (searchable) |

### Label Printer
| Code | Label | Type | Options | Filterable |
|---|---|---|---|---|
| `max_tape_width_mm` | Max Tape Width (mm) | select | 12, 18, 24, 36 | Yes |
| `portability` | Form Factor | select | Handheld, Desktop | Yes |
| `keyboard_layout` | Keyboard | select | QWERTY, None (app/PC) | No |
| `has_display` | Built-in Display | boolean | — | No |

### Labelling Tape
| Code | Label | Type | Options | Filterable |
|---|---|---|---|---|
| `tape_width_mm` | Tape Width (mm) | select | 6, 9, 12, 18, 24, 36 | Yes |
| `tape_length_m` | Tape Length (m) | decimal | — | No |
| `text_colour` | Text Colour | select | Black, White, Blue, Red, Gold | Yes |
| `tape_colour` | Tape Colour | select | White, Clear, Yellow, Black, … | Yes |
| `laminated` | Laminated | boolean | — | Yes |
| `compatible_models` | Compatible Devices | text | — | (searchable) |

### Scanner
| Code | Label | Type | Options | Filterable |
|---|---|---|---|---|
| `scanner_type` | Scanner Type | select | Portable, Desktop, Network | Yes |
| `adf_capacity` | ADF Capacity (sheets) | integer | — | No |
| `scan_speed_ppm` | Scan Speed (ppm) | decimal | — | No |
| `duplex_scan` | Duplex Scanning | boolean | — | Yes |

---

## 4. Defaults for every custom attribute
- Scope: **Global** (single store view for now).
- Required: **No** (keeps import tolerant of gaps).
- `select`/`multiselect` need their option values created up front.
- Filterable = "Filterable (with results)" for Live Search facets; storefront
  properties (searchable/comparable) as flagged above.

## 5. How this ties to the import
- The current `brother-products-accs-import.csv` uses `attribute_set_code=Default`
  for all rows → change per product to one of the 5 sets above.
- Custom values ride in an **`additional_attributes`** column, e.g.
  `print_technology=Inkjet,output_type=Colour,functions=Print|Copy|Scan,duplex_printing=1`
  (comma-separated pairs; `|` separates multiselect values).
- Selects/booleans require their options to exist **before** import.

## 6. Creating them (options)
1. **Admin UI** — Stores ▸ Attributes ▸ Product / Attribute Set (manual, fine for 30).
2. **REST API** — `POST /V1/products/attributes` then
   `POST /V1/products/attribute-sets` + `.../attributes` (scriptable, repeatable).
3. **Data patch** (`Setup/Patch/Data`) in a module — best for version control.
