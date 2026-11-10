import { LEGACY_HASH_ROUTES, PAGE_ROUTES, legacyServiceId, pageHref, previewParameters } from './routes.js?v=20261110-floating';
import { initEffects, observeEffects } from './effects.js?v=20261110-floating';
import { createElement as el, directionsUrl, fullAddress, mapEmbedUrl } from './core.js?v=20261110-floating';

export function applyBusinessContent(content) {
  document.querySelectorAll('[data-bind]').forEach(node => {
    const [section, key] = node.dataset.bind.split('.');
    const value = content[section]?.[key];
    if (typeof value === 'string') node.textContent = value;
  });
  const c = content.contact;
  document.querySelectorAll('[data-phone-link]').forEach(link => { link.href = `tel:${c.phone}`; });
  document.querySelectorAll('[data-phone-display]').forEach(node => { node.textContent = c.phoneDisplay; });
  document.querySelectorAll('[data-city]').forEach(node => { node.textContent = `${c.city}, ${c.state}`; });
  document.querySelectorAll('[data-full-address]').forEach(node => { node.textContent = fullAddress(c); });
  document.querySelectorAll('[data-address]').forEach(node => { node.replaceChildren(document.createTextNode(c.address), el('br'), document.createTextNode(`${c.city}, ${c.state} ${c.zip}`)); });
  document.querySelectorAll('[data-map-link]').forEach(link => { link.href = directionsUrl(c); });
  document.querySelectorAll('[data-map-embed]').forEach(frame => {
    const url = mapEmbedUrl(c);
    if (frame.src !== url) frame.src = url;
    frame.title = `Map of the neighborhood around ${content.brand.name}, ${c.city}`;
  });
  document.querySelectorAll('[data-facebook-link]').forEach(link => { link.href = c.facebookUrl; });
  document.querySelectorAll('[data-facebook-name]').forEach(node => { node.textContent = c.facebookName; });
}

export function redirectLegacyHome() {
  if (document.body.dataset.page !== 'home') return false;
  const section = location.hash.slice(1);
  if (!Object.hasOwn(LEGACY_HASH_ROUTES, section)) return false;
  const params = new URLSearchParams(location.search);
  location.replace(pageHref(LEGACY_HASH_ROUTES[section], { ...previewParameters(location.search), service: legacyServiceId(params.get('service')) }));
  return true;
}

export function applyPreviewLinks(root = document) {
  if (!previewParameters(location.search).preview) return;
  const files = new Set(Object.values(PAGE_ROUTES));
  for (const link of root.querySelectorAll('a[href]')) {
    const raw = link.getAttribute('href');
    if (!raw || raw.startsWith('#')) continue;
    const url = new URL(raw, location.href);
    if (url.origin === location.origin && files.has(url.pathname.split('/').at(-1))) {
      url.searchParams.set('preview', 'draft');
      link.href = url.href;
    }
  }
}

export function initChrome() {
  const year = document.querySelector('#copyright-year');
  if (year) year.textContent = new Date().getFullYear();
  if (previewParameters(location.search).preview) {
    const banner = document.querySelector('#preview-banner');
    if (banner) {
      const studio = el('a', '', 'Back to content studio');
      studio.href = 'admin/';
      banner.append(studio);
      banner.hidden = false;
    }
    const robots = el('meta');
    robots.name = 'robots'; robots.content = 'noindex';
    document.head.append(robots);
  }
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-navigation');
  if (toggle && nav) {
    const close = () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { close(); toggle.focus(); } });
    document.addEventListener('click', event => { if (!event.target.closest('.site-header')) close(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1000) close(); });
  }
  applyPreviewLinks();
  initEffects();
  observeEffects();
}
