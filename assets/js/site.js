import { applyBusinessContent, initChrome, redirectLegacyHome } from './chrome.js?v=20261104-static';
import { observeEffects } from './effects.js?v=20261104-static';
import { PAGE_LABELS, SITE_URL, legacyServiceId, pageHref, previewParameters } from './routes.js?v=20261104-static';
import { CATEGORIES, DAYS, activePromotions, appointmentSlots, createElement as el, formatPrice, formatTime, loadDraft, loadPublishedContent, salonDate } from './core.js?v=20261104-static';

let content;
let serviceFilter = 'all';
let galleryFilter = 'all';
let showAllPhotos = false;
let lightboxPhotos = [];
let lightboxIndex = 0;
let lightboxTrigger;
const $ = selector => document.querySelector(selector);

function arrow() {
  const span = el('span', 'external-arrow');
  span.setAttribute('aria-hidden', 'true');
  return span;
}

function callLink(text, className = 'text-link') {
  const a = el('a', className, text);
  a.href = `tel:${content.contact.phone}`;
  a.append(arrow());
  return a;
}

function applyContent() {
  applyBusinessContent(content);
  const c = content.contact;
  if ($('#copyright-year')) $('#copyright-year').textContent = new Date().getFullYear();
  const page = document.body.dataset.page || 'home';
  document.title = page === 'home' ? `${content.brand.name} | Nail Salon in ${c.city}, ${c.state}` : `${PAGE_LABELS[page] || 'Fashion Nails & Spa'} | ${content.brand.name} · ${c.city}, ${c.state}`;
  if ($('#service-grid')) renderServices();
  if ($('#gallery-grid')) renderGallery();
  if ($('#promotions')) renderPromotions();
  if ($('#hours-list')) renderHours();
  if ($('#visit-service')) {
    const options = content.services.map(service => new Option(service.name, service.id));
    $('#visit-service').replaceChildren(new Option('Choose a service', ''), ...options);
    const requestedService = legacyServiceId(new URLSearchParams(location.search).get('service'));
    if (content.services.some(service => service.id === requestedService)) $('#visit-service').value = requestedService;
    $('#visit-date').min = salonDate();
  }
  addStructuredData();
  observeEffects();
}

function renderServices() {
  const grid = $('#service-grid');
  let services = content.services.filter(item => serviceFilter === 'all' || item.category === serviceFilter);
  if (grid.dataset.featured) {
    const ids = grid.dataset.featured.split(',');
    services = ids.map(id => services.find(item => item.id === id)).filter(Boolean);
  }
  if (grid.dataset.limit) services = services.slice(0, Number(grid.dataset.limit));
  grid.replaceChildren();
  if (!services.length) { grid.append(el('p', 'empty-state', 'Please call us to ask about services in this category.')); return; }
  for (const service of services) {
    const card = el('article', 'service-card');
    const detailsUrl = pageHref('service', { service: service.id, ...previewParameters(location.search) });
    const photo = el('a', 'service-photo');
    photo.href = detailsUrl;
    photo.setAttribute('aria-label', `View details for ${service.name}`);
    const image = el('img');
    image.src = service.image;
    image.alt = service.category === 'spa' ? 'A look inside Fashion Nails & Spa' : `${service.name} inspiration from Fashion Nails & Spa`;
    image.loading = 'lazy'; image.width = 600; image.height = 450;
    photo.append(image, el('span', 'service-category', CATEGORIES[service.category]));
    const body = el('div', 'service-content');
    const footer = el('div', 'service-card-footer');
    const price = el('span', 'service-price', formatPrice(service.price));
    if (service.duration !== null) price.append(el('small', '', `Approx. ${service.duration} min`));
    const plan = el('a', 'service-select');
    plan.append(arrow());
    plan.href = pageHref('contact', { service: service.id, ...previewParameters(location.search) });
    plan.setAttribute('aria-label', `Plan a visit for ${service.name}`);
    footer.append(price, plan);
    const heading = el('h3');
    const headingLink = el('a', '', service.name); headingLink.href = detailsUrl; heading.append(headingLink);
    const readMore = el('a', 'service-read-more', 'Explore this service');
    readMore.href = detailsUrl; readMore.setAttribute('aria-label', `Read about ${service.name}`); readMore.append(arrow());
    body.append(heading, el('p', '', service.description), readMore, footer);
    card.append(photo, body); grid.append(card);
  }
  observeEffects(grid);
}

