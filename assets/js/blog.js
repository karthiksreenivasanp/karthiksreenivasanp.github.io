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
    safeMedia(src) { return /^(media\/|https:\/\/)/.test(src || '') ? src : ''; }
  };
  window.Blog = Blog;
})();
