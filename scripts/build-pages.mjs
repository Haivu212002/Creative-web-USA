import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NAV_PAGES, PAGE_LABELS, PAGE_ROUTES, SITE_RELEASE, canonicalHref, pageHref } from '../assets/js/routes.js';
import { validateContent } from '../assets/js/core.js';
import { escapeHtml as escape, renderGallery, renderGalleryMore, renderPromotions, renderServices } from './static-content.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const checkOnly = process.argv.includes('--check');
const read = file => readFile(resolve(root, file), 'utf8');
const layout = await read('templates/layout.html');
const icons = await read('templates/partials/icons.html');
const footer = await read('templates/partials/footer.html');
const lightbox = await read('templates/partials/lightbox.html');
const published = JSON.parse(await read('content.json'));
const errors = validateContent(published);
if (errors.length) throw new Error(`Invalid content.json:\n${errors.join('\n')}`);
const offerNames = published.promotions.filter(offer => offer.enabled).map(offer => [offer.title, offer.highlight].filter(Boolean).join(' '));
const descriptions = {
  home: 'Your little beauty escape in Lewistown. Nails, pedicures, waxing and facial care at 8 W. Water St. Call (717) 248-4131.',
  services: 'Explore manicures, gel nails, nail art, pedicures, waxing and facial care. See each service and call Fashion Nails & Spa for pricing.',
  gallery: 'Explore nail style inspiration, salon photos, pedicures and moments with friends at Fashion Nails & Spa in Lewistown.',
  specials: offerNames.length ? `Explore ${offerNames.join(', ')} at Fashion Nails & Spa. Check offer dates and call to confirm terms and availability.` : 'Ask about salon offers, coupons and rewards at Fashion Nails & Spa. Call to confirm current availability and details.',
  about: 'Meet your neighborhood beauty escape on Water Street in Lewistown, PA. Discover the salon and the moments that make it personal.',
  gifts: 'Give a little me-time. Ask Fashion Nails & Spa about gift certificates for birthdays, holidays and thoughtful surprises.',
  contact: 'Find salon hours, directions and phone appointment planning for Fashion Nails & Spa, 8 W. Water St., Lewistown, PA 17044.',
};

let changed = 0;
async function emit(file, contents) {
  let existing = '';
  try { existing = await read(file); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing === contents) return;
  changed++;
  if (checkOnly) { console.error(`Regenerate ${file}: npm run build`); return; }
  await writeFile(resolve(root, file), contents);
}

for (const [page, file] of Object.entries(PAGE_ROUTES)) {
  const fragment = await read(`templates/pages/${page}.html`);
  const photos = page === 'about' ? published.gallery.filter(photo => photo.category === 'community').slice(0, 2) : published.gallery.filter(photo => photo.category !== 'inspiration');
  const contentTokens = {
    SERVICES_CONTENT: () => renderServices(published.services),
    GALLERY_CONTENT: () => renderGallery(photos.slice(0, 8)),
    GALLERY_MORE: () => renderGalleryMore(photos.slice(8)),
    INSPIRATION_CONTENT: () => renderGallery(published.gallery.filter(photo => photo.category === 'inspiration')),
    PROMOTIONS_CONTENT: () => renderPromotions(published.promotions, published.contact),
  };
  const content = fragment.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(contentTokens, key)) throw new Error(`Unknown content token: ${key}`);
    return contentTokens[key]();
  });
  const current = page === 'service' ? 'services' : page.startsWith('journal') ? 'about' : page;
  const navigation = NAV_PAGES.map(key => {
    const classes = [key === current ? 'active' : '', key === 'contact' ? 'nav-book' : ''].filter(Boolean).join(' ');
    return `<a href="${escape(pageHref(key))}"${classes ? ` class="${classes}"` : ''}${key === current ? ' aria-current="page"' : ''}>${escape(PAGE_LABELS[key])}${key === 'contact' ? ' <span class="external-arrow" aria-hidden="true"></span>' : ''}</a>`;
  }).join('\n        ');
  const title = page === 'home' ? 'Fashion Nails & Spa | Nail Salon in Lewistown, PA' : `${PAGE_LABELS[page]} | Fashion Nails & Spa · Lewistown, PA`;
  const description = descriptions[page] || `${PAGE_LABELS[page]} at Fashion Nails & Spa, 8 W. Water St., Lewistown, PA 17044. Call (717) 248-4131.`;
  const tokens = {
    PAGE: page, TITLE: escape(title), DESCRIPTION: escape(description), CANONICAL: escape(canonicalHref(page)), NAVIGATION: navigation,
    ICONS: icons.trim(), CONTENT: content.trim(), FOOTER: footer.trim(), LIGHTBOX: lightbox.trim(),
    EXTRA_HEAD: page === 'service' ? `<link rel="stylesheet" href="assets/css/service.css?v=${SITE_RELEASE}">` : '',
    RELEASE: SITE_RELEASE,
    SCRIPT: page === 'service' ? 'service.js' : 'site.js',
  };
  let html = layout.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(tokens, key)) throw new Error(`Unknown layout token: ${key}`);
    return tokens[key];
  }).replace(/[\t ]+$/gm, '');
  html = html.replace(/(<a\b[^>]*\bhref=")([^"]+)(")/g, (match, before, href, after) => {
    const url = new URL(href.replaceAll('&amp;', '&'), 'https://build.invalid/');
    if (url.origin !== 'https://build.invalid' || !Object.values(PAGE_ROUTES).some(file => url.pathname === '/' + file)) return match;
    url.searchParams.set('v', SITE_RELEASE);
    return before + escape(url.pathname.slice(1) + url.search + url.hash) + after;
  });
  await emit(file, html);
}

await mkdir(resolve(root, 'docs'), { recursive: true });
await emit('docs/page-routes.json', JSON.stringify(Object.fromEntries(NAV_PAGES.map(page => [page, PAGE_ROUTES[page]])), null, 2) + '\n');
if (checkOnly && changed) process.exitCode = 1;
else console.log(checkOnly ? 'All 13 static pages match their templates.' : `Generated 13 static pages (${changed} updated outputs).`);
