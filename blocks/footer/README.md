# Footer Block

## Overview

Renders the authored site footer and groups its heading/list nodes into responsive columns. All labels, links, social entries, and legal text come from the footer document; the block does not embed footer content.

## Integration

The block loads the configured footer document and decorates its authored sections. No URL parameters, localStorage keys, or custom events are used.

## Behavior Patterns

- The first authored section is grouped into one column per heading and its following content.
- The second section remains the legal-links and copyright area.
- CSS switches from five desktop columns to a single stacked column on small screens.

## Error Handling

If the footer document is unavailable, the existing footer loading fallback behavior is preserved. Unrecognized authored nodes remain in their source order rather than being discarded.
