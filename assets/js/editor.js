/* kspace. — blog editor. Publishes posts as files in the GitHub repo (no database). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const MAX_IMAGE = 10 * 1024 * 1024;
  const MAX_VIDEO = 50 * 1024 * 1024;
  const AUTH_KEY = 'ks-gh';
  const DRAFT_KEY = 'ks-draft-new';

  /* ---------------- GitHub API ---------------- */
  const GH = {
    token: '', owner: '', repo: '', branch: 'main',
    async req(path, opts = {}) {
      const headers = {
        Authorization: 'Bearer ' + this.token,
        Accept: opts.accept || 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };
      if (opts.body) headers['Content-Type'] = 'application/json';
      const r = await fetch('https://api.github.com' + path, {
        method: opts.method || 'GET', headers, cache: 'no-store',
        body: opts.body ? JSON.stringify(opts.body) : undefined
      });
      if (!r.ok) {
        let msg = r.statusText;
        try { msg = (await r.json()).message || msg; } catch (e) {}
        const err = new Error(msg); err.status = r.status; throw err;
      }
      if (opts.raw) return r.text();
      return r.status === 204 ? null : r.json();
    },
    repoPath(p) { return `/repos/${this.owner}/${this.repo}${p}`; },
    async readText(path) {
      try {
        return await this.req(this.repoPath(`/contents/${path}?ref=${encodeURIComponent(this.branch)}`), { accept: 'application/vnd.github.raw+json', raw: true });
      } catch (e) { if (e.status === 404) return null; throw e; }
    },
    async listDir(path) {
      try {
        const r = await this.req(this.repoPath(`/contents/${path}?ref=${encodeURIComponent(this.branch)}`));
        return Array.isArray(r) ? r.filter(f => f.type === 'file').map(f => f.path) : [];
      } catch (e) { if (e.status === 404) return []; throw e; }
    },
    // One commit for everything: files = [{path, content, encoding: 'utf-8'|'base64'}], deletes = [path]
    async commit(files, deletes, message, onStep) {
      for (let attempt = 0; attempt < 2; attempt++) {
        const ref = await this.req(this.repoPath(`/git/ref/heads/${encodeURIComponent(this.branch)}`));
        const parent = ref.object.sha;
        const parentCommit = await this.req(this.repoPath(`/git/commits/${parent}`));
        const tree = [];
        let n = 0;
        for (const f of files) {
          onStep && onStep(`Uploading ${++n}/${files.length}`);
          const blob = await this.req(this.repoPath('/git/blobs'), { method: 'POST', body: { content: f.content, encoding: f.encoding } });
          tree.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
        }
        deletes.forEach(p => tree.push({ path: p, mode: '100644', type: 'blob', sha: null }));
        onStep && onStep('Saving');
        const newTree = await this.req(this.repoPath('/git/trees'), { method: 'POST', body: { base_tree: parentCommit.tree.sha, tree } });
        const c = await this.req(this.repoPath('/git/commits'), { method: 'POST', body: { message, tree: newTree.sha, parents: [parent] } });
        try {
          await this.req(this.repoPath(`/git/refs/heads/${encodeURIComponent(this.branch)}`), { method: 'PATCH', body: { sha: c.sha } });
          return c.sha;
        } catch (e) {
          if (e.status !== 422 || attempt === 1) throw e; // branch moved; rebuild on the new tip
        }
      }
    }
  };

  /* ---------------- Helpers ---------------- */
  const esc = s => Blog.esc(s);
  const readAsDataURL = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  const b64 = async blob => (await readAsDataURL(blob)).split(',')[1];
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  const slugify = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'post';
  const extFor = type => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/ogg': 'ogv' }[type] || 'bin');
  const lsGet = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
  const lsSet = (s, k, v) => { try { s.setItem(k, v); return true; } catch (e) { return false; } };
  const lsDel = (s, k) => { try { s.removeItem(k); } catch (e) {} };

  // Shrink big photos so the repo stays small (keeps GIF/SVG as they are).
  async function prepareImage(file) {
    if (file.size > MAX_IMAGE) throw new Error(`${file.name} is ${mb(file.size)}. Photos must be under 10 MB.`);
    if (/gif|svg/.test(file.type)) return readAsDataURL(file);
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { return readAsDataURL(file); }
    const max = 2000;
    if (file.size < 500 * 1024 && bmp.width <= max && bmp.height <= max) return readAsDataURL(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    let out = await new Promise(r => c.toBlob(r, 'image/webp', 0.85));
    if (!out || out.type !== 'image/webp') out = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.85));
    return readAsDataURL(out.size < file.size ? out : file);
  }

  function embedUrl(input) {
    let u; try { u = new URL(input.trim()); } catch (e) { return null; }
    const h = u.hostname.replace(/^www\.|^m\./, '');
    let id;
    if (h === 'youtu.be') id = u.pathname.slice(1);
    else if (h === 'youtube.com' || h === 'youtube-nocookie.com') id = u.searchParams.get('v') || (u.pathname.match(/\/(embed|shorts|live)\/([\w-]+)/) || [])[2];
    if (id && /^[\w-]{6,}$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
    if (h === 'vimeo.com') { const v = u.pathname.match(/^\/(\d+)/); if (v) return `https://player.vimeo.com/video/${v[1]}`; }
    if (h === 'player.vimeo.com') return u.href;
    return null;
  }

  /* ---------------- Sheet (Mac-style modal) ---------------- */
  function sheet({ title, body = '', actions = [{ label: 'OK', value: true, primary: true }], wide, onOpen }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'sheet-wrap';
      wrap.innerHTML = `<div class="sheet glass ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h3>${esc(title)}</h3><div class="sheet-body">${body}</div>
        <div class="actions">${actions.map((a, i) => `<button class="btn small ${a.primary ? 'primary' : ''} ${a.danger ? 'danger' : ''}" data-i="${i}" type="button">${esc(a.label)}</button>`).join('')}</div></div>`;
      const done = v => { wrap.remove(); document.removeEventListener('keydown', key); resolve(v); };
      const key = e => { if (e.key === 'Escape') done(null); };
      wrap.addEventListener('click', e => { if (e.target === wrap) done(null); });
      wrap.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => done(actions[b.dataset.i].value)));
      document.addEventListener('keydown', key);
      document.body.appendChild(wrap);
      if (onOpen) onOpen(wrap, done);
      const f = wrap.querySelector('input, .btn.primary, .btn'); f && f.focus();
    });
  }

  /* ---------------- Quill setup ---------------- */
  const BlockEmbed = Quill.import('blots/block/embed');
  class VideoFile extends BlockEmbed {
    static create(src) {
      const n = super.create();
      n.setAttribute('src', src); n.setAttribute('controls', ''); n.setAttribute('playsinline', ''); n.setAttribute('preload', 'metadata');
      return n;
    }
    static value(n) { return n.getAttribute('src'); }
  }
  VideoFile.blotName = 'videofile'; VideoFile.tagName = 'video'; VideoFile.className = 'post-video';
  Quill.register(VideoFile);
  // Quill's default exports YouTube embeds as plain links; keep the player instead.
  const QuillVideo = Quill.import('formats/video');
  class EmbedVideo extends QuillVideo { html() { return this.domNode.outerHTML; } }
  Quill.register(EmbedVideo, true);
  const Delta = Quill.import('delta');

  const localVideos = new Map(); // blob: URL -> File (uploaded on publish)

  let quill;
  function setupQuill() {
    quill = new Quill('#editor', {
      theme: 'snow',
      placeholder: 'Write your post… Add photos and videos from the toolbar, or drop them here.',
      modules: {
        toolbar: { container: '#toolbar', handlers: { image: pickImages, video: addVideo } },
        uploader: {
          mimetypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime'],
          handler: (range, files) => insertFiles(files, range ? range.index : quill.getLength())
        },
        clipboard: {}
      }
    });
    quill.clipboard.addMatcher('VIDEO', node => new Delta().insert({ videofile: node.getAttribute('src') || '' }));
    quill.on('text-change', () => { markDirty(); updateWords(); });
  }

  async function insertFiles(files, index) {
    for (const file of files) {
      try {
        if (file.type.startsWith('video/')) {
          if (file.size > MAX_VIDEO) throw new Error(`${file.name} is ${mb(file.size)}. Videos must be under 50 MB. Upload bigger ones to YouTube and paste the link.`);
          const url = URL.createObjectURL(file);
          localVideos.set(url, file);
          quill.insertEmbed(index, 'videofile', url, 'user');
        } else if (file.type.startsWith('image/')) {
          quill.insertEmbed(index, 'image', await prepareImage(file), 'user');
        } else continue;
        index += 1;
        quill.insertText(index, '\n', 'user'); index += 1;
        quill.setSelection(index, 0, 'silent');
      } catch (e) { KS.toast(esc(e.message), 5000); }
    }
  }

  function pickImages() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = () => insertFiles([...inp.files], (quill.getSelection(true) || { index: quill.getLength() }).index);
    inp.click();
  }

  function addVideo() {
    const range = quill.getSelection(true) || { index: quill.getLength() };
    sheet({
      title: 'Add a video',
      body: `<p>Upload a video file (under 50 MB), or paste a YouTube or Vimeo link.</p>
        <div style="display:grid;gap:12px;margin-top:12px">
          <button class="btn" type="button" id="vid-upload">Choose a video file…</button>
          <div class="or">or</div>
          <input type="url" id="vid-url" placeholder="https://youtube.com/watch?v=…">
          <div class="err" id="vid-err"></div>
        </div>`,
      actions: [{ label: 'Cancel', value: null }, { label: 'Insert link', value: 'link', primary: true }],
      onOpen(wrap, done) {
        wrap.querySelector('#vid-upload').addEventListener('click', () => {
          const inp = document.createElement('input');
          inp.type = 'file'; inp.accept = 'video/*';
          inp.onchange = () => { done(null); insertFiles([...inp.files], range.index); };
          inp.click();
        });
        const btn = wrap.querySelector('[data-i="1"]');
        btn.addEventListener('click', e => {
          const url = embedUrl(wrap.querySelector('#vid-url').value);
          if (!url) { e.stopImmediatePropagation(); wrap.querySelector('#vid-err').textContent = 'That doesn\'t look like a YouTube or Vimeo link.'; return; }
          quill.insertEmbed(range.index, 'video', url, 'user');
          quill.setSelection(range.index + 1, 0);
        }, { capture: true });
      }
    });
  }

  /* ---------------- State ---------------- */
  const state = { posts: [], current: null, type: 'blog', cover: '', dirty: false, busy: false };

  function markDirty() {
    if (state.loading) return;
    state.dirty = true;
    $('draft-state').textContent = 'Unsaved changes';
    clearTimeout(markDirty.t);
    markDirty.t = setTimeout(saveDraft, 1500);
  }
  function updateWords() {
    const n = quill.getText().trim().split(/\s+/).filter(Boolean).length;
    $('words').textContent = `${n} word${n === 1 ? '' : 's'}`;
  }
  function saveDraft() {
    if (state.current) return; // drafts are kept for new posts only
    const html = quill.root.innerHTML;
    const ok = lsSet(localStorage, DRAFT_KEY, JSON.stringify({ title: $('title').value, type: state.type, html, cover: state.cover }));
    $('draft-state').textContent = ok ? 'Draft saved on this device' : 'Unsaved changes (too big to keep a local draft)';
  }

  function setType(t) {
    state.type = t === 'update' ? 'update' : 'blog';
    document.querySelectorAll('[data-type]').forEach(b => b.setAttribute('aria-pressed', b.dataset.type === state.type));
  }
  function setCover(src) {
    state.cover = src || '';
    $('cover-img').hidden = !state.cover;
    if (state.cover) $('cover-img').src = state.cover;
    $('cover-btn').textContent = state.cover ? 'Change cover' : 'Add cover image';
    $('cover-remove').hidden = !state.cover;
  }

  function loadIntoEditor(post) {
    state.loading = true;
    state.current = post ? post.slug : null;
    $('title').value = post ? post.title : '';
    setType(post ? post.type : 'blog');
    setCover(post ? post.cover : '');
    quill.setContents(post ? quill.clipboard.convert({ html: post.html || '' }) : [], 'silent');
    quill.history.clear();
    state.loading = false;
    state.dirty = false;
    updateWords();
    $('draft-state').textContent = post ? `Published ${Blog.date(post.date)}` : '';
    $('state-chip').textContent = post ? 'Editing' : 'New post';
    $('publish-btn').textContent = post ? 'Update' : 'Publish';
    $('delete-btn').hidden = !post;
    $('win-title').textContent = post ? post.title : 'New post';
    $('doc-scroll').scrollTop = 0;
    renderList();
  }

  function renderList() {
    const list = $('ws-list');
    list.innerHTML = state.posts.length ? state.posts.map(p =>
      `<button class="ws-item" type="button" data-slug="${esc(p.slug)}" aria-current="${p.slug === state.current}">
        <b>${esc(p.title)}</b><small>${Blog.typeLabel(p.type)} · ${Blog.date(p.date)}</small></button>`).join('')
      : `<p style="padding:16px;color:var(--muted);font-size:13px">No posts yet. Your first one will show here.</p>`;
    list.querySelectorAll('[data-slug]').forEach(b => b.addEventListener('click', () => openPost(b.dataset.slug)));
  }

  async function confirmDiscard() {
    if (!state.dirty || !state.current) return true;
    return !!(await sheet({ title: 'Discard changes?', body: '<p>Your edits to this post haven\'t been published.</p>', actions: [{ label: 'Keep editing', value: false }, { label: 'Discard', value: true, danger: true }] }));
  }

  async function openPost(slug) {
    $('ws').classList.remove('side-open');
    if (slug === state.current || !(await confirmDiscard())) return;
    $('draft-state').textContent = 'Loading…';
    try {
      const txt = await GH.readText(`posts/${slug}.json`);
      if (!txt) throw new Error('Post file not found in the repo.');
      loadIntoEditor(JSON.parse(txt));
    } catch (e) { KS.toast('Couldn\'t open that post: ' + esc(e.message), 5000); $('draft-state').textContent = ''; }
  }

  async function newPost() {
    $('ws').classList.remove('side-open');
    if (!(await confirmDiscard())) return;
    loadIntoEditor(null);
    const d = lsGet(localStorage, DRAFT_KEY);
    if (d) {
      try {
        const draft = JSON.parse(d);
        if (draft.title || (draft.html && draft.html !== '<p><br></p>')) {
          state.loading = true;
          $('title').value = draft.title || '';
          setType(draft.type); setCover(draft.cover);
          quill.setContents(quill.clipboard.convert({ html: draft.html || '' }), 'silent');
          state.loading = false;
          updateWords();
          $('draft-state').textContent = 'Restored your unsaved draft';
        }
      } catch (e) {}
    }
  }

  async function refreshPosts() {
    const txt = await GH.readText('posts/index.json');
    let list = [];
    try { list = txt ? JSON.parse(txt) : []; } catch (e) { list = []; }
    state.posts = (Array.isArray(list) ? list : []).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    renderList();
    return state.posts;
  }

  /* ---------------- Publish ---------------- */
  function setBusy(on, label) {
    state.busy = on;
    ['publish-btn', 'delete-btn', 'new-btn', 'preview-btn'].forEach(id => { $(id).disabled = on; });
    if (label) $('publish-btn').textContent = label;
  }

  async function publish() {
    const title = $('title').value.trim();
    if (!title) { KS.toast('Give your post a title first.'); $('title').focus(); return; }
    if (quill.getText().trim().length === 0 && !quill.root.querySelector('img, video, iframe')) { KS.toast('Write something before publishing.'); return; }

    const editing = state.current;
    const originalLabel = editing ? 'Update' : 'Publish';
    setBusy(true, 'Preparing…');
    try {
      const posts = await refreshPosts();
      const existing = editing ? posts.find(p => p.slug === editing) : null;
      let slug = editing;
      if (!slug) {
        const base = new Date().toISOString().slice(0, 10) + '-' + slugify(title);
        slug = base; let i = 2;
        while (posts.some(p => p.slug === slug)) slug = `${base}-${i++}`;
      }

      // Swap local photos/videos for files in media/<slug>/
      const files = [];
      const doc = document.createElement('div');
      doc.innerHTML = quill.getSemanticHTML().replace(/&nbsp;/g, ' ');
      const stamp = Date.now().toString(36);
      let n = 0;
      const upload = async (src, kind) => {
        let blob;
        if (src.startsWith('blob:') && localVideos.has(src)) blob = localVideos.get(src);
        else blob = await (await fetch(src)).blob();
        if (blob.size > (kind === 'video' ? MAX_VIDEO : MAX_IMAGE)) throw new Error(`A ${kind} is ${mb(blob.size)}, over the limit.`);
        const path = `media/${slug}/${stamp}-${++n}.${extFor(blob.type)}`;
        files.push({ path, content: await b64(blob), encoding: 'base64' });
        return path;
      };
      for (const el of doc.querySelectorAll('img[src^="data:"], img[src^="blob:"]')) el.setAttribute('src', await upload(el.getAttribute('src'), 'photo'));
      for (const el of doc.querySelectorAll('video[src^="blob:"], video[src^="data:"]')) el.setAttribute('src', await upload(el.getAttribute('src'), 'video'));
      doc.querySelectorAll('video').forEach(v => { v.setAttribute('controls', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'metadata'); });

      let cover = state.cover;
      if (cover && /^(data:|blob:)/.test(cover)) cover = await upload(cover, 'photo');
      const firstImg = doc.querySelector('img');
      const thumb = cover || (firstImg ? firstImg.getAttribute('src') : '');

      const html = doc.innerHTML;
      const now = new Date().toISOString();
      const date = existing ? existing.date : now;
      const textDoc = doc.cloneNode(true);
      textDoc.querySelectorAll('p, h1, h2, h3, li, blockquote, pre').forEach(el => el.append(' '));
      const summary = (textDoc.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 180);
      const post = { slug, title, type: state.type, date, updated: now, cover, html };
      const entry = { slug, title, type: state.type, date, updated: now, cover: thumb, summary };
      const index = [entry, ...posts.filter(p => p.slug !== slug)].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

      files.push({ path: `posts/${slug}.json`, content: JSON.stringify(post, null, 2), encoding: 'utf-8' });
      files.push({ path: 'posts/index.json', content: JSON.stringify(index, null, 2), encoding: 'utf-8' });

      // Remove media this post no longer uses
      const used = new Set([...doc.querySelectorAll('[src]')].map(e => e.getAttribute('src')).concat(cover, thumb));
      const deletes = editing ? (await GH.listDir(`media/${slug}`)).filter(p => !used.has(p)) : [];

      await GH.commit(files, deletes, `${editing ? 'Update' : 'Publish'} post: ${title}`, s => setBusy(true, s + '…'));

      localVideos.clear();
      if (!editing) lsDel(localStorage, DRAFT_KEY);
      state.posts = index;
      loadIntoEditor(post);
      KS.toast(`${editing ? 'Updated' : 'Published'}. It'll be live in about a minute. <a href="blog.html#/${slug}" target="_blank" rel="noopener">View post</a>`, 7000);
    } catch (e) {
      KS.toast(esc(friendly(e)), 7000);
    } finally {
      setBusy(false, state.current ? 'Update' : originalLabel);
    }
  }

  async function removePost() {
    const slug = state.current;
    if (!slug) return;
    const ok = await sheet({
      title: 'Delete this post?',
      body: `<p>“${esc($('title').value)}” and its photos and videos will be removed from your site. Git history keeps a copy if you need it back.</p>`,
      actions: [{ label: 'Cancel', value: false }, { label: 'Delete', value: true, danger: true, primary: false }]
    });
    if (!ok) return;
    setBusy(true, 'Deleting…');
    try {
      const posts = await refreshPosts();
      const index = posts.filter(p => p.slug !== slug);
      const media = await GH.listDir(`media/${slug}`);
      await GH.commit([{ path: 'posts/index.json', content: JSON.stringify(index, null, 2), encoding: 'utf-8' }],
        [`posts/${slug}.json`, ...media], `Delete post: ${slug}`);
      state.posts = index;
      state.dirty = false;
      loadIntoEditor(null);
      KS.toast('Post deleted.');
    } catch (e) { KS.toast(esc(friendly(e)), 7000); }
    finally { setBusy(false, state.current ? 'Update' : 'Publish'); }
  }

  function preview() {
    const cover = state.cover;
    sheet({
      title: 'Preview', wide: true,
      body: `<div style="padding:6px 4px">
        ${cover ? `<img src="${esc(cover)}" alt="" style="width:100%;max-height:300px;object-fit:cover;border-radius:12px;margin-bottom:18px">` : ''}
        <span class="chip">${Blog.typeLabel(state.type)}</span>
        <h1 style="font-size:2rem;font-weight:800;line-height:1.15;margin:10px 0 20px">${esc($('title').value || 'Untitled')}</h1>
        <div class="post-content">${quill.getSemanticHTML().replace(/&nbsp;/g, ' ')}</div></div>`,
      actions: [{ label: 'Close', value: true, primary: true }]
    });
  }

  function friendly(e) {
    if (e.status === 401) return 'GitHub rejected the token. It may have expired. Sign out and sign in with a new one.';
    if (e.status === 403) return 'This token can\'t write to the repo. Give it Contents: Read and write.';
    if (e.status === 404) return 'Repository or branch not found. Check the repo name and branch.';
    if (e.status === 413 || /too large/i.test(e.message)) return 'That upload is too large for GitHub. Use a smaller file.';
    if (e instanceof TypeError) return 'Network error. Check your connection and try again.';
    return 'Something went wrong: ' + e.message;
  }

  /* ---------------- Auth ---------------- */
  function savedAuth() {
    const raw = lsGet(localStorage, AUTH_KEY) || lsGet(sessionStorage, AUTH_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  async function signIn(auth, remember) {
    const [owner, repo] = auth.repo.split('/').map(s => (s || '').trim());
    if (!owner || !repo) throw Object.assign(new Error('Repository must look like owner/repo.'), { local: true });
    Object.assign(GH, { token: auth.token.trim(), owner, repo, branch: auth.branch.trim() || 'main' });
    const info = await GH.req(`/repos/${owner}/${repo}`);
    if (!info.permissions || !info.permissions.push) throw Object.assign(new Error('This token can read the repo but can\'t write to it. Give it Contents: Read and write.'), { local: true });
    await GH.req(GH.repoPath(`/git/ref/heads/${encodeURIComponent(GH.branch)}`));
    lsDel(localStorage, AUTH_KEY); lsDel(sessionStorage, AUTH_KEY);
    lsSet(remember ? localStorage : sessionStorage, AUTH_KEY, JSON.stringify(auth));
    $('who').textContent = `${owner}/${repo} · ${GH.branch}`;
    $('signin').hidden = true;
    $('ws').hidden = false;
    await refreshPosts();
    await newPost();
  }

  function signOut() {
    lsDel(localStorage, AUTH_KEY); lsDel(sessionStorage, AUTH_KEY);
    GH.token = '';
    $('tok').value = '';
    $('ws').hidden = true;
    $('signin').hidden = false;
    $('win-title').textContent = 'Editor';
  }

  /* ---------------- Wire up ---------------- */
  function boot() {
    setupQuill();
    $('signin').addEventListener('submit', async e => {
      e.preventDefault();
      $('signin-err').textContent = '';
      $('signin-btn').disabled = true; $('signin-btn').textContent = 'Checking…';
      try {
        await signIn({ token: $('tok').value, repo: $('repo').value, branch: $('branch').value }, $('remember').checked);
      } catch (err) {
        $('signin-err').textContent = err.local ? err.message : friendly(err);
      } finally { $('signin-btn').disabled = false; $('signin-btn').textContent = 'Sign in'; }
    });
    $('signout').addEventListener('click', signOut);
    $('new-btn').addEventListener('click', newPost);
    $('publish-btn').addEventListener('click', publish);
    $('delete-btn').addEventListener('click', removePost);
    $('preview-btn').addEventListener('click', preview);
    $('posts-toggle').addEventListener('click', () => $('ws').classList.toggle('side-open'));
    $('title').addEventListener('input', markDirty);
    $('title').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); quill.focus(); } });
    document.querySelectorAll('[data-type]').forEach(b => b.addEventListener('click', () => { setType(b.dataset.type); markDirty(); }));
    $('cover-btn').addEventListener('click', () => $('cover-file').click());
    $('cover-file').addEventListener('change', async () => {
      const f = $('cover-file').files[0]; $('cover-file').value = '';
      if (!f) return;
      try { setCover(await prepareImage(f)); markDirty(); } catch (e) { KS.toast(esc(e.message), 5000); }
    });
    $('cover-remove').addEventListener('click', () => { setCover(''); markDirty(); });
    document.addEventListener('keydown', e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !$('ws').hidden) { e.preventDefault(); if (!state.busy) publish(); }
    });
    addEventListener('beforeunload', e => { if (state.dirty && state.current) { e.preventDefault(); e.returnValue = ''; } });

    const auth = savedAuth();
    if (auth) {
      $('repo').value = auth.repo; $('branch').value = auth.branch; $('tok').value = auth.token;
      signIn(auth, !!lsGet(localStorage, AUTH_KEY)).catch(err => { $('signin-err').textContent = err.local ? err.message : friendly(err); });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
