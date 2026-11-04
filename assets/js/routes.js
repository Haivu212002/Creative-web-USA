export const SITE_RELEASE = '20261104-type';
export const SITE_URL = 'https://haivu212002.github.io/Creative-web-USA/';

export const PAGE_ROUTES = Object.freeze({
  home: 'index.html',
  services: 'services.html',
  gallery: 'gallery.html',
  specials: 'offers.html',
  about: 'about.html',
  gifts: 'gift-certificates.html',
  contact: 'booking.html',
  service: 'service.html',
  journal: 'blog.html',
  'journal-care': 'journal-nail-care.html',
  'journal-shape': 'journal-choose-your-shape.html',
  'journal-visit': 'journal-first-visit.html',
  privacy: 'privacy.html',
});

export const NAV_PAGES = Object.freeze(['home', 'services', 'gallery', 'specials', 'about', 'gifts', 'contact']);
export const PAGE_LABELS = Object.freeze({
  home: 'Home', services: 'Services & Prices', gallery: 'Gallery',
  specials: 'Specials & Rewards', about: 'About Us', gifts: 'Gift Certificates',
  contact: 'Contact & Book', service: 'Service details', journal: 'Beauty Journal',
  'journal-care': 'Five small habits for a happier manicure',
  'journal-shape': 'How to choose a nail shape that feels like you',
  'journal-visit': 'Your first nail consultation, made simple', privacy: 'Your information',
});

export const LEGACY_HASH_ROUTES = Object.freeze({ services: 'services', gallery: 'gallery', specials: 'specials', about: 'about', gifts: 'gifts', contact: 'contact', visit: 'contact' });

export function pageHref(page, parameters = {}) {
  if (!Object.hasOwn(PAGE_ROUTES, page)) throw new Error(`Unknown website page: ${page}`);
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(parameters)) {
    if (value !== undefined && value !== null && value !== false && value !== '') query.set(key, String(value));
  }
  query.set('v', SITE_RELEASE);
  return PAGE_ROUTES[page] + (query.size ? `?${query}` : '');
}

export function canonicalHref(page, parameters = {}) {
  if (!Object.hasOwn(PAGE_ROUTES, page)) throw new Error(`Unknown website page: ${page}`);
  const url = new URL(page === 'home' ? '' : PAGE_ROUTES[page], SITE_URL);
  // A service ID identifies distinct content. Preview, cache and planner parameters do not.
  if (page === 'service' && parameters.service) url.searchParams.set('service', parameters.service);
  return url.href;
}

export function previewParameters(search = '') {
  return new URLSearchParams(search).get('preview') === 'draft' ? { preview: 'draft' } : {};
}

export function legacyServiceId(id) {
  return id === 'design' ? 'nail-art' : id;
}
