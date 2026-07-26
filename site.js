/* =========================================================
   SITE.JS — renders content.json into the page
   Used by index.html and photography.html
========================================================= */

const CONTENT_URL = 'content.json';

/* ── helpers ── */
const el = (tag, cls, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
};
const badge = (type, label) => `<span class="badge badge--${type}">${label}</span>`;

/* ── fetch content ── */
async function loadContent() {
  const res = await fetch(CONTENT_URL + '?t=' + Date.now());
  if (!res.ok) throw new Error('Failed to load content.json');
  return res.json();
}

/* ── render index page ── */
async function renderIndex() {
  let data;
  try { data = await loadContent(); }
  catch(e) { document.getElementById('site-loading')?.remove(); return; }

  document.getElementById('site-loading')?.remove();

  const { site, hero, about, experience, skills, projects } = data;

  /* --- HERO --- */
  document.getElementById('hero-name-first') && (document.getElementById('hero-name-first').textContent = site.name.split(' ')[0]);
  document.getElementById('hero-name-last') && (document.getElementById('hero-name-last').textContent = site.name.split(' ')[1] || '');
  if (document.getElementById('hero-tagline')) document.getElementById('hero-tagline').textContent = hero.tagline;

  /* typewriter */
  const typeEl = document.getElementById('typewriter');
  if (typeEl && hero.typewriter_phrases?.length) {
    let pi=0,ci=0,del=false;
    function type(){
      const p=hero.typewriter_phrases[pi];
      typeEl.textContent=del?p.slice(0,ci--):p.slice(0,ci++);
      if(!del&&ci>p.length){del=true;setTimeout(type,1600);return;}
      if(del&&ci<1){del=false;pi=(pi+1)%hero.typewriter_phrases.length;}
      setTimeout(type,del?38:65);
    }
    type();
  }

  /* --- ABOUT --- */
  const aboutText = document.getElementById('about-text');
  if (aboutText && about.paragraphs) {
    aboutText.innerHTML = about.paragraphs.map(p => `<p>${p}</p>`).join('');
    if (about.skills_line) aboutText.innerHTML += `<p class="skills-inline">${about.skills_line}</p>`;
  }
  const statsGrid = document.getElementById('about-stats');
  if (statsGrid && about.stats) {
    statsGrid.innerHTML = about.stats.map(s =>
      `<div class="stat"><span class="stat__num">${s.num}</span><span class="stat__label">${s.label}</span></div>`
    ).join('');
  }

  /* --- EXPERIENCE --- */
  const timeline = document.getElementById('timeline');
  if (timeline && experience) {
    timeline.innerHTML = experience.map((exp, i) => `
      <article class="timeline__item" data-anim data-delay="${i+1}">
        <div class="timeline__node${exp.active ? ' timeline__node--active' : ''}"></div>
        <div class="timeline__card">
          <p class="timeline__period">${exp.period}</p>
          <h3>${exp.role}</h3>
          <p class="timeline__org">${exp.org}</p>
          <p class="timeline__desc">${exp.desc}${exp.link ? ` <a href="${exp.link}" style="color:var(--cyan)">Full story →</a>` : ''}</p>
        </div>
      </article>
    `).join('');
  }

  /* --- SKILLS --- */
  const skillsGrid = document.getElementById('skills-grid');
  if (skillsGrid && skills) {
    skillsGrid.innerHTML = skills.map((g, i) => `
      <div class="skill-group" data-anim data-delay="${i+1}">
        <h3>${g.group}</h3>
        <div class="tags">${g.tags.map((t,ti) =>
          `<span class="tag${g.highlight && ti===0 ? ' tag--'+g.highlight : ''}">${t}</span>`
        ).join('')}</div>
        ${g.note ? `<p class="skill-note">${g.note}</p>` : ''}
      </div>
    `).join('');
  }

  /* --- PROJECTS --- */
  const projGrid = document.getElementById('projects-grid');
  if (projGrid && projects) {
    projGrid.innerHTML = projects.map((p, i) => `
      <article class="project-card${p.featured ? ' project-card--featured' : ''}" data-anim data-delay="${i+1}">
        <div class="project-card__bar">
          <span class="project-card__bar-dot"></span>
          <span class="project-card__bar-dot"></span>
          <span class="project-card__bar-dot"></span>
          ${badge(p.badge, p.badge_label)}
        </div>
        <div class="project-card__body">
          <div class="project-card__tags">${(p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('')}</div>
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
        </div>
        <div class="project-card__footer">
          ${p.link ? `<a href="${p.link}"${p.link_external?' target="_blank" rel="noopener"':''} class="project-link">${p.link_label}</a>` : ''}
          ${p.link2 ? `<a href="${p.link2}" target="_blank" rel="noopener" class="project-link">${p.link2_label}</a>` : ''}
          ${p.private_label && !p.link ? `<span class="project-link project-link--muted">${p.private_label}</span>` : ''}
          ${p.private_label && p.link ? `<span class="project-link project-link--muted">${p.private_label}</span>` : ''}
        </div>
      </article>
    `).join('');
  }

  /* --- CONTACT --- */
  renderContacts(site);

  /* re-run scroll animations on new elements */
  initAnimations();
}

