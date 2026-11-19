/* kspace. — macOS shell: themes, menubar, windows (close / genie minimize / zoom), dock */
(function () {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  /* ---------------- Icons ---------------- */
  const P = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    home: `<svg viewBox="0 0 24 24" ${P}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>`,
    about: `<svg viewBox="0 0 24 24" ${P}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
    projects: `<svg viewBox="0 0 24 24" ${P}><path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
    paper: `<svg viewBox="0 0 24 24" ${P}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>`,
    blog: `<svg viewBox="0 0 24 24" ${P}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>`,
    code: `<svg viewBox="0 0 24 24" ${P}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>`,
    image: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`,
    terminal: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9l3 3-3 3M13 15h4"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" ${P}><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`,
    instagram: `<svg viewBox="0 0 24 24" ${P}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
    github: `<svg viewBox="0 0 24 24" ${P}><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>`,
    linkedin: `<span style="font:800 17px Raleway,sans-serif">in</span>`,
    x: `<span style="font-size:17px">𝕏</span>`,
    editor: `<svg viewBox="0 0 24 24" ${P}><path d="M4 4h16v16H4z"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>`,
    sun: `<svg width="15" height="15" viewBox="0 0 24 24" ${P}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>`,
    wifi: `<svg width="15" height="15" viewBox="0 0 24 24" ${P}><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></svg>`
  };
  const icon = name => ICONS[name] || ICONS.projects;

  /* ---------------- Theme ---------------- */
  const THEMES = [['dark', 'Dark'], ['light', 'Light']];
  function setTheme(t) {
    t = t === 'light' ? 'light' : 'dark';
    root.setAttribute('data-theme', t);
    store.set('theme', t);
    document.querySelectorAll('[data-theme-opt]').forEach(b => {
      b.querySelector('.check').textContent = b.dataset.themeOpt === t ? '✓' : '';
    });
  }
  if (!root.getAttribute('data-theme')) root.setAttribute('data-theme', store.get('theme') === 'light' ? 'light' : 'dark');
  if (window.chrome && CSS.supports('backdrop-filter', 'blur(1px)')) root.classList.add('refract');

  /* ---------------- Page chrome (wallpaper, svg filter) ---------------- */
  function injectChrome() {
    const wall = document.createElement('div');
    wall.className = 'wallpaper';
    wall.setAttribute('aria-hidden', 'true');
    wall.innerHTML = '<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>';
    document.body.prepend(wall);
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('aria-hidden', 'true');
    svg.style.position = 'absolute';
    svg.innerHTML = `<filter id="lg-refract" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="2" seed="11" result="noise"/>
        <feGaussianBlur in="noise" stdDeviation="3" result="soft"/>
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="38" xChannelSelector="R" yChannelSelector="G"/>
      </filter>`;
    document.body.appendChild(svg);
  }

  /* ---------------- Menubar ---------------- */
  function buildMenubar() {
    const bar = document.querySelector('.menubar');
    if (!bar) return;
    const links = (bar.dataset.links || '').split(',').filter(Boolean).map(s => s.split('|'));
    const brandHref = bar.dataset.brand || 'index.html#top';
    bar.innerHTML = `
      <div class="left">
        <a class="brand" href="${brandHref}">kspace<span>.</span></a>
        ${links.map(([label, href]) => `<a class="nav-link" href="${href}">${label}</a>`).join('')}
        <div class="menu-wrap">
          <button class="menu-btn" aria-haspopup="true" aria-expanded="false" id="window-menu-btn">Window</button>
          <div class="menu" role="menu" id="window-menu"></div>
        </div>
      </div>
      <div class="right">
        <div class="menu-wrap">
          <button class="menu-btn" aria-haspopup="true" aria-expanded="false" aria-label="Appearance" title="Appearance">${ICONS.sun}</button>
          <div class="menu right-align" role="menu">
            ${THEMES.map(([k, l]) => `<button role="menuitemradio" data-theme-opt="${k}"><span class="check"></span>${l}</button>`).join('')}
          </div>
        </div>
        <span class="hide-sm" aria-hidden="true" style="display:grid">${ICONS.wifi}</span>
        <span id="clock"></span>
      </div>`;
    bar.querySelectorAll('[data-theme-opt]').forEach(b => b.addEventListener('click', () => { setTheme(b.dataset.themeOpt); closeMenus(); }));
    setTheme(root.getAttribute('data-theme'));

    bar.querySelectorAll('.menu-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = btn.getAttribute('aria-expanded') === 'true';
        closeMenus();
        if (!open) {
          if (btn.id === 'window-menu-btn') renderWindowMenu();
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
    document.addEventListener('click', closeMenus);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenus(); });

    const clock = document.getElementById('clock');
    const tick = () => {
      const d = new Date();
      clock.textContent = d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + '  ' +
        d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    tick(); setInterval(tick, 15000);
  }
  function closeMenus() { document.querySelectorAll('.menu-btn[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }

  function renderWindowMenu() {
    const menu = document.getElementById('window-menu');
    const wins = [...document.querySelectorAll('.win[data-win]')];
    const label = w => w.dataset.state === 'min' ? 'Minimized' : w.dataset.state === 'closed' ? 'Closed' : '';
    menu.innerHTML = (wins.length ? wins.map(w =>
      `<button role="menuitem" data-show="${w.dataset.win}"><span class="check">${w.dataset.state === 'open' ? '•' : ''}</span>${w.dataset.title || w.dataset.win}<span class="state">${label(w)}</span></button>`).join('') : '') +
      `<hr><button role="menuitem" data-restore-all><span class="check"></span>Restore all windows</button>`;
    menu.querySelectorAll('[data-show]').forEach(b => b.addEventListener('click', () => { closeMenus(); WM.show(byId(b.dataset.show), true); }));
    menu.querySelector('[data-restore-all]').addEventListener('click', () => { closeMenus(); WM.restoreAll(); });
  }

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(html, ms = 3200) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast glass'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.innerHTML = html;
    requestAnimationFrame(() => t.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), ms);
  }

  /* ---------------- Genie effect ----------------
     The window is cut into thin horizontal strips that share their edges.
     A funnel forms toward the dock tile, then the strips slide down into it.
     Each strip is a trapezoid (clip-path), so the outline stays continuous. */
  function genie(win, from, to, reverse) {
    if (reduceMotion) return Promise.resolve();
    const N = 28, D = 640;
    const vh = innerHeight;
    // Only animate the visible part of tall windows
    const vTop = Math.max(from.top, 0), vBot = Math.min(from.bottom, vh);
    if (vBot - vTop < 8) return Promise.resolve();
    const y0 = vTop - from.top, hv = vBot - vTop, w = from.width;

    const layer = document.createElement('div');
    layer.className = 'genie-layer';
    layer.setAttribute('aria-hidden', 'true');
    Object.assign(layer.style, { left: from.left + 'px', top: from.top + 'px', width: w + 'px', height: from.height + 'px' });

    const base = win.cloneNode(true);
    base.removeAttribute('id');
    base.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    base.classList.remove('zoomed', 'draggable');
    Object.assign(base.style, {
      width: w + 'px', height: from.height + 'px', transform: 'none', visibility: 'visible', transformOrigin: '0 0',
      backdropFilter: 'none', webkitBackdropFilter: 'none', background: 'var(--win-solid)', boxShadow: 'none', zIndex: 'auto'
    });
    const strips = [];
    for (let i = 0; i < N; i++) { const s = base.cloneNode(true); layer.appendChild(s); strips.push(s); }
    document.body.appendChild(layer);

    const clamp = v => Math.max(0, Math.min(1, v));
    const easeOut = v => 1 - Math.pow(1 - v, 3);
    const easeIn = v => v * v * v;
    const tcx = to.top + to.height / 2;
    const funnelSpan = Math.max(tcx - vTop, 1);
    const fx = y => { const v = clamp((y - vTop) / funnelSpan); return v * v * (3 - 2 * v); }; // smoothstep

    function frame(t) {
      const A = easeOut(clamp(t / 0.4));                 // funnel forms
      const Y = [];
      for (let k = 0; k <= N; k++) {
        const s = k / N;
        const p = easeIn(clamp((t - 0.15 - (1 - s) * 0.35) / 0.5)); // bottom leads
        Y.push((vTop + s * hv) + ((to.top + s * to.height) - (vTop + s * hv)) * p);
      }
      const edge = y => {
        const f = A * fx(y);
        return [from.left + (to.left - from.left) * f, from.right + (to.right - from.right) * f];
      };
      for (let i = 0; i < N; i++) {
        const yt = Y[i], yb = Y[i + 1];
        const [lt, rt] = edge(yt), [lb, rb] = edge(yb);
        const L = Math.min(lt, lb), R = Math.max(rt, rb);
        const sx = Math.max((R - L) / w, 0.001);
        const band = hv / N, ly = y0 + i * band;
        const sy = Math.max((yb - yt) / band, 0.001);
        const st = strips[i].style;
        st.transform = `translate(${L - from.left}px, ${yt - from.top - ly * sy}px) scale(${sx}, ${sy})`;
        const px = x => ((x - L) / sx).toFixed(2) + 'px';
        st.clipPath = `polygon(${px(lt)} ${ly}px, ${px(rt)} ${ly}px, ${px(rb)} ${ly + band + 0.6}px, ${px(lb)} ${ly + band + 0.6}px)`;
      }
    }
    return new Promise(resolve => {
      const start = performance.now();
      frame(reverse ? 1 : 0);
      function step(now) {
        const k = Math.min((now - start) / D, 1);
        frame(reverse ? 1 - k : k);
        if (k < 1) requestAnimationFrame(step); else { layer.remove(); resolve(); }
      }
      requestAnimationFrame(step);
    });
  }

  /* ---------------- Window manager ---------------- */
  const byId = id => document.querySelector(`.win[data-win="${id}"]`);
  const hostOf = win => win.closest('[data-win-host]') || win;
  let zTop = 30;

  const WM = {
    init() {
      document.querySelectorAll('.win[data-win]').forEach(win => {
        win.dataset.state = 'open';
        const bar = win.querySelector('.win-bar');
        if (bar && !bar.querySelector('.lights')) {
          const L = document.createElement('div');
          L.className = 'lights';
          L.innerHTML = `<button class="light close" data-glyph="×" aria-label="Close ${win.dataset.title || 'window'}"></button>` +
            `<button class="light min" data-glyph="−" aria-label="Minimize ${win.dataset.title || 'window'}"></button>` +
            `<button class="light zoom" data-glyph="+" aria-label="Zoom ${win.dataset.title || 'window'}"></button>`;
          bar.prepend(L);
          L.querySelector('.close').addEventListener('click', e => { e.stopPropagation(); WM.close(win); });
          L.querySelector('.min').addEventListener('click', e => { e.stopPropagation(); WM.minimize(win); });
          L.querySelector('.zoom').addEventListener('click', e => { e.stopPropagation(); WM.toggleZoom(win); });
          bar.addEventListener('dblclick', e => { if (!e.target.closest('.lights')) WM.toggleZoom(win); });
        }
        if (win.classList.contains('draggable')) makeDraggable(win);
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { const z = document.querySelector('.win.zoomed'); if (z) WM.toggleZoom(z); }
      });
      syncDock();
    },

    async minimize(win) {
      if (win.dataset.state !== 'open' || win.dataset.busy) return;
      win.dataset.busy = '1';
      if (win.classList.contains('zoomed')) WM.toggleZoom(win, true);
      const from = win.getBoundingClientRect();
      const tile = Dock.addTile(win);
      await new Promise(r => requestAnimationFrame(r));
      const to = tile.getBoundingClientRect();
      win.style.visibility = 'hidden';
      await genie(win, from, to, false);
      hostOf(win).hidden = true;
      win.style.visibility = '';
      tile.classList.remove('entering');
      win.dataset.state = 'min';
      delete win.dataset.busy;
      syncDock();
    },

    async restore(win, scroll) {
      if (win.dataset.state !== 'min' || win.dataset.busy) return;
      win.dataset.busy = '1';
      const tile = Dock.tileFor(win);
      const to = tile ? tile.getBoundingClientRect() : null;
      const host = hostOf(win);
      host.hidden = false;
      win.style.visibility = 'hidden';
      if (scroll && host !== win) host.scrollIntoView({ block: 'start', behavior: 'instant' });
      const from = win.getBoundingClientRect();
      if (to) await genie(win, from, to, true);
      win.style.visibility = '';
      if (tile) Dock.removeTile(tile);
      win.dataset.state = 'open';
      delete win.dataset.busy;
      syncDock();
    },

    async close(win) {
      if (win.dataset.state !== 'open' || win.dataset.busy) return;
      win.dataset.busy = '1';
      if (win.classList.contains('zoomed')) WM.toggleZoom(win, true);
      if (!reduceMotion) await win.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.9 }], { duration: 180, easing: 'ease-in' }).finished;
      hostOf(win).hidden = true;
      win.dataset.state = 'closed';
      delete win.dataset.busy;
      syncDock();
    },

    async open(win, scroll) {
      if (win.dataset.state !== 'closed') return;
      const host = hostOf(win);
      host.hidden = false;
      win.dataset.state = 'open';
      if (scroll && host !== win) host.scrollIntoView({ block: 'start', behavior: 'smooth' });
      if (!reduceMotion) win.animate([{ opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      syncDock();
    },

    // Bring a window back whatever its state, and optionally scroll to it.
    async show(win, scroll) {
      if (!win) return;
      const dockIcon = document.querySelector(`.dock-item[data-target="${win.dataset.win}"]`);
      if (win.dataset.state === 'min') await WM.restore(win, scroll);
      else if (win.dataset.state === 'closed') {
        if (dockIcon && !reduceMotion) { dockIcon.classList.remove('bounce'); void dockIcon.offsetWidth; dockIcon.classList.add('bounce'); }
        await WM.open(win, scroll);
      } else if (scroll) {
        const host = hostOf(win);
        if (host !== win) host.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
      WM.focus(win);
    },

    restoreAll() {
      document.querySelectorAll('.win[data-win]').forEach(w => {
        if (w.dataset.state === 'min') WM.restore(w);
        else if (w.dataset.state === 'closed') WM.open(w);
        w.style.setProperty('--dx', '0px'); w.style.setProperty('--dy', '0px');
      });
    },

    focus(win) { if (win.classList.contains('draggable')) win.style.zIndex = ++zTop; },

    toggleZoom(win, instant) {
      const first = win.getBoundingClientRect();
      if (win.classList.contains('zoomed')) {
        win.classList.remove('zoomed');
        win._ph && win._ph.remove(); win._ph = null;
        win._bd && win._bd.remove(); win._bd = null;
        document.body.style.overflow = '';
      } else {
        if (getComputedStyle(win).position === 'static' || getComputedStyle(win).position === 'relative') {
          const ph = document.createElement('div');
          ph.style.height = first.height + 'px';
          ph.className = 'win-placeholder';
          win.after(ph); win._ph = ph;
        }
        const bd = document.createElement('div');
        bd.className = 'zoom-backdrop';
        bd.addEventListener('click', () => WM.toggleZoom(win));
        document.body.appendChild(bd); win._bd = bd;
        win.classList.add('zoomed');
        document.body.style.overflow = 'hidden';
      }
      if (instant || reduceMotion) return;
      const last = win.getBoundingClientRect();
      const sx = first.width / last.width, sy = first.height / last.height;
      win.animate([
        { transformOrigin: 'top left', transform: `translate(${first.left - last.left}px, ${first.top - last.top}px) scale(${sx}, ${sy})` },
        { transformOrigin: 'top left', transform: 'none' }
      ], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
  };

  function makeDraggable(win) {
    const bar = win.querySelector('.win-bar');
    let drag = null;
    win.addEventListener('pointerdown', () => WM.focus(win));
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('.lights') || win.classList.contains('zoomed') || innerWidth <= 860) return;
      const dx = parseFloat(win.style.getPropertyValue('--dx')) || 0;
      const dy = parseFloat(win.style.getPropertyValue('--dy')) || 0;
      drag = { x: e.clientX - dx, y: e.clientY - dy };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (!drag) return;
      win.style.setProperty('--dx', (e.clientX - drag.x) + 'px');
      win.style.setProperty('--dy', (e.clientY - drag.y) + 'px');
    });
    const end = () => { drag = null; };
    bar.addEventListener('pointerup', end);
    bar.addEventListener('pointercancel', end);
  }

  /* ---------------- Dock ---------------- */
  const Dock = {
    el: null, minWrap: null, minSep: null,
    init() {
      this.el = document.querySelector('.dock');
      if (!this.el) return;
      this.el.querySelectorAll('.dock-item[data-icon]').forEach(it => {
        if (!it.querySelector('svg, span:not(.tip)')) it.insertAdjacentHTML('beforeend', icon(it.dataset.icon));
      });
      this.minSep = document.createElement('span');
      this.minSep.className = 'sep'; this.minSep.hidden = true;
      this.minWrap = document.createElement('div');
      this.minWrap.className = 'dock-min';
      this.el.append(this.minSep, this.minWrap);

      this.el.querySelectorAll('.dock-item[data-target]').forEach(it => {
        it.addEventListener('click', e => {
          const win = byId(it.dataset.target);
          if (!win) return; // let normal links work
          e.preventDefault();
          WM.show(win, true);
        });
      });
      this.magnify();
    },
    addTile(win) {
      const t = document.createElement('button');
      t.className = 'dock-item min-tile entering';
      t.dataset.for = win.dataset.win;
      t.setAttribute('aria-label', `Restore ${win.dataset.title || 'window'}`);
      t.innerHTML = `<span class="mini">${icon(win.dataset.icon)}</span><span class="tip">${win.dataset.title || ''}</span>`;
      t.addEventListener('click', () => WM.show(win, true));
      this.minWrap.appendChild(t);
      this.minSep.hidden = false;
      return t;
    },
    tileFor(win) { return this.minWrap && this.minWrap.querySelector(`[data-for="${win.dataset.win}"]`); },
    removeTile(t) {
      t.remove();
      this.minSep.hidden = !this.minWrap.children.length;
    },
    magnify() {
      if (reduceMotion || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const dock = this.el;
      dock.addEventListener('pointermove', e => {
        dock.querySelectorAll('.dock-item').forEach(it => {
          if (getComputedStyle(it).display === 'none') return;
          const r = it.getBoundingClientRect();
          const d = Math.abs(e.clientX - (r.left + r.width / 2));
          const base = parseFloat(getComputedStyle(dock).getPropertyValue('--base')) || (innerWidth <= 700 ? 42 : 48);
          const s = 1 + 0.55 * Math.exp(-(d * d) / (2 * 55 * 55));
          it.style.width = it.style.height = (base * s).toFixed(1) + 'px';
        });
      });
      dock.addEventListener('pointerleave', () => dock.querySelectorAll('.dock-item').forEach(it => { it.style.width = it.style.height = ''; }));
    }
  };

  function syncDock() {
    document.querySelectorAll('.dock-item[data-target]').forEach(it => {
      const w = byId(it.dataset.target);
      it.classList.toggle('running', !!w && w.dataset.state === 'open');
    });
  }

  /* ---------------- Boot ---------------- */
  function boot() {
    injectChrome();
    buildMenubar();
    Dock.init();
    WM.init();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.KS = { WM, Dock, toast, icon, store, setTheme };
})();
