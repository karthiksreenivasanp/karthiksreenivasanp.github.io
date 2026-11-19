/* kspace. — reads published posts (posts/index.json + posts/<slug>.json) */
(function () {
  'use strict';
  const SLUG = /^[a-z0-9][a-z0-9-]{0,120}$/;
  const EMBED_HOSTS = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com)\//;

  if (window.DOMPurify) {
    DOMPurify.addHook('uponSanitizeElement', (node, data) => {
      if (data.tagName === 'iframe' && !EMBED_HOSTS.test(node.getAttribute('src') || '')) node.remove();
    });
    DOMPurify.addHook('afterSanitizeAttributes', node => {
      if (node.tagName === 'A' && /^https?:/.test(node.getAttribute('href') || '')) {
        node.setAttribute('target', '_blank'); node.setAttribute('rel', 'noopener');
      }
      if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
    });
  }

  const Blog = {
    SLUG,
    async list() {
      try {
        const r = await fetch('posts/index.json', { cache: 'no-cache' });
        if (!r.ok) return [];
        const data = await r.json();
        return Array.isArray(data) ? data.filter(p => p && SLUG.test(p.slug)).sort((a, b) => (b.date || '').localeCompare(a.date || '')) : [];
      } catch (e) { return []; }
    },
    async get(slug) {
      if (!SLUG.test(slug)) return null;
      try {
        const r = await fetch(`posts/${slug}.json`, { cache: 'no-cache' });
        return r.ok ? await r.json() : null;
      } catch (e) { return null; }
    },
    clean(html) {
      if (!window.DOMPurify) return '';
      return DOMPurify.sanitize(html || '', {
        ADD_TAGS: ['iframe', 'video', 'source'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'controls', 'playsinline', 'preload', 'poster', 'target'],
        FORBID_ATTR: ['style']
      });
    },
    esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
    date(iso, long) {
      if (!iso) return '';
      const d = new Date(iso);
      return isNaN(d) ? '' : d.toLocaleDateString([], long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
    },
    typeLabel(t) { return t === 'update' ? 'Update' : 'Blog'; },
    safeMedia(src) { return /^(media\/|https:\/\/)/.test(src || '') ? src : ''; },

    // Turn collages inside `root` into clickable grids that open a lightbox.
    enhance(root) {
      root.querySelectorAll('.post-collage').forEach(col => {
        if (col.dataset.ready) return;
        col.dataset.ready = '1';
        const items = [...col.children].filter(el => /^(IMG|VIDEO)$/.test(el.tagName));
        col.dataset.count = items.length;
        items.forEach((el, i) => {
          const tile = document.createElement('button');
          tile.type = 'button';
          tile.className = 'collage-tile';
          tile.setAttribute('aria-label', `Open ${el.tagName === 'VIDEO' ? 'video' : 'photo'} ${i + 1} of ${items.length}`);
          el.replaceWith(tile);
          if (el.tagName === 'VIDEO') {
            el.removeAttribute('controls'); el.muted = true; el.setAttribute('preload', 'metadata');
            tile.append(el);
            tile.insertAdjacentHTML('beforeend', '<span class="play" aria-hidden="true">▶</span>');
          } else tile.append(el);
          tile.addEventListener('click', () => Blog.lightbox(items.map(x => ({ type: x.tagName === 'VIDEO' ? 'video' : 'img', src: x.getAttribute('src'), alt: x.getAttribute('alt') || '' })), i));
        });
      });
    },

    lightbox(items, start) {
      let i = start;
      const box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Media viewer');
      box.innerHTML = `<div class="lb-top"><span class="lb-count"></span><button class="lb-close" aria-label="Close">×</button></div>
        <div class="lb-stage"></div><div></div>
        ${items.length > 1 ? '<button class="lb-prev" aria-label="Previous">‹</button><button class="lb-next" aria-label="Next">›</button>' : ''}`;
      const stage = box.querySelector('.lb-stage');
      const show = () => {
        const it = items[i];
        stage.innerHTML = '';
        const el = document.createElement(it.type === 'video' ? 'video' : 'img');
        el.src = it.src;
        if (it.type === 'video') { el.controls = true; el.autoplay = true; el.playsInline = true; } else el.alt = it.alt;
        stage.append(el);
        box.querySelector('.lb-count').textContent = `${i + 1} / ${items.length}`;
      };
      const go = d => { i = (i + d + items.length) % items.length; show(); };
      const close = () => { box.remove(); document.removeEventListener('keydown', key); document.body.style.overflow = ''; };
      const key = e => {
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowRight') go(1);
        else if (e.key === 'ArrowLeft') go(-1);
      };
      box.querySelector('.lb-close').addEventListener('click', close);
      box.querySelector('.lb-prev') && box.querySelector('.lb-prev').addEventListener('click', () => go(-1));
      box.querySelector('.lb-next') && box.querySelector('.lb-next').addEventListener('click', () => go(1));
      stage.addEventListener('click', e => { if (e.target === stage) close(); });
      let sx = null;
      box.addEventListener('pointerdown', e => { sx = e.clientX; });
      box.addEventListener('pointerup', e => { if (sx !== null && Math.abs(e.clientX - sx) > 50 && items.length > 1) go(e.clientX < sx ? 1 : -1); sx = null; });
      document.addEventListener('keydown', key);
      document.body.style.overflow = 'hidden';
      document.body.append(box);
      show();
      box.querySelector('.lb-close').focus();
    }
  };
  window.Blog = Blog;
})();
