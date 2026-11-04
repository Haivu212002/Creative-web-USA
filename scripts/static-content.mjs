import { CATEGORIES, formatPrice } from '../assets/js/core.js';
import { pageHref } from '../assets/js/routes.js';

export const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll("'", '&#39;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const arrow = '<span class="external-arrow" aria-hidden="true"></span>';

export function renderServices(services) {
  if (!services.length) return '<p class="empty-state">Please call us to ask about our services.</p>';
  return services.map(service => {
    const details = escapeHtml(pageHref('service', { service: service.id }));
    const plan = escapeHtml(pageHref('contact', { service: service.id }));
    const name = escapeHtml(service.name);
    const alt = service.category === 'spa' ? 'A look inside Fashion Nails & Spa' : `${service.name} inspiration from Fashion Nails & Spa`;
    return `<article class="service-card"><a class="service-photo" href="${details}" aria-label="View details for ${name}"><img src="${escapeHtml(service.image)}" alt="${escapeHtml(alt)}" loading="lazy" width="600" height="450"><span class="service-category">${escapeHtml(CATEGORIES[service.category])}</span></a><div class="service-content"><h3><a href="${details}">${name}</a></h3><p>${escapeHtml(service.description)}</p><a class="service-read-more" href="${details}" aria-label="Read about ${name}">Explore this service${arrow}</a><div class="service-card-footer"><span class="service-price">${escapeHtml(formatPrice(service.price))}${service.duration === null ? '' : `<small>Approx. ${escapeHtml(service.duration)} min</small>`}</span><a class="service-select" href="${plan}" aria-label="Plan a visit for ${name}">${arrow}</a></div></div></article>`;
  }).join('\n');
}

export function renderGallery(photos) {
  if (!photos.length) return '<p class="empty-state">More salon moments are on their way. Please check back soon.</p>';
  return photos.map(photo => `<a class="gallery-item" href="${escapeHtml(photo.src)}" aria-label="View photo: ${escapeHtml(photo.caption || photo.alt)}"><img src="${escapeHtml(photo.src)}" alt="${escapeHtml(photo.alt)}" loading="lazy" width="600" height="750"><span class="gallery-caption"><span>${escapeHtml(photo.caption)}</span>${arrow}</span></a>`).join('\n');
}

export function renderGalleryMore(photos) {
  if (!photos.length) return '';
  return `<details id="gallery-static-more" class="gallery-static-more"><summary>More salon moments <span aria-hidden="true">+</span></summary><div class="gallery-grid">${renderGallery(photos)}</div></details>`;
}

export function renderPromotions(promotions, contact) {
  // Keep the static build reproducible. Dated announcements include their validity dates;
  // the browser additionally filters them by today's date in the salon's timezone.
  const enabled = promotions.filter(promotion => promotion.enabled);
  const call = label => `<a class="text-link" href="tel:${escapeHtml(contact.phone)}">${label}${arrow}</a>`;
  if (!enabled.length) return `<article class="promotion-card"><span class="card-kicker">TODAY’S LITTLE EXTRAS</span><h3>Ask about our specials.</h3><p>Call us to find out about current offers and availability.</p>${call('Call the salon')}</article>`;
  return enabled.map(promotion => {
    const fmt = value => new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
    const dates = [promotion.startDate ? `From ${fmt(promotion.startDate)}` : '', promotion.endDate ? `Until ${fmt(promotion.endDate)}` : ''].filter(Boolean).join(' · ');
    return `<article class="promotion-card"><span class="card-kicker">A LITTLE PICK-ME-UP</span><h3>${escapeHtml(promotion.title)}</h3>${promotion.highlight ? `<div class="promotion-highlight">${escapeHtml(promotion.highlight)}</div>` : ''}<p>${escapeHtml(promotion.description)}</p>${promotion.code ? `<span class="promotion-code">Mention code: ${escapeHtml(promotion.code)}</span>` : ''}${call('Call to ask about this offer')}${dates ? `<span class="promotion-dates">${escapeHtml(dates)} · Applies only within these dates. Call to confirm terms and availability.</span>` : ''}</article>`;
  }).join('\n');
}
