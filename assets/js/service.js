import { CATEGORIES, createElement as el, formatPrice, fullAddress, loadDraft, loadPublishedContent } from './core.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const params = new URLSearchParams(location.search);
const preview = params.get('preview') === 'draft';

function homeUrl(hash = '', serviceId = '') {
  const url = new URL('./', location.href);
  if (preview) url.searchParams.set('preview', 'draft');
  if (serviceId) url.searchParams.set('service', serviceId);
  url.hash = hash;
  return url.href;
}

function serviceUrl(id) {
  const url = new URL('service.html', location.href);
  url.search = ''; url.hash = '';
  url.searchParams.set('service', id);
  if (preview) url.searchParams.set('preview', 'draft');
  return url.href;
}

function arrow() {
  const node = el('span', 'external-arrow');
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function populateList(listSelector, sectionSelector, text) {
  const list = $(listSelector);
  const lines = (text || '').split('\n').map(line => line.trim()).filter(Boolean);
  list.replaceChildren(...lines.map(line => el('li', '', line)));
  $(sectionSelector).hidden = lines.length === 0;
}

function renderService(service, content) {
  const contact = content.contact;
  $('#service-content').hidden = false;
  $('#service-category').textContent = `THE BEAUTY MENU · ${CATEGORIES[service.category].toUpperCase()}`;
  $('#service-name').textContent = service.name;
  $('#service-breadcrumb').textContent = service.name;
  $('#service-intro').textContent = service.description;
  $('#service-price').textContent = formatPrice(service.price);
  $('#service-duration').textContent = service.duration === null ? 'Call to confirm appointment length' : `Approx. ${service.duration} minutes`;
  $('#service-description').textContent = service.details || service.description;
  $('#service-image').src = service.image;
  $('#service-image').alt = service.category === 'spa' ? 'The welcoming interior of Fashion Nails & Spa' : `${service.name} inspiration from our salon photo collection`;
  $('#service-image-note').textContent = service.category === 'spa' ? 'A look inside our salon. Call to ask about current treatments.' : 'From our salon photo collection. Bring your own inspiration, too.';
  for (const id of ['#service-plan', '#mobile-service-plan']) $(id).href = homeUrl('contact', service.id);
  populateList('#service-highlights', '#highlights-section', service.highlights);
  populateList('#service-preparation', '#preparation-section', service.preparation);
  $('#good-to-know-section').hidden = !service.goodToKnow;
  $('#service-good-to-know').textContent = service.goodToKnow || '';
  $('#service-address').textContent = fullAddress(contact);
  $('#service-directions').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress(contact))}`;
  renderPhotos(service, content);
  renderRelated(service, content);
  document.title = `${service.name} | ${content.brand.name} · ${contact.city}, ${contact.state}`;
  $('meta[name="description"]').content = `${service.name} at ${content.brand.name} in ${contact.city}, ${contact.state}. ${service.description} Call ${contact.phoneDisplay} for pricing and appointments.`;
  const schema = { '@context': 'https://schema.org', '@type': 'Service', name: service.name, description: service.details || service.description, serviceType: CATEGORIES[service.category], provider: { '@type': 'NailSalon', name: content.brand.name, telephone: contact.phone, address: { '@type': 'PostalAddress', streetAddress: contact.address, addressLocality: contact.city, addressRegion: contact.state, postalCode: contact.zip, addressCountry: 'US' } } };
  if (service.price !== null) schema.offers = { '@type': 'Offer', price: service.price, priceCurrency: 'USD' };
  const structured = el('script'); structured.type = 'application/ld+json'; structured.id = 'service-structured-data'; structured.textContent = JSON.stringify(schema); document.head.append(structured);
}

function renderPhotos(service, content) {
  const category = service.category === 'spa' ? 'salon' : service.category;
  const images = content.gallery.filter(photo => photo.category === category && photo.src !== service.image).slice(0, 3);
  $('#service-photo-section').hidden = images.length === 0;
  $('#service-photos').replaceChildren();
  if (category === 'salon') $('#service-gallery-title').textContent = 'Make yourself at home.';
  for (const photo of images) {
    const figure = el('figure', 'detail-gallery-photo');
    const image = el('img'); image.src = photo.src; image.alt = photo.alt; image.loading = 'lazy'; image.width = 600; image.height = 750;
    figure.append(image, el('figcaption', '', photo.caption));
    $('#service-photos').append(figure);
  }
}

function renderRelated(service, content) {
  const list = $('#related-services');
  list.replaceChildren();
  const others = content.services.filter(item => item.id !== service.id).sort((a, b) => Number(b.category === service.category) - Number(a.category === service.category)).slice(0, 3);
  $('.detail-related-section').hidden = others.length === 0;
  for (const item of others) {
    const link = el('a', 'related-service-card'); link.href = serviceUrl(item.id); link.setAttribute('aria-label', `Read about ${item.name}`);
    const image = el('img'); image.src = item.image; image.alt = item.category === 'spa' ? 'Inside our salon' : item.name; image.loading = 'lazy'; image.width = 600; image.height = 450;
    const body = el('div');
    const read = el('span', 'text-link', 'Explore this service'); read.append(arrow());
    body.append(el('h3', '', item.name), el('p', '', formatPrice(item.price)), read);
    link.append(image, body); list.append(link);
  }
}

function setupMenu() {
  const toggle = $('.menu-toggle');
  const nav = $('#main-navigation');
  const close = () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); toggle.setAttribute('aria-label', 'Open menu'); };
  toggle.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    nav.classList.toggle('is-open', open); toggle.setAttribute('aria-expanded', String(open)); toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('is-open')) { close(); toggle.focus(); } });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) close(); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
}

async function init() {
  setupMenu();
  $$('[data-home-link]').forEach(link => { link.href = homeUrl(new URL(link.href).hash); });
  try {
    let content = await loadPublishedContent();
    let notice = '';
    if (preview) {
      $('#preview-banner').hidden = false;
      try { const draft = loadDraft(); if (draft) content = draft.content; else notice = 'No local draft found. Showing the published service details.'; }
      catch { notice = 'The local draft could not be loaded. Showing the published service details.'; }
    }
    $$('[data-phone-link]').forEach(link => { link.href = `tel:${content.contact.phone}`; });
    $$('[data-phone-display]').forEach(node => { node.textContent = content.contact.phoneDisplay; });
    $('#footer-address').textContent = fullAddress(content.contact);
    const service = content.services.find(item => item.id === params.get('service'));
    $('#service-status').textContent = notice;
    $('#service-status').hidden = !notice;
    if (!service) { $('#service-not-found').hidden = false; document.title = 'Service not found | Fashion Nails & Spa'; return; }
    renderService(service, content);
  } catch (error) {
    console.error(error);
    $('#service-status').textContent = 'Service details could not be loaded. Please refresh or call (717) 248-4131 to ask about our services.';
  }
}

init();
