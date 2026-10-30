const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  navigation.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Open navigation');
}
toggle.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (window.innerWidth > 1000) closeMenu(); });
document.querySelector('#year').textContent = new Date().getFullYear();

// Filter the inspiration gallery without changing the page.
const filters = document.querySelectorAll('[data-filter]');
filters.forEach(button => button.addEventListener('click', () => {
  let count = 0;
  filters.forEach(other => {
    const active = other === button;
    other.classList.toggle('active', active);
    other.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('[data-category]').forEach(card => {
    card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter;
    if (!card.hidden) count++;
  });
  document.querySelector('#filter-status').textContent = `${count} inspiration ${count === 1 ? 'look' : 'looks'} shown.`;
}));
const dialog = document.querySelector('#photo-dialog');
document.querySelectorAll('.photo-open').forEach(button => button.addEventListener('click', () => {
  dialog.querySelector('img').src = button.dataset.photo;
  dialog.querySelector('img').alt = button.querySelector('img').alt;
  dialog.querySelector('p').textContent = button.dataset.caption;
  dialog.showModal();
}));
dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

// Each half of a paired illustrative photo occupies the same comparison viewport.
const range = document.querySelector('#comparison-range');
if (range) range.addEventListener('input', () => {
  document.querySelector('.comparison').style.setProperty('--reveal', `${100 - Number(range.value)}%`);
  document.querySelector('#comparison-output').value = `${range.value}%`;
});

const form = document.querySelector('#consultation-form');
if (form) {
  const params = new URLSearchParams(location.search);
  const service = params.get('service');
  if (['manicure', 'pedicure', 'design', 'unsure'].includes(service)) form.elements.service.value = service;
  const contexts = [];
  const looks = { french: 'Classic French', color: 'Burgundy & blush', art: 'Floral nail art' };
  const offers = { 'first-visit': 'First visit concept', together: 'Hands & feet concept', birthday: 'Birthday concept' };
  if (looks[params.get('look')]) contexts.push(`Inspiration: ${looks[params.get('look')]}.`);
  if (offers[params.get('offer')]) contexts.push(`Question about current offers (${offers[params.get('offer')]} — demo only, not an active discount).`);
  if (contexts.length) {
    const context = document.querySelector('#booking-context');
    context.textContent = contexts.join(' ');
    context.hidden = false;
  }
  const dateInput = form.elements.date;
  const salonDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = Object.fromEntries(salonDate.formatToParts(new Date()).filter(part => ['year', 'month', 'day'].includes(part.type)).map(part => [part.type, part.value]));
  dateInput.min = `${parts.year}-${parts.month}-${parts.day}`;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (form.dataset.publicPreview === 'true') {
      const notice = document.querySelector('#form-error');
      notice.textContent = 'This is a public design preview. No personal details have been sent or saved. Please call 717.248.4131 to arrange a visit.';
      notice.hidden = false;
      notice.focus();
      return;
    }
    if (!form.reportValidity()) return;
    const button = document.querySelector('#submit-request');
    const error = document.querySelector('#form-error');
    error.hidden = true;
    button.disabled = true;
    button.textContent = 'Saving your request…';
    const data = Object.fromEntries(new FormData(form));
    data.consent = form.elements.consent.checked;
    if (contexts.length) data.message = `${contexts.join(' ')}\n${data.message}`.slice(0, 2000);
    try {
      if (location.protocol === 'file:') throw new Error('Please run this website with npm start to submit the form, or call 717.248.4131. No request has been sent.');
      const response = await fetch('/api/consultations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      let result;
      try { result = await response.json(); } catch { throw new Error('The consultation service is unavailable. Please call 717.248.4131. No confirmation was received.'); }
      if (!response.ok) throw new Error(result.error || 'Unable to save your request. Please try again or call the salon.');
      if (!result.reference) throw new Error('No request reference was received. Please call the salon to check before retrying.');
      document.querySelector('#request-reference').textContent = result.reference;
      form.hidden = true;
      const success = document.querySelector('#booking-success');
      success.hidden = false;
      success.focus();
      form.reset();
    } catch (failure) {
      error.textContent = failure.message || 'Connection failed. Please call 717.248.4131 to arrange your consultation.';
      error.hidden = false;
      error.focus();
    } finally {
      button.disabled = false;
      button.innerHTML = 'Send consultation request <span>↗</span>';
    }
  });
}
