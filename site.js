/* =========================================================
   site.js — nav + renders content.json (edited from admin.html)
========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isExternal = url => /^https?:\/\//.test(url || '');
  const linkAttrs = url => isExternal(url) ? ' target="_blank" rel="noopener"' : '';
  // labels from the admin may still carry old arrows/emoji; keep the text, drop the ornaments
  const clean = (v = '') => String(v).replace(/\s*[→↗]\s*$/u, '').replace(/^\p{Extended_Pictographic}️?\s*/u, '').trim();

  /* ---------- nav ---------- */
  const nav = $('.nav');
  if (nav) {
    const toggle = $('.nav__toggle', nav);
    toggle?.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'Close' : 'Menu';
    });
    $$('.nav__links a', nav).forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.textContent = 'Menu'; }
    }));
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

    // highlight in-page section links
    const inPage = $$('.nav__links a[href^="#"]', nav);
    if (inPage.length && 'IntersectionObserver' in window) {
      const map = new Map(inPage.map(a => [a.getAttribute('href').slice(1), a]));
      const io = new IntersectionObserver(entries => entries.forEach(e => {
        if (!e.isIntersecting) return;
        if (window.scrollY < 200) { inPage.forEach(a => a.classList.remove('is-active')); return; }
        inPage.forEach(a => a.classList.remove('is-active'));
        map.get(e.target.id)?.classList.add('is-active');
      }), { rootMargin: '-45% 0px -50% 0px' });
      map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    }
  }
  $$('.js-year').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- content ---------- */
  const load = () => fetch('content.json', { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });

  const renderIndex = data => {
    const { site = {}, hero = {}, about = {}, experience = [], skills = [], projects = [], photography = [] } = data;

    // hero: three conductors, three roles
    const roles = hero.typewriter_phrases || [];
    $$('[data-role]').forEach((el, i) => {
      if (!roles[i] || roles[i] === el.firstChild.textContent.trim()) return;
      el.textContent = roles[i]; // phrase changed in admin: drop the hard-coded sub-label
    });
    if (hero.tagline) $('#tagline').textContent = hero.tagline;
    if (site.location) $$('.js-location').forEach(el => (el.textContent = site.location.replace(/\s+Italy$/i, ', Italy')));

    // about
    const aboutText = $('#about-text');
    if (aboutText && about.paragraphs) {
      aboutText.innerHTML = about.paragraphs.map(p => `<p>${p}</p>`).join('');
    }
    const facts = $('#about-facts');
    if (facts && about.stats) {
      facts.innerHTML = about.stats.map(s => `<li><b>${esc(s.num)}</b><span>${esc(s.label)}</span></li>`).join('');
    }

    // experience
    const tl = $('#timeline');
    if (tl) tl.innerHTML = experience.map(x => {
      const [from, to] = String(x.period || '').split(/\s*[—–-]\s*/);
      return `<li class="job${x.active ? ' is-active' : ''}">
        <p class="job__when">${to ? `<b>${esc(to)}</b>since ${esc(from)}` : `<b>${esc(from)}</b>`}</p>
        <div>
          <h3>${esc(x.role)}</h3>
          <p class="job__org">${esc(x.org)}</p>
          <p>${esc(x.desc)}</p>
          ${x.link ? `<p style="margin-top:10px"><a class="link" href="${esc(x.link)}"${linkAttrs(x.link)}>Read the full story</a></p>` : ''}
        </div>
      </li>`;
    }).join('');

    // projects
    const pg = $('#projects-list');
    if (pg) pg.innerHTML = projects.map(p => {
      const wip = p.badge === 'wip';
      const links = [
        p.link && `<a class="link" href="${esc(p.link)}"${linkAttrs(p.link)}>${esc(clean(p.link_label) || 'Details')}</a>`,
        p.link2 && `<a class="link" href="${esc(p.link2)}"${linkAttrs(p.link2)}>${esc(clean(p.link2_label) || 'More')}</a>`,
        p.private_label && `<span class="proj__private">${esc(clean(p.private_label))}</span>`
      ].filter(Boolean).join('');
      return `<article class="proj${p.featured ? ' proj--featured' : ''}">
        <div>
          <h3>${esc(p.title)}</h3>
          <p class="proj__meta"><span class="status${wip ? ' status--wip' : ''}">${esc(p.badge_label || (wip ? 'In development' : 'Live'))}</span><span>${(p.tags || []).map(esc).join(', ')}</span></p>
        </div>
        <p class="proj__desc">${esc(p.desc)}</p>
        ${links ? `<div class="proj__links">${links}</div>` : ''}
      </article>`;
    }).join('');

    // skills
    const sk = $('#skills-list');
    if (sk) sk.innerHTML = skills.map(g => `<div class="skill"><dt>${esc(g.group)}</dt><dd>${(g.tags || []).map(esc).join(', ')}${g.note ? `<em>${esc(g.note.replace(/^\/\/\s*/, ''))}</em>` : ''}</dd></div>`).join('');

    // photo strip
    const strip = $('#photo-strip');
    if (strip) {
      if (photography.length) {
        strip.innerHTML = photography.slice(0, 3).map(ph => `<figure><a href="photography.html"><img src="${esc(ph.file)}" alt="${esc(ph.alt)}" loading="lazy"></a>${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}</figure>`).join('');
      } else strip.remove();
    }

    // contact
    if (site.email) $$('.js-email').forEach(a => { a.href = 'mailto:' + site.email; if (a.classList.contains('contact__mail')) a.textContent = site.email; });
    const cl = $('#contact-list');
    if (cl) {
      const items = [
        site.github_url && ['GitHub', site.github_url, site.github_url.split('/').filter(Boolean).pop()],
        site.linkedin_url && ['LinkedIn', site.linkedin_url, 'tommaso-bombelli'],
        site.instagram_url && ['Instagram', site.instagram_url, '@' + site.instagram_url.split('/').filter(Boolean).pop()]
      ].filter(Boolean);
      cl.innerHTML = items.map(([k, href, v]) => `<li><span>${k}</span><a class="link" href="${esc(href)}" target="_blank" rel="noopener">${esc(v)}</a></li>`).join('');
    }
  };

  const renderGallery = data => {
    const g = $('#gallery');
    const photos = data.photography || [];
    if (!photos.length) { g.innerHTML = '<p class="empty">No photos yet. New shots are added from the admin panel.</p>'; return; }
    g.innerHTML = photos.map((ph, i) => `<figure>
      <button type="button" data-i="${i}" aria-label="Open ${esc(ph.caption || ph.alt || 'photo')} full screen"><img src="${esc(ph.file)}" alt="${esc(ph.alt)}" loading="lazy"></button>
      ${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}
    </figure>`).join('');

    const lb = $('#lightbox'), img = $('img', lb), cap = $('p', lb), close = $('.lightbox__close', lb);
    let last = null, idx = 0;
    const show = i => { idx = (i + photos.length) % photos.length; img.src = photos[idx].file; img.alt = photos[idx].alt || ''; cap.textContent = photos[idx].caption || ''; };
    const open = (i, btn) => { last = btn; show(i); lb.classList.add('is-open'); document.body.style.overflow = 'hidden'; close.focus(); };
    const shut = () => { lb.classList.remove('is-open'); document.body.style.overflow = ''; last?.focus(); };
    g.addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) open(+b.dataset.i, b); });
    close.addEventListener('click', shut);
    lb.addEventListener('click', e => { if (e.target === lb) shut(); });
    document.addEventListener('keydown', e => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') shut();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  };

  const page = document.body.dataset.page;
  if (page === 'home' || page === 'photography') {
    load().then(d => (page === 'home' ? renderIndex(d) : renderGallery(d))).catch(() => {
      const g = $('#gallery');
      if (g) g.innerHTML = '<p class="empty">The gallery could not be loaded. Refresh the page to try again.</p>';
    });
  }
})();
