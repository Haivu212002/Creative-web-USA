import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { LEGACY_HASH_ROUTES, NAV_PAGES, PAGE_ROUTES, SITE_RELEASE, SITE_URL, canonicalHref, legacyServiceId, pageHref, previewParameters } from '../assets/js/routes.js';
import { renderGallery, renderPromotions, renderServices } from '../scripts/static-content.mjs';
import { activePromotions, appointmentSlots, DRAFT_KEY, directionsUrl, fullAddress, mapEmbedUrl, formatPrice, formatTime, isDate, loadDraft, safeFacebook, safeImage, salonDate, saveDraft, validateContent } from '../assets/js/core.js';

const published = JSON.parse(readFileSync(new URL('../content.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(published);

test('published content is valid and honors the supplied salon identity', () => {
  assert.deepEqual(validateContent(published), []);
  assert.equal(published.contact.phone, '+17172484131');
  assert.equal(published.contact.address, '8 W. Water St.');
  assert.equal(published.brand.domain, 'GoFashionNailSpa.com');
  assert.ok(published.services.every(service => service.price === null && service.duration === null));
});

test('schema rejects invalid prices, duplicate IDs and image script URLs', () => {
  const data = clone();
  data.services[0].price = -5;
  data.services[1].id = data.services[0].id;
  data.gallery[0].src = 'javascript:alert(1)';
  const errors = validateContent(data);
  assert.ok(errors.some(e => e.includes('giá')));
  assert.ok(errors.some(e => e.includes('trùng')));
  assert.ok(errors.some(e => e.includes('đường dẫn ảnh')));
});

test('unknown categories, malformed schedules, and backwards offer dates are rejected', () => {
  const data = clone();
  data.services[0].category = '__proto__';
  data.hours[0] = { day: 2, open: '19:00', close: '09:00' };
  data.promotions[0].startDate = '2026-12-01';
  data.promotions[0].endDate = '2026-11-01';
  assert.ok(validateContent(data).length >= 4);
});

test('images support static paths, HTTPS, and raster uploads but exclude unsafe formats', () => {
  assert.equal(safeImage('assets/images/nail-art-jewels.jpg'), true);
  assert.equal(safeImage('https://example.com/nails.webp'), true);
  assert.equal(safeImage('data:image/png;base64,aGVsbG8='), true);
  for (const image of ['javascript:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', '../private.jpg', 'http://example.com/nails.jpg']) assert.equal(safeImage(image), false);
  assert.equal(safeFacebook('https://www.facebook.com/GoFashionNailSpa'), true);
  assert.equal(safeFacebook('https://facebook.com.evil.example/test'), false);
  assert.equal(safeFacebook('https://user:secret@facebook.com/test'), false);
});

test('calendar dates are real and handled in the salon timezone', () => {
  assert.equal(isDate('2026-02-30'), false);
  assert.equal(isDate('2028-02-29'), true);
  assert.equal(isDate('2026-2-03'), false);
  assert.equal(salonDate(new Date('2026-11-03T02:00:00Z')), '2026-11-02');
  assert.equal(salonDate(new Date('2026-07-01T03:00:00Z')), '2026-06-30');
});

test('appointment planner excludes closed days, past dates, closing time and elapsed slots', () => {
  const now = new Date('2026-11-03T18:10:00Z'); // Tuesday, 1:10 PM Eastern
  const slots = appointmentSlots('2026-11-03', published.hours, now);
  assert.equal(slots[0], '13:30');
  assert.equal(slots.at(-1), '17:30');
  assert.ok(!slots.includes('18:00'));
  assert.deepEqual(appointmentSlots('2026-11-02', published.hours, now), []);
  assert.deepEqual(appointmentSlots('2026-11-08', published.hours, now), []);
  assert.deepEqual(appointmentSlots('not-a-date', published.hours, now), []);
  assert.equal(appointmentSlots('2026-11-05', published.hours, now)[0], '10:30');
});

test('promotion date boundaries are inclusive and disabled offers stay hidden', () => {
  const offer = { ...published.promotions[0], startDate: '2026-11-01', endDate: '2026-11-03' };
  assert.equal(activePromotions([offer], '2026-11-03').length, 1);
  assert.equal(activePromotions([offer], '2026-11-04').length, 0);
  assert.equal(activePromotions([{ ...offer, enabled: false }], '2026-11-02').length, 0);
});

test('draft round-trip validates before replacing the last saved copy', () => {
  const memory = new Map();
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  assert.equal(loadDraft(storage), null);
  saveDraft(published, storage);
  assert.deepEqual(loadDraft(storage).content, published);
  const before = storage.getItem(DRAFT_KEY);
  const broken = clone(); broken.contact.phone = 'invalid';
  assert.throws(() => saveDraft(broken, storage));
  assert.equal(storage.getItem(DRAFT_KEY), before);
  storage.setItem(DRAFT_KEY, '{broken');
  assert.throws(() => loadDraft(storage));
});

test('price and time presentation preserve unknown prices and zero dollar services', () => {
  assert.equal(formatPrice(null), 'Call for pricing');
  assert.equal(formatPrice(0), '$0');
  assert.equal(formatPrice(25.5), '$25.50');
  assert.equal(formatTime('12:00'), '12:00 PM');
  assert.equal(formatTime('09:30'), '9:30 AM');
});

test('service detail fields are validated without invalidating older drafts', () => {
  const older = clone();
  for (const service of older.services) for (const key of ['details', 'highlights', 'preparation', 'goodToKnow']) delete service[key];
  assert.deepEqual(validateContent(older), []);
  const invalid = clone();
  invalid.services[0].details = { unsafe: 'HTML' };
  invalid.services[1].preparation = 'a'.repeat(6001);
  assert.equal(validateContent(invalid).filter(error => error.includes('thông tin dịch vụ')).length, 2);
  assert.ok(published.services.every(service => service.details && service.highlights && service.preparation && service.goodToKnow));
});

test('displayed salon photos use verified enhanced files and original photographs remain unchanged', () => {
  const sources = JSON.parse(readFileSync(new URL('../docs/media-sources.json', import.meta.url), 'utf8'));
  const edits = JSON.parse(readFileSync(new URL('../docs/media-edits.json', import.meta.url), 'utf8'));
  const digest = file => createHash('sha256').update(readFileSync(new URL(`../${file}`, import.meta.url))).digest('hex');
  assert.equal(edits.images.length, 14);
  for (const source of sources.images) assert.equal(digest(source.asset), source.sha256);
  for (const edit of edits.images) {
    assert.equal(digest(edit.original), edit.originalSha256);
    assert.equal(digest(edit.enhanced), edit.enhancedSha256);
    assert.ok(safeImage(edit.enhanced));
  }
  const enhanced = new Set(edits.images.map(image => image.enhanced));
  const displayed = [...published.services.map(service => service.image), ...published.gallery.filter(image => image.category !== 'inspiration').map(image => image.src)];
  assert.ok(displayed.every(image => enhanced.has(image)));
});

test('the seven main menus resolve to distinct physical HTML pages', () => {
  assert.equal(NAV_PAGES.length, 7);
  const files = NAV_PAGES.map(page => pageHref(page).split('?')[0]);
  assert.equal(new Set(files).size, 7);
  assert.ok(files.every(file => file.endsWith('.html') && !file.includes('#')));
  for (const file of files) assert.ok(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes('<main id="main"'));
});

test('generated nail inspiration has a separate category, provenance and verified local files', () => {
  const manifest = JSON.parse(readFileSync(new URL('../docs/media-inspiration.json', import.meta.url), 'utf8'));
  const photos = published.gallery.filter(photo => photo.category === 'inspiration');
  assert.equal(photos.length, 6);
  assert.equal(manifest.pinterestImagesUsed, false);
  assert.equal(manifest.images.length, photos.length);
  for (const photo of photos) {
    const entry = manifest.images.find(image => image.asset === photo.src);
    assert.ok(entry);
    assert.ok(photo.alt.startsWith('AI-created'));
    assert.ok(safeImage(photo.src));
    assert.equal(createHash('sha256').update(readFileSync(new URL(`../${photo.src}`, import.meta.url))).digest('hex'), entry.sha256);
  }
});

test('page links preserve preview and chosen service with safe query encoding', () => {
  assert.equal(pageHref('contact', { service: 'nail-art', ...previewParameters('?preview=draft') }), `booking.html?service=nail-art&preview=draft&v=${SITE_RELEASE}`);
  assert.equal(pageHref('gallery', previewParameters('?preview=other')), `gallery.html?v=${SITE_RELEASE}`);
  assert.equal(pageHref('service', { service: 'a&preview=unexpected' }), `service.html?service=a%26preview%3Dunexpected&v=${SITE_RELEASE}`);
  assert.throws(() => pageHref('javascript:alert(1)'));
});

test('old section bookmarks and service aliases map to the current pages', () => {
  assert.equal(PAGE_ROUTES[LEGACY_HASH_ROUTES.services], 'services.html');
  assert.equal(PAGE_ROUTES[LEGACY_HASH_ROUTES.contact], 'booking.html');
  assert.equal(legacyServiceId('design'), 'nail-art');
  assert.equal(legacyServiceId('manicure'), 'manicure');
});

test('canonical URLs use the live Pages address and only preserve parameters that identify content', () => {
  assert.equal(canonicalHref('home', { v: 'old', preview: 'draft' }), SITE_URL);
  assert.equal(canonicalHref('gallery', { v: 'old', utm_source: 'facebook' }), `${SITE_URL}gallery.html`);
  assert.equal(canonicalHref('contact', { service: 'manicure' }), `${SITE_URL}booking.html`);
  assert.equal(canonicalHref('service', { service: 'nail-art', v: 'old', preview: 'draft' }), `${SITE_URL}service.html?service=nail-art`);
  assert.throws(() => canonicalHref('unknown'));
});

test('maps show the salon neighborhood while direction links open a route to the same address', () => {
  const route = new URL(directionsUrl(published.contact));
  assert.equal(route.origin, 'https://www.google.com');
  assert.equal(route.pathname, '/maps/dir/');
  assert.equal(route.searchParams.get('api'), '1');
  assert.equal(route.searchParams.get('destination'), fullAddress(published.contact));
  assert.equal(route.searchParams.has('origin'), false);
  const embed = new URL(mapEmbedUrl(published.contact));
  assert.equal(embed.searchParams.get('q'), route.searchParams.get('destination'));
  assert.equal(embed.searchParams.get('z'), '16');
  assert.equal(embed.searchParams.get('output'), 'embed');
  const changed = { ...published.contact, address: '10 W. Water St. & destination=Another place' };
  const encoded = new URL(directionsUrl(changed));
  assert.deepEqual([...encoded.searchParams.keys()], ['api', 'destination']);
  assert.equal(encoded.searchParams.get('destination'), fullAddress(changed));
});

test('static content treats salon text as text and shows dated offers without relying on the build date', () => {
  const text = '<img src=x onerror="alert(1)"> & a quote';
  const escaped = '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; a quote';
  const service = { ...published.services[0], name: text, description: text };
  const photo = { ...published.gallery[0], caption: text, alt: text };
  const offer = { ...published.promotions[0], title: text, startDate: '2026-11-01', endDate: '2026-11-04' };
  for (const html of [renderServices([service]), renderGallery([photo]), renderPromotions([offer], published.contact)]) {
    assert.ok(!html.includes(text));
    assert.ok(html.includes(escaped));
    assert.ok(!html.includes('<img src=x'));
  }
  const dated = renderPromotions([offer], published.contact);
  assert.ok(dated.includes('From Nov 1, 2026 · Until Nov 4, 2026'));
  assert.ok(dated.includes('Applies only within these dates'));
  assert.ok(!renderPromotions([{ ...offer, enabled: false }], published.contact).includes(escaped));
});

test('published HTML contains the full menu, photos and offer plus clean canonicals and no admin links', () => {
  const html = file => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const services = html(PAGE_ROUTES.services);
  assert.equal((services.match(/class="service-card"/g) || []).length, published.services.length);
  assert.equal((services.match(/Call for pricing/g) || []).length, published.services.length);
  for (const service of published.services) assert.ok(services.includes(`service.html?service=${service.id}&amp;v=`));
  const gallery = html(PAGE_ROUTES.gallery);
  for (const photo of published.gallery) assert.ok(gallery.includes(`src="${photo.src}"`));
  assert.ok(gallery.includes('<details id="gallery-static-more"'));
  assert.ok(html(PAGE_ROUTES.specials).includes('<h3>Nails &amp; Go</h3><div class="promotion-highlight">$25</div>'));
  for (const [page, file] of Object.entries(PAGE_ROUTES)) {
    const source = html(file);
    assert.equal((source.match(/rel="canonical"/g) || []).length, 1, file);
    assert.ok(source.includes(`<link rel="canonical" href="${canonicalHref(page)}">`), file);
    assert.ok(!source.includes('href="admin/"'), file);
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(source), file);
  }
});