/* ── render photography page ── */
async function renderPhotography() {
  let data;
  try { data = await loadContent(); }
  catch(e) { return; }

  const gallery = document.getElementById('gallery');
  if (!gallery || !data.photography?.length) return;

  gallery.innerHTML = data.photography.map(p => `
    <div class="gallery__item">
      <img src="${p.file}" alt="${p.alt}" loading="lazy">
      <div class="gallery__item__overlay">
        <span class="gallery__item__caption">${p.caption || ''}</span>
      </div>
    </div>
  `).join('');

  /* lightbox */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbClose = document.getElementById('lightboxClose');
  if (lightbox && lbImg) {
    gallery.addEventListener('click', e => {
      const img = e.target.closest('.gallery__item img');
      if (!img) return;
      lbImg.src = img.src; lbImg.alt = img.alt;
      lightbox.classList.add('is-open'); document.body.style.overflow = 'hidden';
    });
    const close = () => { lightbox.classList.remove('is-open'); document.body.style.overflow = ''; };
    lbClose?.addEventListener('click', close);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  }
}

function renderContacts(site) {
  const g = document.getElementById('contact-grid');
  if (!g || !site) return;
  const cards = [
    { href: `mailto:${site.email}`, label: 'Email', value: site.email, icon: 'email' },
    { href: site.github_url, label: 'GitHub', value: 'Tommaso-Bombelli', icon: 'github', external: true },
    { href: site.linkedin_url, label: 'LinkedIn', value: 'tommaso-bombelli', icon: 'linkedin', external: true },
    { href: site.instagram_url || '#', label: 'Instagram', value: site.instagram_url ? '@'+site.instagram_url.split('/').pop() : 'Coming soon', icon: 'instagram', disabled: !site.instagram_url, external: true },
  ];
  const icons = {
    email: `<svg viewBox="0 0 24 24" fill="none"><path d="M3 6.5L12 13l9-6.5M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    github: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.95 0-1.1.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.4 9.4 0 015 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0012 2z" stroke="currentColor" stroke-width="1.4"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 10.5v6M7.5 7.7v.01M11.5 16.5v-3.5c0-1.4 1-2.2 2.2-2.2 1.2 0 1.8.8 1.8 2.2v3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`
  };
  g.innerHTML = cards.map((c,i) => `
    <${c.disabled ? 'div' : 'a'} ${!c.disabled ? `href="${c.href}"` : ''} ${c.external && !c.disabled ? 'target="_blank" rel="noopener"' : ''}
      class="contact-card${c.disabled ? ' contact-card--disabled' : ''}" data-anim data-delay="${i+1}">
      <span class="contact-card__icon">${icons[c.icon]}</span>
      <span class="contact-card__label">${c.label}</span>
      <span class="contact-card__value">${c.value}</span>
    </${c.disabled ? 'div' : 'a'}>
  `).join('');
}

function initAnimations() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('visible'); obs.unobserve(e.target); }});
  }, {threshold:0.1});
  document.querySelectorAll('[data-anim]:not(.visible)').forEach(el => obs.observe(el));
}

/* ── auto-detect which page we're on ── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('timeline') || document.getElementById('skills-grid')) renderIndex();
  else if (document.getElementById('gallery')) renderPhotography();
});
