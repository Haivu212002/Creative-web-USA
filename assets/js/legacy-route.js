// Preserve bookmarked URLs from the earlier multi-page demo.
const allowedTargets = new Set(['services', 'gallery', 'about', 'specials', 'contact']);
const target = document.documentElement.dataset.legacyTarget;
if (allowedTargets.has(target)) {
  const destination = new URL('./', window.location.href);
  destination.hash = target;
  if (target === 'contact') {
    const services = { manicure: 'manicure', pedicure: 'pedicure', design: 'nail-art' };
    const service = new URLSearchParams(window.location.search).get('service');
    if (Object.hasOwn(services, service)) destination.searchParams.set('service', services[service]);
  }
  window.location.replace(destination.href);
}
