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

  /* ---------- pages: each one opens over the world, and has its own address ---------- */
  const pages = $$('.page');
  pages.forEach(p => {
    const inner = document.createElement('div');
    inner.className = 'page__inner';
    while (p.firstChild) inner.appendChild(p.firstChild);
    const close = document.createElement('a');
    close.className = 'page__close'; close.href = '#top'; close.textContent = 'Back to the line';
    close.addEventListener('click', e => { e.preventDefault(); leave(); });
    const scroll = document.createElement('div');
    scroll.className = 'page__scroll'; scroll.setAttribute('tabindex', '-1');
    scroll.appendChild(inner);
    p.append(scroll, close);
  });
  let openPage = null, backTo = null;
  /* closing keeps you at the stop you were on */
  const leave = () => { history.pushState(null, '', location.pathname + location.search); route(); };
  const route = () => {
    const id = location.hash.slice(1);
    const target = id && document.getElementById(id);
    const page = target ? target.closest('.page') : null;
    if (page === openPage) return;
    if (openPage) openPage.classList.remove('is-open');
    document.documentElement.classList.toggle('has-page', !!page);
    if (page) {
      if (!openPage) backTo = document.activeElement;
      page.classList.add('is-open');
      const sc = $('.page__scroll', page);
      sc.scrollTop = 0;
      if (target !== page) requestAnimationFrame(() => target.scrollIntoView());
      sc.focus({ preventScroll: true });
    } else if (openPage) backTo?.focus?.({ preventScroll: true });
    openPage = page;
    window.dispatchEvent(new CustomEvent('page-change', { detail: { open: !!page, id: page ? page.id : null } }));
  };
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !openPage || $('#lightbox')?.classList.contains('is-open')) return;
    leave();
  });
  route();
  window.addEventListener('world-ready', () => { if (openPage) window.dispatchEvent(new CustomEvent('page-change', { detail: { open: true, id: openPage.id } })); });

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
  }
  $$('.js-year').forEach(el => (el.textContent = new Date().getFullYear()));

  /* ---------- content ---------- */
  const load = () => fetch('content.json', { cache: 'no-cache' }).then(r => {
    if (!r.ok) throw new Error(r.status);
    return r.json();
  });

  /* a picture for each project. The ERP and the game are private, so theirs are drawings, and they say so */
  const PREVIEWS = {
    erp: ['assets/preview-erp.svg', 'Drawing of a quote screen in the ERP, with sample data'],
    hass: ['assets/preview-hass.svg', 'Excerpt of the Home Assistant integration source code'],
    datacenter: ['assets/preview-lab.svg', 'Simplified map of the homelab'],
    game: ['assets/preview-game.svg', 'Drawing of a Blueprints graph in Unreal Engine 5'],
    portfolio: ['assets/preview-site.jpg', 'This site: the first stop of the ride']
  };

  const renderIndex = data => {
    const { site = {}, hero = {}, about = {}, experience = [], skills = [], projects = [], photography = [] } = data;

    // hero: one tile per phrase, data-role is its place in the list
    const roles = hero.typewriter_phrases || [];
    $$('[data-role]').forEach(el => {
      const i = +el.dataset.role;
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
        <p class="job__when">${to && /present|oggi|now/i.test(to) ? `<b>${esc(to)}</b>since ${esc(from)}` : to ? `<b>${esc(from)} – ${esc(to)}</b>` : `<b>${esc(from)}</b>`}</p>
        <div>
          <h3>${esc(x.role)}</h3>
          <p class="job__org">${esc(x.org)}</p>
          <p>${esc(x.desc)}</p>
          ${x.link ? `<p style="margin-top:10px"><a class="link" href="${esc(x.link)}"${linkAttrs(x.link)}>${x.link.startsWith('#') ? 'More below' : 'Read the full story'}</a></p>` : ''}
        </div>
      </li>`;
    }).join('');

    // certifications
    const cl2 = $('#certs-list');
    if (cl2) {
      const certs = data.certifications || [];
      if (!certs.length) { $('#certifications')?.remove(); $('#cv')?.classList.add('duo--single'); }
      else cl2.innerHTML = certs.map(c => {
        const href = c.file || c.url;
        return `<li class="cert${c.in_progress ? ' cert--wip' : ''}">
          <h3>${esc(c.title)}</h3>
          <p class="cert__meta">${[c.issuer, c.date].filter(Boolean).map(esc).join(', ')}${c.in_progress ? ' <span class="status status--wip">In progress</span>' : ''}</p>
          ${c.credential_id ? `<p class="cert__id">ID ${esc(c.credential_id)}</p>` : ''}
          ${href ? `<a class="link" href="${esc(href)}" target="_blank" rel="noopener">${c.file ? 'View certificate' : 'Verify'}</a>` : ''}
        </li>`;
      }).join('');
    }

    // projects
    const pg = $('#projects-list');
    if (pg) pg.innerHTML = projects.map(p => {
      const wip = p.badge === 'wip';
      const links = [
        p.link && `<a class="link" href="${esc(p.link)}"${linkAttrs(p.link)}>${esc(clean(p.link_label) || 'Details')}</a>`,
        p.link2 && `<a class="link" href="${esc(p.link2)}"${linkAttrs(p.link2)}>${esc(clean(p.link2_label) || 'More')}</a>`,
        p.private_label && `<span class="proj__private">${esc(clean(p.private_label))}</span>`
      ].filter(Boolean).join('');
      const pic = PREVIEWS[p.id];
      return `<article class="proj">
        ${pic ? `<div class="proj__pic"><img src="${pic[0]}" alt="${esc(pic[1])}" loading="lazy"></div>` : ''}
        <h3>${esc(p.title)}</h3>
        <div class="proj__body">
          <p class="proj__desc">${esc(p.desc)}</p>
          <p class="proj__tags">${(p.tags || []).map(esc).join(', ')}</p>
          ${links ? `<div class="proj__links">${links}</div>` : ''}
        </div>
        <p class="proj__state${wip ? ' is-wip' : ''}"><i></i>${esc(p.badge_label || (wip ? 'In development' : 'Live'))}</p>
      </article>`;
    }).join('');

    // skills
    const sk = $('#skills-list');
    if (sk) sk.innerHTML = skills.map(g => `<div class="skill"><dt>${esc(g.group)}</dt><dd>${(g.tags || []).map(esc).join(', ')}${g.note ? `<em>${esc(g.note.replace(/^\/\/\s*/, ''))}</em>` : ''}</dd></div>`).join('');

    // photo strip
    const strip = $('#photo-strip');
    if (strip) {
      if (photography.length) {
        strip.innerHTML = photography.slice(0, 3).map(ph => `<figure><a href="photography.html"><img src="${esc(ph.thumb || ph.file)}" alt="${esc(ph.alt)}" loading="lazy"></a>${ph.caption ? `<figcaption>${esc(ph.caption)}</figcaption>` : ''}</figure>`).join('');
      } else strip.remove();
    }

    // contact
    if (site.email) $$('.js-email').forEach(a => { a.href = 'mailto:' + site.email; if (a.classList.contains('contact__mail')) a.innerHTML = esc(site.email).replace('@', '<wbr>@'); });
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
    g.innerHTML = photos.map((ph, i) => `<figure${ph.width ? ` style="flex-grow:${(+ph.width / +ph.height).toFixed(3)}"` : ''}>
      <button type="button" data-i="${i}" aria-label="Open ${esc(ph.caption || ph.alt || 'photo')} full screen"><img src="${esc(ph.thumb || ph.file)}" alt="${esc(ph.alt)}" loading="lazy"${ph.width ? ` width="${+ph.width}" height="${+ph.height}"` : ''}></button>
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

  /* ---------- letters settle out of code, on the titles and on the buttons ---------- */
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const GLYPHS = '01<>/{}[]=_#$%';
  const scramble = (el, ms = 620) => {
    if (calm || !el) return;
    const text = el.dataset.text ??= el.textContent;
    if (el.children.length) return;
    el.setAttribute('aria-label', text);
    cancelAnimationFrame(el._raf);
    const t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / ms, 1), done = Math.floor(p * text.length);
      el.textContent = text.split('').map((c, i) => (i < done || c === ' ' ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)])).join('');
      if (p < 1) el._raf = requestAnimationFrame(step); else el.textContent = text;
    };
    el._raf = requestAnimationFrame(step);
  };
  window.addEventListener('stop-change', e => scramble($$('.stop')[e.detail.stop]?.querySelector('.stop__title'), 800));
  if (matchMedia('(hover: hover)').matches) {
    $$('.btn, .line a span').forEach(b => b.addEventListener('pointerenter', () => scramble(b, 340)));
    /* the cursor is a small ring that lags behind, and opens over anything you can press */
    const cur = $('.cursor');
    if (cur && !calm) {
      let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, on = false;
      window.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.add('is-on'); cur.classList.toggle('is-over', !!e.target.closest?.('a, button, input, summary')); if (!on) { on = true; cx = x; cy = y; } }, { passive: true });
      const follow = () => { cx += (x - cx) * .22; cy += (y - cy) * .22; cur.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px)`; requestAnimationFrame(follow); };
      follow();
    }
  }

  const page = document.body.dataset.page;
  if (page === 'home' || page === 'photography') {
    load().then(d => { if (page === 'home') renderIndex(d); renderGallery(d); }).catch(() => {
      const g = $('#gallery');
      if (g) g.innerHTML = '<p class="empty">The gallery could not be loaded. Refresh the page to try again.</p>';
    });
  }
})();