function renderGallery() {
  const grid = $('#gallery-grid');
  const category = galleryFilter === 'all' ? grid.dataset.category || 'all' : galleryFilter;
  const limit = Number(grid.dataset.limit || 8);
  lightboxPhotos = content.gallery.filter(photo => category === 'all' || photo.category === category);
  const displayed = showAllPhotos ? lightboxPhotos : lightboxPhotos.slice(0, limit);
  grid.replaceChildren();
  if (!displayed.length) grid.append(el('p', 'empty-state', 'More salon moments are on their way. Please check back soon.'));
  displayed.forEach((photo, index) => {
    const button = el('button', 'gallery-item'); button.type = 'button';
    button.setAttribute('aria-label', `View photo: ${photo.caption || photo.alt}`);
    const image = el('img'); image.src = photo.src; image.alt = photo.alt; image.loading = 'lazy'; image.width = 600; image.height = 750;
    const caption = el('span', 'gallery-caption'); caption.append(el('span', '', photo.caption), arrow());
    button.append(image, caption); button.addEventListener('click', () => openLightbox(index, button)); grid.append(button);
  });
  if ($('#gallery-more')) $('#gallery-more').hidden = showAllPhotos || lightboxPhotos.length <= limit;
  $('#gallery-static-more')?.remove();
  observeEffects(grid);
}

function updateLightbox() {
  const photo = lightboxPhotos[lightboxIndex];
  $('#lightbox-image').src = photo.src;
  $('#lightbox-image').alt = photo.alt;
  $('#lightbox-caption').textContent = photo.caption || photo.alt;
  $('#lightbox-count').textContent = `${lightboxIndex + 1} / ${lightboxPhotos.length}`;
  $('#lightbox-prev').disabled = lightboxPhotos.length < 2;
  $('#lightbox-next').disabled = lightboxPhotos.length < 2;
}

function openLightbox(index, trigger) {
  lightboxTrigger = trigger;
  lightboxIndex = index;
  updateLightbox();
  $('#gallery-dialog').showModal();
  $('[data-close-gallery]').focus();
}

function movePhoto(delta) {
  lightboxIndex = (lightboxIndex + delta + lightboxPhotos.length) % lightboxPhotos.length;
  updateLightbox();
}

function renderPromotions() {
  const list = $('#promotions');
  list.replaceChildren();
  const promotions = activePromotions(content.promotions);
  if (!promotions.length) {
    const card = el('article', 'promotion-card');
    card.append(el('span', 'card-kicker', 'TODAY’S LITTLE EXTRAS'), el('h3', '', 'Ask about our specials.'), el('p', '', 'Call us to find out about current offers and availability.'), callLink('Call the salon'));
    list.append(card);
    return;
  }
  for (const promotion of promotions) {
    const card = el('article', 'promotion-card');
    card.append(el('span', 'card-kicker', 'A LITTLE PICK-ME-UP'), el('h3', '', promotion.title));
    if (promotion.highlight) card.append(el('div', 'promotion-highlight', promotion.highlight));
    card.append(el('p', '', promotion.description));
    if (promotion.code) card.append(el('span', 'promotion-code', `Mention code: ${promotion.code}`));
    card.append(callLink('Call to ask about this offer'));
    if (promotion.startDate || promotion.endDate) {
      const fmt = value => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
      const dates = [promotion.startDate ? `From ${fmt(promotion.startDate)}` : '', promotion.endDate ? `Until ${fmt(promotion.endDate)}` : ''].filter(Boolean).join(' · ');
      card.append(el('span', 'promotion-dates', dates));
    }
    list.append(card);
  }
}

function renderHours() {
  const list = $('#hours-list');
  list.replaceChildren();
  const sorted = [...content.hours].sort((a, b) => a.day - b.day);
  const groups = [];
  for (const day of sorted) {
    const last = groups.at(-1);
    if (last && last.open === day.open && last.close === day.close) last.days.push(day.day);
    else groups.push({ open: day.open, close: day.close, days: [day.day] });
  }
  for (const group of groups) {
    const row = el('div');
    const label = group.days.length === 2 ? group.days.map(day => DAYS[day]).join(' & ') : group.days.length > 2 ? `${DAYS[group.days[0]]} – ${DAYS[group.days.at(-1)]}` : DAYS[group.days[0]];
    row.append(el('dt', '', label), el('dd', '', group.open ? `${formatTime(group.open)} – ${formatTime(group.close)}` : 'Closed'));
    list.append(row);
  }
}

