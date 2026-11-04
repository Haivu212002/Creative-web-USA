import { PAGE_ROUTES, legacyServiceId, pageHref, previewParameters } from './routes.js?v=20261104-mp2';

// Older secondary URLs keep working while each main menu now has its own file.
const target = document.documentElement.dataset.legacyTarget;
if (Object.hasOwn(PAGE_ROUTES, target)) {
  const parameters = previewParameters(location.search);
  if (target === 'contact') {
    const service = legacyServiceId(new URLSearchParams(location.search).get('service'));
    if (service && /^[a-z0-9-]{1,80}$/.test(service)) parameters.service = service;
  }
  window.location.replace(new URL(pageHref(target, parameters), location.href).href);
}
