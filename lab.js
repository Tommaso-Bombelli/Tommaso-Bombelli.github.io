/* =========================================================
   lab.js — the living parts of the home page
   - scroll pulse on the rail
   - homelab topology with simulated traffic + log
   - tbsh: a small interactive shell
   - latest repositories from the GitHub API
========================================================= */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v = '') => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const now = () => new Date().toTimeString().slice(0, 8);
  const contentReady = fetch('content.json', { cache: 'no-cache' }).then(r => r.json()).catch(() => ({}));

  /* ---------------- rail pulse: the signal follows your scroll ---------------- */
  const board = $('.board');
  if (board && !reduce) {
    const pulse = document.createElement('span');
    pulse.className = 'pulse'; pulse.setAttribute('aria-hidden', 'true');
    board.appendChild(pulse);
    let ticking = false;
    const place = () => {
      ticking = false;
      const r = board.getBoundingClientRect();
      const y = Math.min(Math.max(window.innerHeight * 0.5 - r.top, 0), r.height);
      pulse.style.transform = `translateY(${y}px)`;
      pulse.style.opacity = y <= 0 || y >= r.height ? 0 : 1;
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(place); } }, { passive: true });
    window.addEventListener('resize', place);
    place();
  }

  /* ---------------- homelab topology ---------------- */
  const lab = $('#lab-map');
  const logEl = $('#lab-log');
  if (lab && logEl) {
    const SVGNS = 'http://www.w3.org/2000/svg';
    const SERVICES = [
      ['nginx', 'Nginx proxy'], ['grafana', 'Grafana'], ['prom', 'Prometheus'], ['alert', 'Alertmanager'],
      ['wazuh', 'Wazuh SIEM'], ['ph1', 'Pi-hole 1'], ['ph2', 'Pi-hole 2'], ['plex', 'Plex']
    ];
    const layouts = {
      wide: () => {
        const n = {
          inet: { x: 70, y: 215, w: 110, h: 40, label: 'Internet', kind: 'ext' },
          fw: { x: 235, y: 215, w: 110, h: 40, label: 'Firewall', kind: 'fw' },
          sw: { x: 400, y: 215, w: 100, h: 40, label: 'Switch' },
          lan: { x: 400, y: 375, w: 110, h: 40, label: 'LAN devices' },
          px: { x: 575, y: 215, w: 130, h: 48, label: 'Proxmox VE', kind: 'host' }
        };
        SERVICES.forEach(([id, label], i) => (n[id] = { x: 880, y: 35 + i * 52, w: 150, h: 34, label, kind: 'svc' }));
        const e = { 'inet-fw': [R(n.inet), L(n.fw)], 'fw-sw': [R(n.fw), L(n.sw)], 'sw-px': [R(n.sw), L(n.px)], 'sw-lan': [B(n.sw), T(n.lan)] };
        SERVICES.forEach(([id]) => (e['px-' + id] = [R(n.px), [745, n.px.y], [745, n[id].y], L(n[id])]));
        return { w: 1000, h: 440, n, e };
      },
      narrow: () => {
        const n = {
          inet: { x: 200, y: 30, w: 120, h: 38, label: 'Internet', kind: 'ext' },
          fw: { x: 200, y: 110, w: 120, h: 38, label: 'Firewall', kind: 'fw' },
          sw: { x: 200, y: 190, w: 110, h: 38, label: 'Switch' },
          lan: { x: 62, y: 270, w: 104, h: 38, label: 'LAN', },
          px: { x: 220, y: 270, w: 140, h: 44, label: 'Proxmox VE', kind: 'host' }
        };
        SERVICES.forEach(([id, label], i) => (n[id] = { x: i % 2 ? 268 : 92, y: 380 + Math.floor(i / 2) * 62, w: 150, h: 36, label, kind: 'svc' }));
        const e = { 'inet-fw': [B(n.inet), T(n.fw)], 'fw-sw': [B(n.fw), T(n.sw)], 'sw-px': [B(n.sw), [200, 230], [n.px.x, 230], T(n.px)], 'sw-lan': [L(n.sw), [n.lan.x, n.sw.y], T(n.lan)] };
        SERVICES.forEach(([id], i) => (e['px-' + id] = [B(n.px), [n.px.x, 322], [180, 322], [180, n[id].y], i % 2 ? L(n[id]) : R(n[id])]));
        return { w: 360, h: 600, n, e };
      }
    };
    function L(o) { return [o.x - o.w / 2, o.y]; } function R(o) { return [o.x + o.w / 2, o.y]; }
    function T(o) { return [o.x, o.y - o.h / 2]; } function B(o) { return [o.x, o.y + o.h / 2]; }

    let G, svg, packetLayer, nodeEls = {};
    const draw = () => {
      G = (lab.clientWidth < 640 ? layouts.narrow : layouts.wide)();
      lab.innerHTML = '';
      svg = document.createElementNS(SVGNS, 'svg');
      svg.setAttribute('viewBox', `0 0 ${G.w} ${G.h}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Diagram of my homelab: internet, firewall, switch and a Proxmox host running Nginx, Grafana, Prometheus, Alertmanager, Wazuh, two Pi-holes and Plex.');
      const edges = document.createElementNS(SVGNS, 'g'); edges.setAttribute('class', 'lab__edges');
      Object.values(G.e).forEach(pts => {
        const p = document.createElementNS(SVGNS, 'polyline');
        p.setAttribute('points', pts.map(q => q.join(',')).join(' '));
        edges.appendChild(p);
      });
      svg.appendChild(edges);
      packetLayer = document.createElementNS(SVGNS, 'g'); svg.appendChild(packetLayer);
      const nodes = document.createElementNS(SVGNS, 'g'); nodes.setAttribute('class', 'lab__nodes');
      nodeEls = {};
      Object.entries(G.n).forEach(([id, o]) => {
        const g = document.createElementNS(SVGNS, 'g');
        g.setAttribute('class', 'lab__node' + (o.kind ? ' lab__node--' + o.kind : ''));
        const r = document.createElementNS(SVGNS, 'rect');
        Object.entries({ x: o.x - o.w / 2, y: o.y - o.h / 2, width: o.w, height: o.h, rx: 3 }).forEach(([k, v]) => r.setAttribute(k, v));
        const t = document.createElementNS(SVGNS, 'text');
        Object.entries({ x: o.x, y: o.y + 5, 'text-anchor': 'middle' }).forEach(([k, v]) => t.setAttribute(k, v));
        t.textContent = o.label;
        g.append(r, t); nodes.appendChild(g); nodeEls[id] = g;
      });
      svg.appendChild(nodes);
      lab.appendChild(svg);
    };

    // build a polyline through a sequence of node ids, reusing edge geometry
    const route = ids => {
      const pts = [];
      for (let i = 0; i < ids.length - 1; i++) {
        const a = ids[i], b = ids[i + 1];
        let seg = G.e[`${a}-${b}`];
        if (!seg) seg = G.e[`${b}-${a}`] && [...G.e[`${b}-${a}`]].reverse();
        if (!seg) continue;
        if (!pts.length) pts.push(G.n[a] ? [G.n[a].x, G.n[a].y] : seg[0]);
        seg.forEach(p => pts.push(p));
        pts.push([G.n[b].x, G.n[b].y]);
      }
      const lens = []; let total = 0;
      for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); lens.push(d); total += d; }
      return { pts, lens, total };
    };
    const at = (r, dist) => {
      let d = dist;
      for (let i = 0; i < r.lens.length; i++) {
        if (d <= r.lens[i]) { const t = r.lens[i] ? d / r.lens[i] : 0; const a = r.pts[i], b = r.pts[i + 1]; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
        d -= r.lens[i];
      }
      return r.pts[r.pts.length - 1];
    };

    const ip = () => `${pick(['203.0.113', '198.51.100', '192.0.2'])}.${rnd(2, 254)}`;
    const FLOWS = [
      { w: 4, path: ['inet', 'fw', 'sw', 'px', 'nginx'], cls: 'ok', log: () => `nginx    GET ${pick(['/grafana/d/home', '/plex/web', '/status', '/api/health'])} 200 ${rnd(4, 38)}ms` },
      { w: 4, path: ['inet', 'fw'], cls: 'bad', log: () => `fw       drop tcp ${ip()}:${rnd(30000, 65000)} -> wan:${pick([22, 23, 3389, 445, 8080])} (${pick(['ssh scan', 'telnet probe', 'rdp scan', 'smb probe', 'port sweep'])})`, flash: 'fw' },
      { w: 3, path: ['lan', 'sw', 'px', 'ph1'], cls: 'dns', log: () => `pihole1  blocked ${pick(['telemetry', 'ads', 'track', 'metrics', 'pixel'])}.${pick(['example-ads.net', 'tracker.example', 'adserver.example.com'])}` },
      { w: 2, path: ['lan', 'sw', 'px', 'ph2'], cls: 'dns', log: () => `pihole2  query ${pick(['github.com', 'api.github.com', 'pcsumisura.net', 'home-assistant.io'])} forwarded` },
      { w: 2, path: ['prom', 'px', 'grafana'], cls: 'ok', log: () => `prom     scrape ok ${rnd(21, 23)}/23 targets in ${rnd(80, 240)}ms` },
      { w: 2, path: ['px', 'wazuh'], cls: 'warn', log: () => `wazuh    rule 5710 lvl 5 sshd invalid user '${pick(['admin', 'root', 'test', 'ubuntu', 'pi'])}' from ${ip()}` },
      { w: 1, path: ['prom', 'px', 'alert'], cls: 'warn', log: () => `alert    ${pick(['DiskUsageHigh resolved on pve', 'ContainerRestarted ct-114 (pihole2)', 'BackupJob completed 23/23'])}` },
      { w: 1, path: ['plex', 'px', 'sw', 'lan'], cls: 'ok', log: () => `plex     direct play ${pick(['1080p', '4K HDR', '720p'])} to ${pick(['living room TV', 'phone', 'laptop'])}` }
    ];
    const weighted = FLOWS.flatMap(f => Array(f.w).fill(f));

    const log = (cls, text) => {
      const li = document.createElement('li');
      li.className = 'log--' + cls;
      li.innerHTML = `<time>${now()}</time> ${esc(text)}`;
      logEl.appendChild(li);
      while (logEl.children.length > 9) logEl.firstElementChild.remove();
    };
    const flash = (id, cls) => {
      const el = nodeEls[id]; if (!el) return;
      el.classList.remove('is-hit', 'is-hit--bad'); void el.getBBox();
      el.classList.add(cls === 'bad' ? 'is-hit--bad' : 'is-hit');
    };

    const packets = [];
    const spawn = () => {
      const f = pick(weighted);
      const r = route(f.path);
      const c = document.createElementNS(SVGNS, 'circle');
      c.setAttribute('r', 5); c.setAttribute('class', 'pkt pkt--' + f.cls);
      packetLayer.appendChild(c);
      packets.push({ f, r, c, d: 0, speed: f.cls === 'bad' ? 0.32 : 0.24 });
    };

    draw();
    // seed the log so it never looks empty
    for (let i = 0; i < 6; i++) { const f = pick(weighted); log(f.cls, f.log()); }

    if (!reduce) {
      let visible = false, last = 0, nextSpawn = 0;
      new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) requestAnimationFrame(tick); }, { threshold: 0.15 }).observe(lab);
      document.addEventListener('visibilitychange', () => { if (!document.hidden && visible) requestAnimationFrame(tick); });
      function tick(t) {
        if (!visible || document.hidden) { last = 0; return; }
        const dt = last ? Math.min(t - last, 50) : 16; last = t;
        if (t > nextSpawn && packets.length < 7) { spawn(); nextSpawn = t + rnd(450, 1100); }
        for (let i = packets.length - 1; i >= 0; i--) {
          const p = packets[i];
          p.d += p.speed * dt;
          const [x, y] = at(p.r, p.d);
          p.c.setAttribute('cx', x); p.c.setAttribute('cy', y);
          if (p.d >= p.r.total) {
            p.c.remove(); packets.splice(i, 1);
            flash(p.f.flash || p.f.path[p.f.path.length - 1], p.f.cls);
            log(p.f.cls, p.f.log());
          }
        }
        requestAnimationFrame(tick);
      }
    }
    let rw; window.addEventListener('resize', () => { clearTimeout(rw); rw = setTimeout(() => { const before = G.w; draw(); if (G.w !== before) packets.splice(0).forEach(p => p.c.remove()); }, 150); });
  }

  /* ---------------- tbsh ---------------- */
  const shell = $('#shell');
  if (shell) {
    const out = $('.shell__out', shell), form = $('form', shell), input = $('input', shell);
    const start = Date.now();
    const hist = []; let hi = 0;
    let data = {};
    contentReady.then(d => (data = d || {}));
    const strip = h => String(h || '').replace(/<[^>]+>/g, '');
    const print = (html, cls = '') => { const div = document.createElement('div'); if (cls) div.className = cls; div.innerHTML = html; out.appendChild(div); out.scrollTop = out.scrollHeight; };
    const line = t => print(esc(t));
    const uptime = () => { const s = Math.floor((Date.now() - start) / 1000); return `${Math.floor(s / 60)}m ${s % 60}s`; };
    const pages = { easydomotica: 'easydomotica.html', pcsumisura: 'pcsumisura.html', game: 'game.html', photography: 'photography.html', photos: 'photography.html', github: 'https://github.com/Tommaso-Bombelli', linkedin: 'https://www.linkedin.com/in/tommaso-bombelli-204723286' };
    const files = { 'about.txt': 'about', 'skills.txt': 'skills', 'contact.txt': 'contact', 'projects/': 'projects', 'experience.log': 'experience', '.secrets': null };
    const setTheme = t => {
      if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.dataset.theme = t;
      try { t === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t); } catch (e) {}
    };

    const cmds = {
      help: () => print(`Available commands:
<span class="k">whoami</span>       who I am            <span class="k">about</span>        the short version
<span class="k">experience</span>   where I've worked   <span class="k">projects</span>     what I've built
<span class="k">skills</span>       stack and tools     <span class="k">contact</span>      how to reach me
<span class="k">ls</span>, <span class="k">cat</span>      browse files        <span class="k">open</span> &lt;page&gt;  easydomotica, pcsumisura, game, photos, github
<span class="k">ping</span>         measure this site   <span class="k">nmap</span>         scan this site
<span class="k">neofetch</span>     system info         <span class="k">theme</span>        dark, light or auto
<span class="k">history</span>      past commands       <span class="k">clear</span>        clean the screen`),
      whoami: () => line(`${data.site?.name || 'Tommaso Bombelli'}: ${(data.hero?.typewriter_phrases || []).slice(0, 4).join(', ')}`),
      about: () => (data.about?.paragraphs || []).forEach(p => line(strip(p))),
      experience: () => (data.experience || []).forEach(x => print(`<span class="k">${esc(x.period)}</span>  ${esc(x.role)}, ${esc(strip(x.org))}`)),
      projects: () => (data.projects || []).forEach(p => print(`<span class="k">${esc(p.title)}</span>  ${esc(p.desc)}`)),
      skills: () => (data.skills || []).forEach(g => print(`<span class="k">${esc(g.group.padEnd(22))}</span>${esc((g.tags || []).join(', '))}`)),
      contact: () => { const s = data.site || {}; print(`email     <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>\ngithub    <a href="${esc(s.github_url)}" target="_blank" rel="noopener">${esc(s.github_url)}</a>\nlinkedin  <a href="${esc(s.linkedin_url)}" target="_blank" rel="noopener">${esc(s.linkedin_url)}</a>`); },
      ls: a => { if (a[0] === '-a' || a[0] === '-la') line(Object.keys(files).join('   ')); else line(Object.keys(files).filter(f => !f.startsWith('.')).join('   ')); },
      cat: a => {
        const f = a[0];
        if (!f) return line('cat: which file? Try: ls');
        if (f === '.secrets') return line('cat: .secrets: Permission denied. Nice try.');
        if (f in files) return cmds[files[f]]();
        line(`cat: ${f}: No such file or directory`);
      },
      cd: a => (a[0] && a[0].replace('/', '') === 'projects' ? cmds.projects() : line('tbsh: there are no directories worth visiting. Try: open <page>')),
      open: a => {
        const k = (a[0] || '').toLowerCase().replace(/\.html$/, '');
        if (!pages[k]) return line('open: try easydomotica, pcsumisura, game, photos, github or linkedin');
        line(`opening ${pages[k]}…`);
        setTimeout(() => (/^https?:/.test(pages[k]) ? window.open(pages[k], '_blank', 'noopener') : (location.href = pages[k])), 400);
      },
      ping: async a => {
        const host = a[0] || location.hostname || 'tommasobombelli.com';
        if (a[0] && !['tommasobombelli.com', location.hostname].includes(a[0])) return line(`ping: a browser can only time requests to its own site. Try: ping`);
        line(`PING ${host}: real HTTP round trips from your browser`);
        const times = [];
        for (let i = 1; i <= 4; i++) {
          const t0 = performance.now();
          try { await fetch('content.json?ping=' + Math.random(), { cache: 'no-store' }); } catch (e) { line('request failed'); return; }
          const ms = performance.now() - t0; times.push(ms);
          line(`reply from ${host}: seq=${i} time=${ms.toFixed(1)} ms`);
        }
        line(`--- min/avg/max = ${Math.min(...times).toFixed(1)}/${(times.reduce((x, y) => x + y) / times.length).toFixed(1)}/${Math.max(...times).toFixed(1)} ms`);
      },
      nmap: async () => {
        line(`Starting scan of ${location.hostname || 'tommasobombelli.com'}…`);
        await new Promise(r => setTimeout(r, 700));
        print(`PORT     STATE     SERVICE
443/tcp  <span class="ok">open</span>      https (GitHub Pages)
80/tcp   <span class="ok">open</span>      http, redirects to 443
22/tcp   <span class="bad">filtered</span>  ssh
It's a static site: no server, no database, no admin panel online. Nothing to break here.`);
      },
      neofetch: () => print(`<span class="nf"><span class="nf-L">████████</span>  <span class="k">guest</span>@tommasobombelli.com
<span class="nf-E">████████</span>  -------------------------
<span class="nf-N">████████</span>  OS        GitHub Pages
          Shell     tbsh 1.0
          Uptime    ${uptime()} (since you arrived)
          Packages  0 frameworks, 3 files
          Homelab   Proxmox VE, 20+ LXC
          Theme     ${document.documentElement.dataset.theme || 'auto'}</span>`),
      theme: a => { const t = a[0]; if (!['dark', 'light', 'auto'].includes(t)) return line('theme: use dark, light or auto'); setTheme(t); line(`theme set to ${t}`); },
      history: () => hist.forEach((h, i) => line(`${String(i + 1).padStart(3)}  ${h}`)),
      date: () => line(new Date().toString()),
      echo: a => line(a.join(' ')),
      uptime: () => line(`up ${uptime()}, 1 user, load average: 0.00, 0.01, 0.05`),
      sudo: () => line('guest is not in the sudoers file. This incident will be reported.'),
      rm: () => line('rm: refusing to delete a static site. It would come back on the next deploy anyway.'),
      exit: () => line('There is no exit. There is only contact: type contact'),
      clear: () => (out.innerHTML = ''),
      hello: () => line('Hi! Type help to see what I can do.')
    };
    cmds.hi = cmds.hello; cmds.man = cmds.help; cmds.dir = cmds.ls; cmds.cls = cmds.clear;

    const run = async raw => {
      const v = raw.trim();
      print(`<span class="pr">guest@tb:~$</span> ${esc(v)}`, 'echo');
      if (!v) return;
      hist.push(v); hi = hist.length;
      const [c, ...args] = v.split(/\s+/);
      const fn = cmds[c.toLowerCase()];
      if (fn) await fn(args); else line(`tbsh: command not found: ${c}. Type help.`);
    };
    form.addEventListener('submit', e => { e.preventDefault(); const v = input.value; input.value = ''; run(v); });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp') { e.preventDefault(); hi = Math.max(0, hi - 1); input.value = hist[hi] || ''; }
      if (e.key === 'ArrowDown') { e.preventDefault(); hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; }
      if (e.key === 'Tab') {
        e.preventDefault();
        const m = Object.keys(cmds).filter(k => k.startsWith(input.value.trim()));
        if (m.length === 1) input.value = m[0] + ' '; else if (m.length) line(m.join('  '));
      }
      if (e.key === 'l' && e.ctrlKey) { e.preventDefault(); cmds.clear(); }
    });
    shell.querySelectorAll('[data-cmd]').forEach(b => b.addEventListener('click', () => { run(b.dataset.cmd); input.focus({ preventScroll: true }); }));
    $('.shell__out', shell).addEventListener('click', () => input.focus({ preventScroll: true }));
    line("tbsh 1.0. Type help, or tap a command below.");
  }

  /* ---------------- latest on GitHub ---------------- */
  const repos = $('#repos');
  if (repos) {
    const KEY = 'gh-repos-v1';
    const ago = iso => {
      const s = (Date.now() - new Date(iso)) / 1000;
      const u = [[31536000, 'year'], [2592000, 'month'], [86400, 'day'], [3600, 'hour'], [60, 'minute']];
      for (const [n, w] of u) if (s >= n) { const v = Math.floor(s / n); return `${v} ${w}${v > 1 ? 's' : ''} ago`; }
      return 'just now';
    };
    const render = list => {
      if (!list.length) return;
      repos.innerHTML = list.map(r => `<li>
        <a class="repo__name" href="${esc(r.html_url)}" target="_blank" rel="noopener">${esc(r.full_name)}</a>
        <p>${esc(r.description || 'No description yet.')}</p>
        <p class="repo__meta">${r.language ? `<span class="lang">${esc(r.language)}</span>` : ''}<span>Updated ${ago(r.pushed_at)}</span>${r.stargazers_count ? `<span>${r.stargazers_count} ★</span>` : ''}</p>
      </li>`).join('');
    };
    let cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(KEY)); } catch (e) {}
    if (cached) render(cached);
    else Promise.all([
      fetch('https://api.github.com/users/Tommaso-Bombelli/repos?sort=pushed&per_page=12').then(r => (r.ok ? r.json() : [])),
      fetch('https://api.github.com/repos/easydomotica/APP-HASS-Easydomotica').then(r => (r.ok ? r.json() : null))
    ]).then(([mine, hass]) => {
      const list = [...(Array.isArray(mine) ? mine : []), ...(hass && hass.full_name ? [hass] : [])]
        .filter(r => !r.fork && !r.private)
        .sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at))
        .slice(0, 5);
      try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
      render(list);
    }).catch(() => {});
  }
})();
