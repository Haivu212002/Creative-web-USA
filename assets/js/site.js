import { CATEGORIES, DAYS, activePromotions, appointmentSlots, createElement as el, formatPrice, formatTime, fullAddress, loadDraft, loadPublishedContent, salonDate } from './core.js';

let content;
let serviceFilter = 'all';
let galleryFilter = 'all';
let showAllPhotos = false;
let lightboxPhotos = [];
let lightboxIndex = 0;
let lightboxTrigger;
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

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
  $$('[data-bind]').forEach(node => {
    const [section, key] = node.dataset.bind.split('.');
    const value = content[section]?.[key];
    if (typeof value === 'string') node.textContent = value;
  });
  const c = content.contact;
  $$('[data-phone-link]').forEach(a => { a.href = `tel:${c.phone}`; });
  $$('[data-phone-display]').forEach(node => { node.textContent = c.phoneDisplay; });
  $$('[data-city]').forEach(node => { node.textContent = `${c.city}, ${c.state}`; });
  $$('[data-full-address]').forEach(node => { node.textContent = fullAddress(c); });
  $$('[data-address]').forEach(node => { node.replaceChildren(document.createTextNode(c.address), el('br'), document.createTextNode(`${c.city}, ${c.state} ${c.zip}`)); });
  $$('[data-map-link]').forEach(a => { a.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(c))}`; });
  $$('[data-facebook-link]').forEach(a => { a.href = c.facebookUrl; });
  $$('[data-facebook-name]').forEach(node => { node.textContent = c.facebookName; });
  $('#copyright-year').textContent = new Date().getFullYear();
  document.title = `${content.brand.name} | Nail Salon in ${c.city}, ${c.state}`;
  $('#service-grid').replaceChildren();
  renderServices();
  renderGallery();
  renderPromotions();
  renderHours();
  const options = content.services.map(service => {
    const option = el('option', '', service.name);
    option.value = service.id;
    return option;
  });
  $('#visit-service').replaceChildren(new Option('Choose a service', ''), ...options);
  $('#visit-date').min = salonDate();
  addStructuredData();
}

function renderServices() {
  const grid = $('#service-grid');
  const services = content.services.filter(item => serviceFilter === 'all' || item.category === serviceFilter);
  grid.replaceChildren();
  if (!services.length) { grid.append(el('p', 'empty-state', 'Please call us to ask about services in this category.')); return; }
  for (const service of services) {
    const card = el('article', 'service-card');
    const photo = el('div', 'service-photo');
    const image = el('img');
    image.src = service.image;
    image.alt = `${service.name} inspiration from Fashion Nails & Spa`;
    image.loading = 'lazy';
    image.width = 600;
    image.height = 450;
    photo.append(image, el('span', 'service-category', CATEGORIES[service.category]));
    const body = el('div', 'service-content');
    const footer = el('div', 'service-card-footer');
    const price = el('span', 'service-price', formatPrice(service.price));
    if (service.duration !== null) price.append(el('small', '', `Approx. ${service.duration} min`));
    const select = el('button', 'service-select');
    select.append(arrow());
    select.type = 'button';
    select.setAttribute('aria-label', `Plan a visit for ${service.name}`);
    select.addEventListener('click', () => {
      $('#visit-service').value = service.id;
      $('#visit-summary').hidden = true;
      window.location.hash = 'contact';
      $('#visit-date').focus({ preventScroll: true });
    });
    footer.append(price, select);
    body.append(el('h3', '', service.name), el('p', '', service.description), footer);
    card.append(photo, body);
    grid.append(card);
  }
}

function renderGallery() {
  const grid = $('#gallery-grid');
  lightboxPhotos = content.gallery.filter(photo => galleryFilter === 'all' || photo.category === galleryFilter);
  const displayed = showAllPhotos ? lightboxPhotos : lightboxPhotos.slice(0, 8);
  grid.replaceChildren();
  if (!displayed.length) grid.append(el('p', 'empty-state', 'More salon moments are on their way. Please check back soon.'));
  displayed.forEach((photo, index) => {
    const button = el('button', 'gallery-item');
    button.type = 'button';
    button.setAttribute('aria-label', `View photo: ${photo.caption || photo.alt}`);
    const image = el('img');
    image.src = photo.src;
    image.alt = photo.alt;
    image.loading = 'lazy';
    image.width = 600;
    image.height = 750;
    const caption = el('span', 'gallery-caption');
    caption.append(el('span', '', photo.caption), arrow());
    button.append(image, caption);
    button.addEventListener('click', () => openLightbox(index, button));
    grid.append(button);
  });
  $('#gallery-more').hidden = showAllPhotos || lightboxPhotos.length <= 8;
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
    url: `https://${content.brand.domain.toLowerCase()}/`, telephone: content.contact.phone,
    address: { '@type': 'PostalAddress', streetAddress: content.contact.address, addressLocality: content.contact.city, addressRegion: content.contact.state, postalCode: content.contact.zip, addressCountry: 'US' },
    sameAs: [content.contact.facebookUrl],
    openingHoursSpecification: content.hours.filter(day => day.open).map(day => ({ '@type': 'OpeningHoursSpecification', dayOfWeek: `https://schema.org/${DAYS[day.day]}`, opens: day.open, closes: day.close })),
  });
  $('#salon-structured-data')?.remove();
  document.head.append(script);
}

function setupInteractions() {
  const toggle = $('.menu-toggle');
  const nav = $('#main-navigation');
  function closeMenu() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); }
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); toggle.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) closeMenu(); });
  for (const [id, callback] of [['service-filters', value => { serviceFilter = value; renderServices(); }], ['gallery-filters', value => { galleryFilter = value; showAllPhotos = false; renderGallery(); }]]) {
    $(`#${id}`).addEventListener('click', event => {
      const button = event.target.closest('[data-filter]');
      if (!button) return;
      $(`#${id}`).querySelectorAll('button').forEach(item => { item.classList.toggle('active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
      callback(button.dataset.filter);
    });
  }
  $('#gallery-more').addEventListener('click', () => { showAllPhotos = true; renderGallery(); $('#gallery-grid').children[8]?.focus({ preventScroll: true }); });
  $('[data-close-gallery]').addEventListener('click', () => $('#gallery-dialog').close());
  $('#lightbox-prev').addEventListener('click', () => movePhoto(-1));
  $('#lightbox-next').addEventListener('click', () => movePhoto(1));
  $('#gallery-dialog').addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); movePhoto(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  $('#gallery-dialog').addEventListener('close', () => lightboxTrigger?.focus({ preventScroll: true }));
  $('#gallery-dialog').addEventListener('click', event => {
    const rect = $('#gallery-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#gallery-dialog').close();
  });
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
    $('#visit-summary').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  const observer = new IntersectionObserver(entries => {
    const entry = entries.filter(item => item.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!entry) return;
    nav.querySelectorAll('a').forEach(link => {
      const active = link.hash === `#${entry.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 });
  $$('main>section[id]').forEach(section => observer.observe(section));
}

async function init() {
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
    $('#site-notice').textContent = 'The service menu and photo gallery could not be loaded. Please refresh, or call (717) 248-4131 for services and appointments.';
    $('#site-notice').hidden = false;
    $('#visit-form').hidden = true;
    $('#gallery-more').hidden = true;
  }
}

init();