function updateVisitTimes() {
  const date = $('#visit-date').value;
  const time = $('#visit-time');
  const slots = appointmentSlots(date, content.hours);
  time.replaceChildren(new Option(slots.length ? 'Choose a time' : 'No times available', ''), ...slots.map(slot => new Option(formatTime(slot), slot)));
  time.disabled = !slots.length;
  $('#visit-summary').hidden = true;
  $('#visit-hint').textContent = !date ? 'Choose a date to see times within our salon hours.' : slots.length ? 'Preferred times are in Eastern Time. Call to confirm actual availability.' : date < salonDate() ? 'Please choose today or a future date.' : 'The salon is closed or there are no remaining times on this date. Please choose another day or call us.';
}

function addStructuredData() {
  const script = el('script');
  script.type = 'application/ld+json';
  script.id = 'salon-structured-data';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'NailSalon', name: content.brand.name,
    url: SITE_URL, telephone: content.contact.phone,
    address: { '@type': 'PostalAddress', streetAddress: content.contact.address, addressLocality: content.contact.city, addressRegion: content.contact.state, postalCode: content.contact.zip, addressCountry: 'US' },
    sameAs: [content.contact.facebookUrl],
    openingHoursSpecification: content.hours.filter(day => day.open).map(day => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAYS[day.day]}`, opens: day.open, closes: day.close })),
  });
  $('#salon-structured-data')?.remove();
  document.head.append(script);
}

function setupInteractions() {
  for (const [id, callback] of [['service-filters', value => { serviceFilter = value; renderServices(); }], ['gallery-filters', value => { galleryFilter = value; showAllPhotos = false; renderGallery(); }]]) {
    const group = $(`#${id}`);
    if (group) group.hidden = false;
    group?.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      group.querySelectorAll('button').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
      callback(button.dataset.filter);
    });
  }
  $('#gallery-more')?.addEventListener('click', () => { showAllPhotos = true; renderGallery(); $('#gallery-grid').children[8]?.focus({ preventScroll: true }); });
  $('[data-close-gallery]')?.addEventListener('click', () => $('#gallery-dialog').close());
  $('#lightbox-prev')?.addEventListener('click', () => movePhoto(-1));
  $('#lightbox-next')?.addEventListener('click', () => movePhoto(1));
  $('#gallery-dialog')?.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  $('#gallery-dialog')?.addEventListener('close', () => lightboxTrigger?.focus({ preventScroll: true }));
  $('#gallery-dialog')?.addEventListener('click', event => {
    const rect = $('#gallery-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#gallery-dialog').close();
  });
  if (!$('#visit-form')) return;
  $('#visit-date').addEventListener('change', updateVisitTimes);
  $('#visit-date').addEventListener('focus', () => { $('#visit-date').min = salonDate(); });
  $('#visit-form').addEventListener('input', () => { $('#visit-summary').hidden = true; });
  $('#visit-form').addEventListener('submit', event => {
    event.preventDefault();
    const service = content.services.find(s => s.id === $('#visit-service').value);
    const date = $('#visit-date').value;
    const time = $('#visit-time').value;
    if (!service || !appointmentSlots(date, content.hours).includes(time)) { updateVisitTimes(); return; }
    const dateLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
    $('#visit-summary-text').textContent = `${service.name} · ${dateLabel} · ${formatTime(time)} Eastern Time. Please mention these preferences when you call. The salon will confirm the service, price, and available time.`;
    $('#visit-summary').hidden = false;
    $('#visit-summary').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
  });
}

async function init() {
  if (redirectLegacyHome()) return;
  initChrome();
  try {
    content = await loadPublishedContent();
    if (new URLSearchParams(location.search).get('preview') === 'draft') {
      $('#preview-banner').hidden = false;
      try {
        const draft = loadDraft();
        if (draft) content = draft.content;
        else { $('#site-notice').textContent = 'No local draft found in this browser. You are viewing the published content.'; $('#site-notice').hidden = false; }
      } catch (error) {
        $('#site-notice').textContent = `${error.message} Showing the published content instead.`;
        $('#site-notice').hidden = false;
      }
    }
    applyContent();
    setupInteractions();
  } catch (error) {
    console.error(error);
    $('#site-notice').textContent = 'Some interactive features could not be loaded. Please use the published information on this page, refresh, or call (717) 248-4131 for services and appointments.';
    $('#site-notice').hidden = false;
    if ($('#visit-form')) $('#visit-form').hidden = true;
    if ($('#gallery-more')) $('#gallery-more').hidden = true;
  }
}

init();
