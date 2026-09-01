/**
 * Brother demo catalog definition — attributes, attribute sets and products.
 *
 * Consumed by setup-catalog.mjs, which creates everything in dependency order
 * (attributes → options → sets → category tree → products) via the Adobe
 * Commerce REST API. Data is representative (see brother-products-sources.csv
 * for provenance); prices are ex-VAT GBP.
 */

// ---- Custom attributes -----------------------------------------------------
// type: text | textarea | select | multiselect | boolean | decimal | integer
// filterable: true => "Filterable (with results)" for Live Search facets.
export const attributes = [
  // Shared (added to every set)
  { code: 'brand', label: 'Brand', type: 'select', options: ['Brother'], filterable: true, searchable: true, comparable: true },
  { code: 'connectivity', label: 'Connectivity', type: 'multiselect', options: ['USB', 'Wi-Fi', 'Wi-Fi Direct', 'Ethernet', 'Bluetooth', 'NFC'], filterable: true, comparable: true },
  { code: 'ean', label: 'EAN / Barcode', type: 'text', searchable: true },
  { code: 'warranty', label: 'Warranty', type: 'select', options: ['1 Year', '2 Years', '3 Years'], comparable: true },

  // Printer
  { code: 'print_technology', label: 'Print Technology', type: 'select', options: ['Inkjet', 'Mono Laser', 'Colour Laser'], filterable: true, comparable: true },
  { code: 'functions', label: 'Functions', type: 'multiselect', options: ['Print', 'Copy', 'Scan', 'Fax'], filterable: true },
  { code: 'output_type', label: 'Output', type: 'select', options: ['Colour', 'Mono'], filterable: true, comparable: true },
  { code: 'max_paper_size', label: 'Max Paper Size', type: 'select', options: ['A4', 'A3'], filterable: true, comparable: true },
  { code: 'print_speed_ppm', label: 'Print Speed (ppm)', type: 'decimal', comparable: true },
  { code: 'duplex_printing', label: 'Automatic 2-sided', type: 'boolean', filterable: true },
  { code: 'ecopro_eligible', label: 'EcoPro Eligible', type: 'boolean', filterable: true },

  // Ink & Toner
  { code: 'consumable_type', label: 'Consumable Type', type: 'select', options: ['Ink Cartridge', 'Toner Cartridge', 'Drum Unit'], filterable: true, comparable: true },
  { code: 'cartridge_colour', label: 'Colour', type: 'select', options: ['Black', 'Cyan', 'Magenta', 'Yellow', 'Multipack'], filterable: true, comparable: true },
  { code: 'page_yield', label: 'Page Yield', type: 'integer', comparable: true },
  { code: 'yield_class', label: 'Yield', type: 'select', options: ['Standard', 'High (XL)', 'Super High'], filterable: true },
  { code: 'pack_size', label: 'Pack Size', type: 'select', options: ['Single', 'Twin Pack', 'Multipack (4)'], filterable: true },
  { code: 'compatible_models', label: 'Compatible With', type: 'text', searchable: true },

  // Label Printer
  { code: 'max_tape_width_mm', label: 'Max Tape Width (mm)', type: 'select', options: ['12', '18', '24', '36'], filterable: true },
  { code: 'portability', label: 'Form Factor', type: 'select', options: ['Handheld', 'Desktop'], filterable: true },
  { code: 'keyboard_layout', label: 'Keyboard', type: 'select', options: ['QWERTY', 'None (app/PC)'] },
  { code: 'has_display', label: 'Built-in Display', type: 'boolean' },

  // Labelling Tape
  { code: 'tape_width_mm', label: 'Tape Width (mm)', type: 'select', options: ['6', '9', '12', '18', '24', '36'], filterable: true },
  { code: 'tape_length_m', label: 'Tape Length (m)', type: 'decimal' },
  { code: 'text_colour', label: 'Text Colour', type: 'select', options: ['Black', 'White', 'Blue', 'Red', 'Gold'], filterable: true },
  { code: 'tape_colour', label: 'Tape Colour', type: 'select', options: ['White', 'Clear', 'Yellow', 'Black', 'Red'], filterable: true },
  { code: 'laminated', label: 'Laminated', type: 'boolean', filterable: true },

  // Scanner
  { code: 'scanner_type', label: 'Scanner Type', type: 'select', options: ['Portable', 'Desktop', 'Network'], filterable: true, comparable: true },
  { code: 'adf_capacity', label: 'ADF Capacity (sheets)', type: 'integer', comparable: true },
  { code: 'scan_speed_ppm', label: 'Scan Speed (ppm)', type: 'decimal', comparable: true },
  { code: 'duplex_scan', label: 'Duplex Scanning', type: 'boolean', filterable: true },
];

