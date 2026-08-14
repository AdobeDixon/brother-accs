/**
 * Hero Overlay: a full-bleed banner with heading, body copy and a CTA
 * overlaid on top of a photographic background.
 *
 * The importer emits the banner background as a standalone picture in the
 * default-content block that precedes this block (the source delivered it via
 * empty background divs). Pull that picture into the block so it can be used as
 * the background layer. Everything here is null-safe: if no image is found the
 * block simply renders as a plain dark banner.
 *
 * @param {Element} block The block element
 */
export default function decorate(block) {
  // Prefer an image already authored inside the block.
  let picture = block.querySelector('picture');

  if (!picture) {
    // Otherwise adopt the image the importer left in the preceding default
    // content wrapper (a bare <p><picture> sitting just before the block).
    const wrapper = block.closest('.hero-overlay-wrapper') || block.parentElement;
    const prev = wrapper && wrapper.previousElementSibling;
    picture = prev ? prev.querySelector('picture') : null;

    if (picture) {
      const orphan = picture.closest('p');
      block.prepend(picture);
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
