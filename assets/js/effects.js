let observer;
let motion;
let initialized = false;
const watched = new WeakSet();
const targets = '.section-heading,.service-card,.gallery-item,.promotion-card,.rewards-card,.about-art,.about-copy,.gift-art,.gift-copy,.gift-reason,.visit-card,.booking-card,.detail-list-section,.detail-note,.detail-visit-card,.detail-gallery-photo,.related-service-card,.journal-link-card,.journal-card,.page-intro-photo';

export function observeEffects(root = document) {
  if (!motion || motion.matches || !('IntersectionObserver' in window)) return;
  if (!observer) observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.06, rootMargin: '0px 0px -25px 0px' });
  root.querySelectorAll(targets).forEach((node, index) => {
    if (watched.has(node)) return;
    watched.add(node);
    node.style.setProperty('--reveal-delay', `${(index % 4) * 55}ms`);
    node.classList.add('reveal-pending');
    observer.observe(node);
  });
}

export function initEffects() {
  if (initialized) return;
  initialized = true;
  motion = matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotion = () => {
    document.documentElement.dataset.motion = motion.matches ? 'reduced' : 'full';
    if (motion.matches) document.querySelectorAll('.reveal-pending').forEach(node => { node.classList.add('is-revealed'); observer?.unobserve(node); });
    else observeEffects();
  };
  motion.addEventListener?.('change', updateMotion);
  updateMotion();
  const top = document.querySelector('.back-to-top');
  const header = document.querySelector('.site-header');
  let scheduled = false;
  const updateScroll = () => {
    const maximum = document.documentElement.scrollHeight - innerHeight;
    const progress = maximum > 0 ? Math.max(0, Math.min(1, scrollY / maximum)) : 0;
    document.documentElement.style.setProperty('--reading-progress', String(progress));
    header?.classList.toggle('is-scrolled', scrollY > 16);
    if (top) { top.classList.toggle('is-visible', scrollY > 500); top.tabIndex = scrollY > 500 ? 0 : -1; }
    scheduled = false;
  };
  const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateScroll); } };
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('load', schedule, { once: true });
  addEventListener('pageshow', schedule);
  updateScroll();
}