const SHARED = ['brand', 'connectivity', 'ean', 'warranty'];

// ---- Attribute sets --------------------------------------------------------
export const attributeSets = [
  { name: 'Printer', group: 'Product Specs', attributeCodes: [...SHARED, 'print_technology', 'functions', 'output_type', 'max_paper_size', 'print_speed_ppm', 'duplex_printing', 'ecopro_eligible'] },
  { name: 'Ink & Toner', group: 'Product Specs', attributeCodes: [...SHARED, 'consumable_type', 'cartridge_colour', 'page_yield', 'yield_class', 'pack_size', 'compatible_models'] },
  { name: 'Label Printer', group: 'Product Specs', attributeCodes: [...SHARED, 'max_tape_width_mm', 'portability', 'keyboard_layout', 'has_display'] },
  { name: 'Labelling Tape', group: 'Product Specs', attributeCodes: [...SHARED, 'tape_width_mm', 'tape_length_m', 'text_colour', 'tape_colour', 'laminated', 'compatible_models'] },
  { name: 'Scanner', group: 'Product Specs', attributeCodes: [...SHARED, 'scanner_type', 'adf_capacity', 'scan_speed_ppm', 'duplex_scan'] },
];

// ---- Products --------------------------------------------------------------
// custom values use attribute LABELS (select/multiselect) or raw values; the
// orchestrator resolves labels to option IDs at product-create time.
const P = (sku, name, set, categoryPath, price, weight, shortDescription, description, custom) =>
  ({ sku, name, set, categoryPath, price, weight, shortDescription, description, custom, brand: 'Brother' });

