/* =========================================================
   CURSOR
========================================================= */
const dot  = document.createElement('div'); dot.className  = 'cursor-dot';
const ring = document.createElement('div'); ring.className = 'cursor-ring';
document.body.append(dot, ring);

let mx = -100, my = -100, rx = -100, ry = -100;
document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

(function animCursor() {
  dot.style.left  = mx + 'px'; dot.style.top  = my + 'px';
  rx += (mx - rx) * 0.12;    ry += (my - ry) * 0.12;
  ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
  requestAnimationFrame(animCursor);
})();

/* =========================================================
   FLOATING PILL NAV — sliding indicator
========================================================= */
const nav = document.getElementById('nav');
const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];
const indicator = document.getElementById('navIndicator');

function moveIndicator(link) {
  if (!indicator || !link) return;
  const navRect  = nav.getBoundingClientRect();
  const linkRect = link.getBoundingClientRect();
  indicator.style.left  = (linkRect.left - navRect.left) + 'px';
  indicator.style.width = linkRect.width + 'px';
}

function setActiveNav(id) {
  navLinks.forEach(a => {
    const isActive = a.getAttribute('href') === '#' + id;
    a.classList.toggle('active', isActive);
    if (isActive) moveIndicator(a);
  });
}

/* =========================================================
   SECTION DOTS
========================================================= */
const dotsContainer = document.getElementById('sectionDots');
const sections = Array.from(document.querySelectorAll('section[id]'));

if (dotsContainer) {
  sections.forEach(s => {
    const d = document.createElement('div');
    d.className = 'section-dot';
    d.setAttribute('title', s.dataset.label || s.id);
    d.addEventListener('click', () => document.getElementById(s.id)?.scrollIntoView({behavior:'smooth'}));
    dotsContainer.appendChild(d);
  });
}

/* =========================================================
   INTERSECTION OBSERVER — active section + scroll anim
========================================================= */
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const id = e.target.id;
    setActiveNav(id);
    // update dots
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.section-dot');
      sections.forEach((s, i) => { dots[i]?.classList.toggle('active', s.id === id); });
    }
  });
}, { threshold: 0.25 });
sections.forEach(s => sectionObserver.observe(s));

const animObserver = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); animObserver.unobserve(e.target); } });
}, { threshold: 0.1 });
document.querySelectorAll('[data-anim]').forEach(el => animObserver.observe(el));

/* =========================================================
   MOBILE NAV TOGGLE
========================================================= */
const mobileToggle = document.getElementById('mobileToggle');
if (mobileToggle && nav) {
  mobileToggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('is-open')));
}

/* =========================================================
   TYPEWRITER — hero role
========================================================= */
const typeEl = document.getElementById('typewriter');
if (typeEl) {
  const phrases = [
    'IT Technician & Developer',
    'Co-Founder @ Easydomotica',
    'Network & Cybersecurity',
    'Game Dev (UE5)',
    'Fast learner. Always.',
  ];
  let pi = 0, ci = 0, deleting = false;
  function type() {
    const phrase = phrases[pi];
    typeEl.textContent = deleting ? phrase.slice(0, ci--) : phrase.slice(0, ci++);
    if (!deleting && ci > phrase.length)      { deleting = true; setTimeout(type, 1800); return; }
    if  (deleting && ci < 1)                  { deleting = false; pi = (pi + 1) % phrases.length; }
    setTimeout(type, deleting ? 40 : 70);
  }
  type();
}

/* =========================================================
   FOOTER YEAR
========================================================= */
document.querySelectorAll('.js-year').forEach(el => el.textContent = new Date().getFullYear());

/* =========================================================
   NAV BORDER ON SCROLL
========================================================= */
window.addEventListener('scroll', () => {
  if (nav) nav.style.borderColor = window.scrollY > 40 ? 'rgba(86,227,214,0.15)' : '';
}, { passive: true });
