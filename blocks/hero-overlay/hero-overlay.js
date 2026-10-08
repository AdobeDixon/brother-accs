/**
 * Hero Overlay: a full-bleed banner with heading, body copy and a CTA
 * overlaid on top of a photographic background.
 *
 * Authors place the background image in its own first row (as the Universal
 * Editor model does). That row is kept in place, so its editor
 * instrumentation survives, and is styled as the background layer.
 *
 * The importer emits the banner background as a standalone picture in the
 * default-content block that precedes this block (the source delivered it via
 * empty background divs). If the block has no image of its own, pull that
 * picture in so it can be used as the background layer. Everything here is
 * null-safe: if no image is found the block simply renders as a plain dark
 * banner.
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Prefer an image already authored inside the block.
  let picture = block.querySelector('picture');

  if (picture) {
    const imageRow = picture.closest('.hero-overlay > div');
    if (imageRow && !imageRow.textContent.trim()) imageRow.classList.add('hero-overlay-bg');
  } else {
    // Otherwise adopt the image the importer left in the preceding default
    // content wrapper (a bare <p><picture> sitting just before the block).
    const wrapper = block.closest('.hero-overlay-wrapper') || block.parentElement;
    const prev = wrapper && wrapper.previousElementSibling;
    picture = prev ? prev.querySelector('picture') : null;

    if (picture) {
      const orphan = picture.closest('p');
      const bg = document.createElement('div');
      bg.className = 'hero-overlay-bg';
      bg.append(picture);
      block.prepend(bg);
      // Clean up the now-empty source container so it adds no stray spacing.
      if (orphan && !orphan.textContent.trim() && !orphan.querySelector('picture, img')) {
        orphan.remove();
      }
      if (prev && !prev.querySelector('picture, img') && !prev.textContent.trim()) {
        prev.remove();
      }
    }
  }

  block.classList.toggle('no-image', !picture);
}