export const products = [
  // Inkjet printers
  P('DCP-J1140DW', 'Brother DCP-J1140DW Wireless A4 3-in-1 Inkjet Printer', 'Printer', 'Default Category/Printers/Inkjet Printers', 139.00, 6.5,
    'Wireless A4 3-in-1 inkjet: print, copy and scan for the home.',
    'The DCP-J1140DW is a compact wireless A4 3-in-1 colour inkjet printer for home use, offering print, copy and scan with mobile and Wi-Fi connectivity.',
    { print_technology: 'Inkjet', output_type: 'Colour', functions: ['Print', 'Copy', 'Scan'], max_paper_size: 'A4', print_speed_ppm: 17, duplex_printing: false, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct'], warranty: '1 Year' }),
  P('MFC-J1010DW', 'Brother MFC-J1010DW Wireless A4 4-in-1 Inkjet Printer', 'Printer', 'Default Category/Printers/Inkjet Printers', 119.00, 6.3,
    'Wireless A4 4-in-1 personal inkjet with fax.',
    'The MFC-J1010DW is a wireless A4 4-in-1 personal colour inkjet printer with print, copy, scan and fax, ideal for small home offices.',
    { print_technology: 'Inkjet', output_type: 'Colour', functions: ['Print', 'Copy', 'Scan', 'Fax'], max_paper_size: 'A4', print_speed_ppm: 17, duplex_printing: false, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct'], warranty: '1 Year' }),
  P('DCP-J1200WE', 'Brother DCP-J1200WE Wireless A4 3-in-1 Inkjet Printer (EcoPro)', 'Printer', 'Default Category/Printers/Inkjet Printers', 99.00, 6.4,
    'A4 3-in-1 inkjet with 4-month free EcoPro ink subscription.',
    'The DCP-J1200WE is a 3-in-1 A4 colour inkjet printer that includes a free 4-month EcoPro ink subscription for low-cost, worry-free printing.',
    { print_technology: 'Inkjet', output_type: 'Colour', functions: ['Print', 'Copy', 'Scan'], max_paper_size: 'A4', print_speed_ppm: 16, duplex_printing: false, ecopro_eligible: true, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct'], warranty: '1 Year' }),
  P('MFC-J4340DWE', 'Brother MFC-J4340DWE Wireless A4 4-in-1 Inkjet Printer (EcoPro)', 'Printer', 'Default Category/Printers/Inkjet Printers', 149.00, 8.9,
    'A4 4-in-1 business inkjet with EcoPro subscription option.',
    'The MFC-J4340DWE is a wireless A4 4-in-1 colour inkjet printer for small offices, with fast print speeds and an included EcoPro trial subscription.',
    { print_technology: 'Inkjet', output_type: 'Colour', functions: ['Print', 'Copy', 'Scan', 'Fax'], max_paper_size: 'A4', print_speed_ppm: 20, duplex_printing: true, ecopro_eligible: true, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct', 'Ethernet'], warranty: '1 Year' }),
  P('MFC-J5340DWE', 'Brother MFC-J5340DWE Wireless A3 4-in-1 Inkjet Printer', 'Printer', 'Default Category/Printers/Inkjet Printers', 179.00, 10.9,
    'A3-capable 4-in-1 business inkjet for the small office.',
    'The MFC-J5340DWE is an all-in-one A3 colour inkjet printer perfect for a small office, with A3 print/copy/scan, wireless connectivity and an EcoPro trial.',
    { print_technology: 'Inkjet', output_type: 'Colour', functions: ['Print', 'Copy', 'Scan', 'Fax'], max_paper_size: 'A3', print_speed_ppm: 22, duplex_printing: true, ecopro_eligible: true, connectivity: ['USB', 'Wi-Fi', 'Ethernet'], warranty: '1 Year' }),

  // Laser printers
  P('HL-L1240W', 'Brother HL-L1240W Compact Mono Laser Printer', 'Printer', 'Default Category/Printers/Laser Printers', 99.00, 4.5,
    'Super-compact wireless mono laser printer.',
    'The HL-L1240W is a super-compact mono laser printer offering flexible wireless and USB connectivity for simple set-up and reliable home printing.',
    { print_technology: 'Mono Laser', output_type: 'Mono', functions: ['Print'], max_paper_size: 'A4', print_speed_ppm: 20, duplex_printing: false, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi'], warranty: '1 Year' }),
  P('HL-L1242W', 'Brother HL-L1242W Compact Mono Laser Printer', 'Printer', 'Default Category/Printers/Laser Printers', 109.00, 4.5,
    'Super-compact wireless mono laser printer.',
    'The HL-L1242W is a super-compact mono laser printer with flexible connectivity, designed for easy set-up and everyday home or small-office use.',
    { print_technology: 'Mono Laser', output_type: 'Mono', functions: ['Print'], max_paper_size: 'A4', print_speed_ppm: 21, duplex_printing: false, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi'], warranty: '1 Year' }),
  P('HL-L2400DW', 'Brother HL-L2400DW Wireless Mono Laser Printer', 'Printer', 'Default Category/Printers/Laser Printers', 129.00, 7.0,
    'Efficient A4 wireless mono laser printer.',
    'The HL-L2400DW is an efficient A4 mono laser printer with automatic 2-sided printing and wireless connectivity for busy homes and small offices.',
    { print_technology: 'Mono Laser', output_type: 'Mono', functions: ['Print'], max_paper_size: 'A4', print_speed_ppm: 30, duplex_printing: true, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct'], warranty: '1 Year' }),
  P('HL-L2400DWE', 'Brother HL-L2400DWE Wireless Mono Laser Printer (EcoPro)', 'Printer', 'Default Category/Printers/Laser Printers', 129.00, 7.0,
    'A4 mono laser with 4-month free EcoPro toner subscription.',
    'The HL-L2400DWE is an efficient A4 mono laser printer that includes a 4-month free EcoPro toner subscription, plus duplex and wireless printing.',
    { print_technology: 'Mono Laser', output_type: 'Mono', functions: ['Print'], max_paper_size: 'A4', print_speed_ppm: 30, duplex_printing: true, ecopro_eligible: true, connectivity: ['USB', 'Wi-Fi', 'Wi-Fi Direct'], warranty: '1 Year' }),
  P('HL-L2375DW', 'Brother HL-L2375DW Wireless Mono Laser Printer', 'Printer', 'Default Category/Printers/Laser Printers', 139.00, 7.2,
    'Reliable A4 mono laser for busy home and small offices.',
    'The HL-L2375DW is built for reliability in busy home and small offices, with fast mono laser printing, duplex and network/wireless connectivity.',
    { print_technology: 'Mono Laser', output_type: 'Mono', functions: ['Print'], max_paper_size: 'A4', print_speed_ppm: 34, duplex_printing: true, ecopro_eligible: false, connectivity: ['USB', 'Wi-Fi', 'Ethernet'], warranty: '1 Year' }),

  // Ink cartridges
  P('LC424BK', 'Brother LC424BK Ink Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Ink Cartridges', 13.99, 0.05,
    'Genuine black ink cartridge, up to 750 pages.',
    'Genuine Brother LC424BK black ink cartridge, printing up to 750 pages. Compatible with select Brother A4 inkjet printers.',
    { consumable_type: 'Ink Cartridge', cartridge_colour: 'Black', page_yield: 750, yield_class: 'Standard', pack_size: 'Single', compatible_models: 'DCP-J1140DW', warranty: '1 Year' }),
  P('LC424VAL', 'Brother LC424VAL Ink Cartridge Multipack (BK/C/M/Y)', 'Ink & Toner', 'Default Category/Ink & Supplies/Ink Cartridges', 44.99, 0.18,
    'Genuine 4-colour ink multipack, up to 750 pages each.',
    'Genuine Brother LC424VAL ink multipack containing black, cyan, magenta and yellow cartridges, each printing up to 750 pages.',
    { consumable_type: 'Ink Cartridge', cartridge_colour: 'Multipack', page_yield: 750, yield_class: 'Standard', pack_size: 'Multipack (4)', compatible_models: 'DCP-J1140DW', warranty: '1 Year' }),
  P('LC427BK', 'Brother LC427BK Ink Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Ink Cartridges', 24.99, 0.06,
    'Genuine black ink cartridge, up to 3,000 pages.',
    'Genuine Brother LC427BK black ink cartridge with a high 3,000-page yield for lower cost-per-page printing.',
    { consumable_type: 'Ink Cartridge', cartridge_colour: 'Black', page_yield: 3000, yield_class: 'High (XL)', pack_size: 'Single', compatible_models: 'MFC-J4340DWE, MFC-J5340DWE', warranty: '1 Year' }),
  P('LC426VAL', 'Brother LC426VAL Ink Cartridge Multipack (BK/C/M/Y)', 'Ink & Toner', 'Default Category/Ink & Supplies/Ink Cartridges', 49.99, 0.19,
    'Genuine 4-colour ink multipack.',
    'Genuine Brother LC426VAL ink multipack with black, cyan, magenta and yellow cartridges for vivid, reliable everyday printing.',
    { consumable_type: 'Ink Cartridge', cartridge_colour: 'Multipack', page_yield: 1500, yield_class: 'Standard', pack_size: 'Multipack (4)', compatible_models: 'MFC-J4340DWE', warranty: '1 Year' }),
  P('LC3239XLBK', 'Brother LC3239XLBK High-Yield Ink Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Ink Cartridges', 34.99, 0.09,
    'Genuine high-yield black ink, up to 6,000 pages.',
    'Genuine Brother LC3239XLBK high-yield black ink cartridge printing up to 6,000 pages, ideal for high-volume business inkjet printers.',
    { consumable_type: 'Ink Cartridge', cartridge_colour: 'Black', page_yield: 6000, yield_class: 'Super High', pack_size: 'Single', compatible_models: 'MFC-J5340DWE', warranty: '1 Year' }),

  // Toner
  P('TN-2420', 'Brother TN-2420 Toner Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Toner', 59.99, 0.7,
    'Genuine high-yield black toner, up to 3,000 pages.',
    'Genuine Brother TN-2420 high-yield black toner cartridge printing up to 3,000 pages for crisp, reliable mono laser output.',
    { consumable_type: 'Toner Cartridge', cartridge_colour: 'Black', page_yield: 3000, yield_class: 'High (XL)', pack_size: 'Single', compatible_models: 'HL-L2375DW, HL-L2400DW', warranty: '1 Year' }),
  P('TN2420TWIN', 'Brother TN-2420 Toner Cartridge Twin Pack - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Toner', 104.99, 1.4,
    'Two genuine high-yield black toners, 3,000 pages each.',
    'Genuine Brother TN-2420 twin-pack: two high-yield black toner cartridges, each printing up to 3,000 pages, for great value.',
    { consumable_type: 'Toner Cartridge', cartridge_colour: 'Black', page_yield: 3000, yield_class: 'High (XL)', pack_size: 'Twin Pack', compatible_models: 'HL-L2375DW, HL-L2400DW', warranty: '1 Year' }),
  P('TN-248BK', 'Brother TN-248BK Toner Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Toner', 44.99, 0.55,
    'Genuine black toner for colour laser printers.',
    'Genuine Brother TN-248BK black toner cartridge for Brother colour laser printers, delivering sharp text and consistent results.',
    { consumable_type: 'Toner Cartridge', cartridge_colour: 'Black', page_yield: 1500, yield_class: 'Standard', pack_size: 'Single', compatible_models: 'HL-L3220CW, MFC-L3760CDW', warranty: '1 Year' }),
  P('TN-248VAL', 'Brother TN-248VAL Toner Multipack (BK/C/M/Y)', 'Ink & Toner', 'Default Category/Ink & Supplies/Toner', 129.99, 2.2,
    'Genuine 4-colour toner multipack.',
    'Genuine Brother TN-248VAL toner multipack containing black, cyan, magenta and yellow cartridges for full-colour laser printing.',
    { consumable_type: 'Toner Cartridge', cartridge_colour: 'Multipack', page_yield: 1000, yield_class: 'Standard', pack_size: 'Multipack (4)', compatible_models: 'HL-L3220CW, MFC-L3760CDW', warranty: '1 Year' }),
  P('TN-248XLBK', 'Brother TN-248XLBK High-Yield Toner Cartridge - Black', 'Ink & Toner', 'Default Category/Ink & Supplies/Toner', 64.99, 0.6,
    'Genuine high-yield black toner for colour lasers.',
    'Genuine Brother TN-248XLBK high-yield black toner cartridge, delivering more pages and lower cost-per-print for busy offices.',
    { consumable_type: 'Toner Cartridge', cartridge_colour: 'Black', page_yield: 3000, yield_class: 'High (XL)', pack_size: 'Single', compatible_models: 'HL-L3220CW, MFC-L3760CDW', warranty: '1 Year' }),

  // Label printers
  P('PT-H110', 'Brother PT-H110 Compact Handheld Label Printer', 'Label Printer', 'Default Category/Labelling/Label Printers', 49.99, 0.4,
    'Compact handheld P-touch label maker.',
    'The Brother PT-H110 is a compact handheld P-touch label printer with a QWERTY keyboard, ideal for quick home and office labelling on TZe tapes.',
    { max_tape_width_mm: '12', portability: 'Handheld', keyboard_layout: 'QWERTY', has_display: true, connectivity: [], warranty: '1 Year' }),
  P('PT-D460BTVP', 'Brother PT-D460BTVP Label Printer Value Pack', 'Label Printer', 'Default Category/Labelling/Label Printers', 85.79, 0.9,
    'Bluetooth desktop label printer with value pack.',
    'The Brother PT-D460BTVP is a versatile P-touch label printer with Bluetooth and PC connectivity, supplied as a value pack with tape and adapter.',
    { max_tape_width_mm: '18', portability: 'Desktop', keyboard_layout: 'QWERTY', has_display: true, connectivity: ['USB', 'Bluetooth'], warranty: '1 Year' }),
  P('PT-D610BTVP', 'Brother PT-D610BTVP Label Printer Value Pack', 'Label Printer', 'Default Category/Labelling/Label Printers', 114.38, 1.1,
    'Advanced Bluetooth desktop label printer, value pack.',
    'The Brother PT-D610BTVP is an advanced P-touch desktop label printer with Bluetooth, wide-tape support and a large display, supplied as a value pack.',
    { max_tape_width_mm: '24', portability: 'Desktop', keyboard_layout: 'QWERTY', has_display: true, connectivity: ['USB', 'Bluetooth'], warranty: '1 Year' }),
  P('PT-2730VP', 'Brother PT-2730VP Professional Label Printer', 'Label Printer', 'Default Category/Labelling/Label Printers', 99.00, 1.0,
    'Professional PC-connectable label printer, value pack.',
    'The Brother PT-2730VP is a professional label printer supporting tapes up to 24mm with PC connectivity, supplied in a carry-case value pack.',
    { max_tape_width_mm: '24', portability: 'Desktop', keyboard_layout: 'QWERTY', has_display: true, connectivity: ['USB'], warranty: '1 Year' }),

  // TZe tapes
  P('TZe-231', 'Brother TZe-231 Labelling Tape 12mm Black on White', 'Labelling Tape', 'Default Category/Ink & Supplies/TZe Tapes', 12.99, 0.05,
    '12mm black-on-white laminated P-touch tape, 8m.',
    'Genuine Brother TZe-231 laminated labelling tape, 12mm wide, black on white, 8m long — durable and water-resistant for indoor and outdoor use.',
    { tape_width_mm: '12', tape_length_m: 8, text_colour: 'Black', tape_colour: 'White', laminated: true, compatible_models: 'P-touch (TZe)' }),
  P('TZe-131', 'Brother TZe-131 Labelling Tape 12mm Black on Clear', 'Labelling Tape', 'Default Category/Ink & Supplies/TZe Tapes', 13.99, 0.05,
    '12mm black-on-clear laminated P-touch tape, 8m.',
    'Genuine Brother TZe-131 laminated labelling tape, 12mm wide, black on clear, 8m long — for discreet labels that blend into any surface.',
    { tape_width_mm: '12', tape_length_m: 8, text_colour: 'Black', tape_colour: 'Clear', laminated: true, compatible_models: 'P-touch (TZe)' }),
  P('TZe-631', 'Brother TZe-631 Labelling Tape 12mm Black on Yellow', 'Labelling Tape', 'Default Category/Ink & Supplies/TZe Tapes', 13.99, 0.05,
    '12mm black-on-yellow laminated P-touch tape, 8m.',
    'Genuine Brother TZe-631 laminated labelling tape, 12mm wide, black on yellow, 8m long — high-visibility labels for safety and organisation.',
    { tape_width_mm: '12', tape_length_m: 8, text_colour: 'Black', tape_colour: 'Yellow', laminated: true, compatible_models: 'P-touch (TZe)' }),

  // Scanners
  P('ADS-1300', 'Brother ADS-1300 Compact Portable Document Scanner', 'Scanner', 'Default Category/Scanners', 149.00, 1.3,
    'Compact, portable desktop document scanner.',
    'The Brother ADS-1300 is a compact, portable document scanner with a 20-sheet ADF, fast duplex scanning and USB power for scanning on the go.',
    { scanner_type: 'Portable', adf_capacity: 20, scan_speed_ppm: 30, duplex_scan: true, connectivity: ['USB'], warranty: '1 Year' }),
  P('ADS-1700W', 'Brother ADS-1700W Compact Wireless Document Scanner', 'Scanner', 'Default Category/Scanners', 249.00, 1.7,
    'Compact wireless scanner with touchscreen.',
    'The Brother ADS-1700W is a compact document scanner with wireless connectivity and a colour touchscreen, ideal for homes and small businesses.',
    { scanner_type: 'Desktop', adf_capacity: 20, scan_speed_ppm: 25, duplex_scan: true, connectivity: ['USB', 'Wi-Fi', 'Ethernet'], warranty: '1 Year' }),
  P('ADS-4300N', 'Brother ADS-4300N Network Desktop Document Scanner', 'Scanner', 'Default Category/Scanners', 399.00, 3.2,
    'Fast network desktop scanner, 80-sheet ADF.',
    'The Brother ADS-4300N is a network desktop document scanner with an 80-sheet ADF, scanning up to 40 pages per minute for busy workgroups.',
    { scanner_type: 'Network', adf_capacity: 80, scan_speed_ppm: 40, duplex_scan: true, connectivity: ['USB', 'Ethernet'], warranty: '1 Year' }),
];

// ---- Provenance ------------------------------------------------------------
// Where each record came from. `priceSource`: 'verified' = price seen in a
// Brother UK search result; 'representative' = RRP estimate (the live store
// blocks automated fetches, so exact prices need confirming from sourceUrl).
// Specs/descriptions are representative. Keyed by SKU.
export const provenance = {
  'DCP-J1140DW': { priceSource: 'verified', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/inkjet/dcpj/dcpj1140dw' },
  'MFC-J1010DW': { priceSource: 'verified', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/inkjet/mfcj/mfcj1010dw' },
  'DCP-J1200WE': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/inkjet/dcpj/dcpj1200we' },
  'MFC-J4340DWE': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/inkjet/mfcj/mfcj4340dwe' },
  'MFC-J5340DWE': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/inkjet/mfcj/mfcj5340dwe' },
  'HL-L1240W': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/laser/hl/hll1240w' },
  'HL-L1242W': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/laser/hl/hll1242w' },
  'HL-L2400DW': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/laser/hl/hll2400dw' },
  'HL-L2400DWE': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/laser/hl/hll2400dwe' },
  'HL-L2375DW': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/laser/hl/hll2375dw' },
  LC424BK: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/inkjet/ink-cartridges-single-pack/lc/lc424bk' },
  LC424VAL: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/inkjet/ink-cartridges-multi-pack/lc/lc424val' },
  LC427BK: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/inkjet/ink-cartridges-single-pack/lc/lc427bk' },
  LC426VAL: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/inkjet/ink-cartridges-multi-pack/lc/lc426val' },
  LC3239XLBK: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/inkjet/ink-cartridges-single-pack/lc/lc3239xlbk' },
  'TN-2420': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/laser/toner/tn/tn2420' },
  TN2420TWIN: { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/laser/toner/tn/tn2420twin' },
  'TN-248BK': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/laser/toner/tn/tn248bk' },
  'TN-248VAL': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/supplies/laser/toner/tn/tn248val' },
  'TN-248XLBK': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/laser/toner/tn/tn248xlbk' },
  'PT-H110': { priceSource: 'verified', sourceUrl: 'https://store.brother.co.uk/devices/label-printer/p-touch/pt/pth110' },
  'PT-D460BTVP': { priceSource: 'verified', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/label-printer/p-touch/pt/ptd460btvp' },
  'PT-D610BTVP': { priceSource: 'verified', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/label-printer/p-touch/pt/ptd610btvp' },
  'PT-2730VP': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/catalogs/brotheruk/devices/label-printer/p-touch/pt/pt2730vp' },
  'TZe-231': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/p-touch/tapes/tze/tze231' },
  'TZe-131': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/p-touch/tapes/tze/tze131' },
  'TZe-631': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/supplies/p-touch/tapes/tze/tze631' },
  'ADS-1300': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/scanners/ads/ads1300' },
  'ADS-1700W': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/scanners/ads/ads1700w' },
  'ADS-4300N': { priceSource: 'representative', sourceUrl: 'https://store.brother.co.uk/devices/scanners/ads/ads4300n' },
};
