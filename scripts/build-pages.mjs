import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { NAV_PAGES, PAGE_LABELS, PAGE_ROUTES } from '../assets/js/routes.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const checkOnly = process.argv.includes('--check');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const read = file => readFile(resolve(root, file), 'utf8');
const layout = await read('templates/layout.html');
const icons = await read('templates/partials/icons.html');
const footer = await read('templates/partials/footer.html');
const lightbox = await read('templates/partials/lightbox.html');
const descriptions = {
  home: 'Your little beauty escape in Lewistown. Nails, pedicures, waxing and facial care at 8 W. Water St. Call (717) 248-4131.',
  services: 'Explore manicures, gel nails, nail art, pedicures, waxing and facial care. See each service and call Fashion Nails & Spa for pricing.',
  gallery: 'Explore our salon photo collection, nail designs, pedicures and moments with friends at Fashion Nails & Spa in Lewistown.',
  specials: 'Ask about Nails & Go $25, current offers, coupons and rewards at Fashion Nails & Spa. Call for availability and offer details.',
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
  const content = await read(`templates/pages/${page}.html`);
  const current = page === 'service' ? 'services' : page.startsWith('journal') ? 'about' : page;
  const navigation = NAV_PAGES.map(key => {
    const classes = [key === current ? 'active' : '', key === 'contact' ? 'nav-book' : ''].filter(Boolean).join(' ');
    return `<a href="${PAGE_ROUTES[key]}"${classes ? ` class="${classes}"` : ''}${key === current ? ' aria-current="page"' : ''}>${escape(PAGE_LABELS[key])}${key === 'contact' ? ' <span class="external-arrow" aria-hidden="true"></span>' : ''}</a>`;
  }).join('\n        ');
  const title = page === 'home' ? 'Fashion Nails & Spa | Nail Salon in Lewistown, PA' : `${PAGE_LABELS[page]} | Fashion Nails & Spa · Lewistown, PA`;
  const description = descriptions[page] || `${PAGE_LABELS[page]} at Fashion Nails & Spa, 8 W. Water St., Lewistown, PA 17044. Call (717) 248-4131.`;
  const tokens = {
    PAGE: page, TITLE: escape(title), DESCRIPTION: escape(description), NAVIGATION: navigation,
    ICONS: icons.trim(), CONTENT: content.trim(), FOOTER: footer.trim(), LIGHTBOX: lightbox.trim(),
    EXTRA_HEAD: page === 'service' ? '<link rel="stylesheet" href="assets/css/service.css?v=20261104-multipage">' : '',
    SCRIPT: page === 'service' ? 'service.js' : 'site.js',
  };
  const html = layout.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(tokens, key)) throw new Error(`Unknown layout token: ${key}`);
    return tokens[key];
  }).replace(/[\t ]+$/gm, '');
  await emit(file, html);
}

await mkdir(resolve(root, 'docs'), { recursive: true });
await emit('docs/page-routes.json', JSON.stringify(Object.fromEntries(NAV_PAGES.map(page => [page, PAGE_ROUTES[page]])), null, 2) + '\n');
if (checkOnly && changed) process.exitCode = 1;
else console.log(checkOnly ? 'All 13 static pages match their templates.' : `Generated 13 static pages (${changed} updated outputs).`);
