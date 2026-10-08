/*
 * Embed Adaptive Form
 * Based on the embed-adaptive-form block from https://github.com/adobe-rnd/aem-boilerplate-forms
 *
 * Same-origin links load the form page as a fragment (upstream behaviour).
 * Links to AEM Forms publish (e.g. https://publish-p154632-e1630770.adobeaemcloud.com/content/forms/
 * af/<form>) or to the AEM-sourced forms site (https://main--brother-accs-forms--adobedixon.aem.live/
 * content/forms/af/<form>) are fetched cross-origin, so DA.live pages can embed forms authored in
 * AEM Forms with Universal Editor.
 */
import { decorateBlock, loadBlock } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// hosts allowed to serve embedded form definitions, in addition to the current origin
const FORMS_HOSTS = [
  /^([a-z0-9-]+--)?brother-accs-forms--adobedixon\.aem\.(page|live)$/,
];

// AEM Forms publish tiers that serve form definitions directly
const AEM_PUBLISH_HOSTS = [
  /^publish-p154632-e1630770\.adobeaemcloud\.com$/,
];

const isAemPublishHost = (url) => AEM_PUBLISH_HOSTS.some((host) => host.test(url.hostname));

function isAllowedFormsHost(url) {
  return url.origin === window.location.origin
    || isAemPublishHost(url)
    || FORMS_HOSTS.some((host) => host.test(url.hostname));
}

/**
 * Resolves the form URL from the authored link. aem.live rewrites links to *.aem.live/page hosts
 * into relative paths, so the authored absolute URL is taken from the link text when present.
 * A relative /content/forms/af/ path on a storefront aem.page/live host is mapped to the forms
 * site on the same ref and tier.
 * @param {HTMLAnchorElement} link The authored link
 * @returns {URL} The form page URL
 */
function getFormUrl(link) {
  const text = link.textContent.trim();
  const url = new URL(/^https?:\/\//.test(text) ? text : link.href, window.location.href);
  const storefrontHost = window.location.hostname.match(/^(.+)--brother-accs--adobedixon\.(aem\.(page|live))$/);
  if (url.origin === window.location.origin && storefrontHost
    && url.pathname.startsWith('/content/forms/af/')) {
    const [, ref, domain] = storefrontHost;
    return new URL(`${url.pathname}${url.search}`, `https://${ref}--brother-accs-forms--adobedixon.${domain}`);
  }
  return url;
}

/**
 * Fetches the form block from a page on another (allowed) origin.
 * @param {URL} url The published form page URL
 * @returns {Promise<HTMLElement|null>} The undecorated form block
 */
async function fetchRemoteForm(url) {
  const pathname = url.pathname.replace(/(\.plain)?\.html$/, '');
  const source = isAemPublishHost(url)
    ? `${url.origin}${pathname}/jcr:content/root/section/form.html`
    : `${url.origin}${pathname}.plain.html`;
  const resp = await fetch(source);
  if (!resp.ok) return null;
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const form = doc.querySelector('div.form');
  // AEM publish markup carries AEM Universal Editor instrumentation that doesn't apply here
  [form, ...(form?.querySelectorAll('*') || [])].forEach((el) => {
    [...(el?.attributes || [])]
      .filter(({ name }) => name.startsWith('data-aue-'))
      .forEach(({ name }) => el.removeAttribute(name));
  });
  return form;
}

function showError(block, message) {
  const error = document.createElement('p');
  error.className = 'embed-adaptive-form-error';
  error.textContent = message;
  block.replaceChildren(error);
}

async function loadForm(block) {
  const link = block.querySelector('a[href]');
  if (!link) return;
  const url = getFormUrl(link);

  if (!isAllowedFormsHost(url)) {
    // eslint-disable-next-line no-console
    console.error(`embed-adaptive-form: ${url.origin} is not an allowed forms host`);
    showError(block, 'This form is currently unavailable.');
    return;
  }

  try {
    if (url.origin === window.location.origin) {
      const fragment = await loadFragment(url.pathname);
      if (fragment?.children[0]) {
        block.replaceChildren(fragment.children[0]);
        return;
      }
    } else {
      const form = await fetchRemoteForm(url);
      if (form) {
        block.replaceChildren(form);
        decorateBlock(form);
        await loadBlock(form);
        return;
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('embed-adaptive-form: unable to load form', e);
  }
  showError(block, 'This form is currently unavailable. Please try again later.');
}

export default function decorate(block) {
  // load the form when the block enters the viewport
  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      await loadForm(block);
    }
  });
  observer.observe(block);
}
